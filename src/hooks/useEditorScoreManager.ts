import _ from 'lodash'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { editorSortingOrder } from '../config/config'
import type { EditorScore, EditorSystemData, Score, Staffs } from '../models/types'
import { debug } from '../utils/debugger'
import { defaultObject } from '../utils/objectUtils'

export function useEditorScoreManager(score: Score) {
    const [processing, setProcessing] = useState<boolean>(false)
    const [editorScore, setEditorScore] = useState<EditorScore>(defaultObject('EditorScore'))
    const [labels, setLabels] = useState<Record<string, EditorSystemData>>({})
    const [parts, setParts] = useState<Record<string, string[]>>({})

    useEffect(() => {
        // Convert new score to data record structure
        setProcessing(true)
        const newScore: EditorScore = defaultObject('EditorScore')
        var currentPart: string = ''
        score.systems.forEach((system, sysIdx) => {
            // Update part information
            if (system.part) currentPart = system.part
            if (currentPart != '') {
                if (!(currentPart in newScore.parts)) newScore.parts[currentPart] = []
                newScore.parts[currentPart].push(system.uuid)
            }

            const positions = Object.keys(system.sections[0].staves).toSorted(
                (a, b) => editorSortingOrder.indexOf(a) - editorSortingOrder.indexOf(b)
            )
            const colWidths = system.sections.map((section) =>
                Math.max(...Object.values(section.staves).map((measure) => measure.notation.length))
            )
            const staffs: Staffs = Object.fromEntries(
                positions.map((position) => [position, system.sections.map((section) => section.staves[position])])
            )
            const systemData: EditorSystemData = {
                index: sysIdx,
                id: sysIdx + 1,
                uuid: system.uuid,
                part: currentPart,
                positions: positions,
                grouped: [],
                staffs: staffs,
                colWidths: colWidths
            }
            newScore.systems.push(systemData)
        })
        setEditorScore(newScore)
        setProcessing(false)
    }, [score])

    function updateSystem(sysData: EditorSystemData) {
        const sysIdx = sysData.index
        const newScore: EditorScore = { ...editorScore }
        const systems = editorScore.systems
        newScore.systems = [...systems.slice(0, sysIdx), sysData, ...systems.slice(sysIdx + 1)]
        setEditorScore(newScore)
    }

    function updatePointers(newSystemData: EditorSystemData[]) {
        // Update fields that depend on pointers to another system
        newSystemData.map((systemData) => {
            if (systemData.copyfromkey) {
                const source = newSystemData.find((sysData) => sysData.uuid == systemData.copyfromkey)
                if (source && source.uuid != systemData.uuid)
                    systemData.copyfrom = source.label ? source.label : `#${source.id}`
                else {
                    systemData.copyfrom = undefined
                    systemData.copyfromkey = undefined
                }
            } else systemData.copyfrom = undefined
            if (systemData.gotokey) {
                const destination = newSystemData.find((sysData) => sysData.uuid == systemData.gotokey)
                if (destination) {
                    debug(`found goto destination ${destination.uuid}`)
                    {
                        systemData.goto = destination.label ? destination.label : `#${destination.id}`
                    }
                } else {
                    systemData.goto = undefined
                    systemData.gotokey = undefined
                }
            } else systemData.goto = undefined
        })
    }

    // Handles user actions triggered with buttons in the panel header
    function executeItemAction(fieldname: string, systemData: EditorSystemData, value?: string) {
        debug(`processing ${fieldname}`)
        // Used for insertion and update
        var newSystemData: EditorSystemData | null = _.cloneDeep(systemData)
        // Reset the edit buffers of the measures.
        Object.values(newSystemData.staffs).forEach((measures) => {
            measures.forEach((measure) => {
                measure.notation_ = undefined
            })
        })
        // Determines where to insert the new system data item. Default is set to replace current.
        var sliceIndex1: number = systemData.index
        var sliceIndex2: number = systemData.index + 1
        switch (fieldname) {
            case 'part':
                // Modify the `part` field of the system
                if (typeof value == 'string') newSystemData.part = value
                break
            case 'label':
                if (typeof value == 'string') {
                    // New label: add it to the list
                    // First remove any existing label for the current system
                    // Also avoid duplication of the new label to be sure (should not be necessary).
                    var newLabels = _.omitBy(labels, (value) => value.uuid == systemData.uuid)
                    newLabels = _.omit(newLabels, value)
                    // Add the label
                    newSystemData.label = value
                    newLabels[value] = newSystemData
                    setLabels(newLabels)
                }
                break
            case 'new': {
                // Creates an empty system based on the measure settings of the current systemn.
                Object.values(newSystemData.staffs).forEach((measures) => {
                    // clear existing values
                    measures.forEach((measure) => {
                        measure.notation_ = undefined
                        measure.notation = []
                    })
                })
                newSystemData.part = ''
                newSystemData.label = undefined
                newSystemData.gotokey = undefined
                newSystemData.uuid = uuidv4()
                sliceIndex1 = systemData.index + 1 // Insert below current
                break
            }
            case 'copy': {
                const source = editorScore.systems.find((sys) => sys.uuid == value)
                debug(source)
                if (!source) {
                    console.error(`copy system: could not find system ${value}`)
                    return
                }
                newSystemData = _.cloneDeep(source)
                newSystemData.uuid = uuidv4()
                newSystemData.part = ''
                newSystemData.label = undefined
                newSystemData.copyfromkey = source.uuid
                // newSystemData.copyfrom = source.label || `#${source.index}`
                sliceIndex1 = systemData.index + 1 // Copy after the current system
                break
            }
            case 'goto':
                if (!value) {
                    newSystemData.gotokey = undefined
                } else {
                    const destination = editorScore.systems.find((sys) => sys.uuid == value)
                    if (!destination) {
                        console.error(`goto: could not find system ${value}`)
                        return
                    }
                    newSystemData.gotokey = destination.uuid
                }
                break
            case 'delete':
                if (newSystemData.label) {
                    newLabels = { ...labels }
                    delete labels[newSystemData.label]
                    setLabels(newLabels)
                }
                newSystemData = null
                break
            default:
                // Unrecognized action
                return
        }
        // Replace, remove or insert system
        const newData = newSystemData
            ? [...editorScore.systems.slice(0, sliceIndex1), newSystemData, ...editorScore.systems.slice(sliceIndex2)]
            : [...editorScore.systems.slice(0, sliceIndex1), ...editorScore.systems.slice(sliceIndex2)]
        // Update all system IDs
        newData.forEach((sysData, sysIdx) => {
            sysData.index = sysIdx
            sysData.id = sysIdx + 1
        })
        updatePointers(newData)
        setEditorScore({ ...editorScore, ...{ systems: newData } })
    }
    return { editorScore, labels, processing, updateSystem, setParts, executeItemAction }
}
