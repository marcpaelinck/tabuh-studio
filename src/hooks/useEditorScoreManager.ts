import _ from 'lodash'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { EditorScore, EditorSystem, GotoItem } from '../models/types'
import { debug } from '../utils/debugger'
import { defaultObject } from '../utils/objectUtils'

export function useEditorScoreManager(score: EditorScore) {
    const [editorScore, setEditorScore] = useState<EditorScore>(defaultObject('EditorScore'))
    const [labels, setLabels] = useState<Record<string, EditorSystem>>({})
    const [parts, setParts] = useState<Record<string, string[]>>({})

    useEffect(() => {
        // Convert new score to data record structure
        setEditorScore(score)
        //TODO WRITE NEW LAYOUT TO CONSOLE
        console.log(score)
    }, [score])

    useEffect(() => {
        // (Re-) number the system index and id values.
        // Should be performed at each render due to possible user actions (insert or delete system).
        const gotos: GotoItem[] = []
        editorScore.systems.forEach((systemData, sysIdx) => {
            systemData.index = sysIdx
            systemData.id = systemData.index + 1
            if (systemData.goto) gotos.push(...systemData.goto)
        })
        // Update the goto display values.
        gotos.forEach((goto) => {
            const target = editorScore.systems.find((sys) => sys.uuid == goto.targetuuid)
            if (target) goto.targetdisplay = target.label || `# ${target.id}`
            else {
                goto.targetdisplay = 'target unknown'
                console.error(`system ${goto} in goto instruction not found.`)
            }
        })
    }, [editorScore])

    function updateSystem(sysData: EditorSystem) {
        const sysIdx = sysData.index
        const newScore: EditorScore = { ...editorScore }
        const systems = editorScore.systems
        newScore.systems = [...systems.slice(0, sysIdx), sysData, ...systems.slice(sysIdx + 1)]
        setEditorScore(newScore)
    }

    function updatePointers(newSystemData: EditorSystem[]) {
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
            if (systemData.goto) {
                systemData.goto.forEach((goto) => {
                    const destination = newSystemData.find((sysData) => sysData.uuid == goto.targetuuid)
                    if (destination) {
                        debug(`found goto destination ${destination.uuid}`)
                        {
                            goto.targetdisplay = destination.label ? destination.label : `#${destination.id}`
                        }
                    } else {
                        goto.targetdisplay = 'Error: goto target not found.'
                        console.error(`Error: goto target not found for ${systemData.uuid}.`)
                    }
                })
            } else systemData.goto = undefined
        })
    }

    // Handles user actions triggered with buttons in the panel header
    function executeItemAction(fieldname: string, systemData: EditorSystem, value?: string) {
        debug(`processing ${fieldname}`)
        // Used for insertion and update
        var newSystemData: EditorSystem | null = _.cloneDeep(systemData)
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
                newSystemData.goto = undefined
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
                    newSystemData.goto = undefined
                } else {
                    const destination = editorScore.systems.find((sys) => sys.uuid == value)
                    if (!destination) {
                        console.error(`goto: could not find system ${value}`)
                        return
                    }
                    if (!newSystemData.goto) newSystemData.goto = []
                    // targetDisplay will be modified by the EditorScoreManager
                    newSystemData.goto.push({ targetuuid: destination.uuid, targetdisplay: '' })
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
        // Update, remove or insert system
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
    return { editorScore, labels, updateSystem, setParts, executeItemAction }
}
