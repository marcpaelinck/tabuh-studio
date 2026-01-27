import _ from 'lodash'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { type DashboardFunctionsType } from '../components/tabuheditor/contexts'
import type { EditorScore, EditorSystem, ExecutionItem } from '../models/types'
import { debug } from '../utils/debugger'
import { toOrdinal } from '../utils/objectUtils'
import { cycleValidation } from './validationManager'

function toText(values: number[] | undefined, ordinal: boolean = false): string {
    if (values) {
        var list = values.map((val) => `${val}`)
        if (ordinal) list = values.map((val) => toOrdinal(val))
        if (list.length > 1) return list.slice(0, -1).join(', ') + ' & ' + _.last(list)
        else return list.join('') // also takes care of empty array
    } else return ''
}

export function executionItemTooltip(item: ExecutionItem, length: 'short' | 'long'): string {
    const nbrOfPasses = !item.passes ? 0 : item.passes.length
    // const maxPassNr = !item.passes ? 0 : Math.max(...item.passes)
    const sortedPasses = item.passes ? item.passes.sort() : []
    // Create components for the values to return.
    var instruction: string = ''
    var passcondition: string = ''
    var shortTooltip: string = ''
    switch (item.type) {
        case 'goto': {
            shortTooltip = item.targetname
            instruction = `go to ${item.targetname}`
            passcondition = 'after'
            break
        }
        case 'loop': {
            shortTooltip = `${item.count}X`
            instruction = `play ${item.count}X`
            passcondition = 'on'
            break
        }
        case 'tempo':
        case 'dynamics': {
            const current = length == 'long' ? 'current ' : ''
            const itemtype = length == 'long' ? `${item.type} ` : ''
            if (item.type == 'tempo') {
                const isGradual = item.isGradual && item.fromBPM != item.toBPM
                shortTooltip = `${itemtype}${isGradual ? (!item.fromBPM ? `${current}→` : item.fromBPM + '→') : ''}${item.toBPM} BPM`
            } else {
                const isGradual = item.isGradual && item.fromDynamics != item.toDynamics
                shortTooltip = `${itemtype}${isGradual ? (!item.fromDynamics ? 'Current →' : item.fromDynamics + '→') : ''}${item.toDynamics}`
            }
            const multipleSections = item.isGradual && item.fromSection != item.toSection
            instruction =
                shortTooltip +
                ` beat ${multipleSections ? (!item.fromSection ? '1→' : item.fromSection + '→') : ''}${item.toSection}`
            passcondition = 'on'
            break
        }
    }
    if (length == 'short') return shortTooltip

    // Compose the long tooltip version
    switch (true) {
        case !nbrOfPasses:
            return instruction
        case nbrOfPasses && !item.each:
            return `${instruction} ${passcondition} ${nbrOfPasses > 1 ? 'passes' : 'pass'} ${toText(item.passes)}`
        case nbrOfPasses && item.each:
            return `${instruction} ${passcondition} every ${toText(sortedPasses, true)} ${nbrOfPasses > 1 ? 'passes' : 'pass'}`
        default:
            return `Invalid combination: missing one or more pass numbers.`
    }
}

function scoreToFormattedJson(score: EditorScore): string {
    const flatten = (key: string, value: any) => {
        if (/^([A-Z][A-Z\d_]+|execution)$/.test(key)) {
            const json = value.map((meas: any) => JSON.stringify(meas))
            return json
        }
        if (key == 'colWidths') {
            const json = JSON.stringify(value)
            return json
        }
        if (key == 'starttime') {
            return undefined
        }
        return value
    }
    const json = JSON.stringify(score, flatten, 2)
    return json
        .replace(/"([\{\[])/g, '$1')
        .replace(/([\}\]])"/g, '$1')
        .replace(/\\"/g, '"')
        .replace(/:(?! )/g, ': ')
        .replace(/([\]\}\d"]),"/g, '$1, "')
        .replace(/(true|false),(?![ \n\r])/g, '$1, ')
        .replace(/([\d]),(?=\d)/g, '$1, ')
}

function gotoItemTargetName(destination: EditorSystem) {
    return destination.label ? destination.label : `#${destination.id}`
}

export function useEditorScoreManager(dashboardFunctions: DashboardFunctionsType) {
    const [editorScore, setEditorScore] = useState<EditorScore | undefined>(undefined)
    const [labels, setLabels] = useState<Record<string, EditorSystem>>({})

    function updateScore(score: EditorScore) {
        // Convert new score to data record structure
        debug(`updating score with title ${score.title}`)
        setEditorScore(score)
        const labeldict = Object.fromEntries(
            score.systems.filter((sys) => sys.label != undefined).map((sys) => [sys.label, sys])
        )
        setLabels(labeldict)
    }

    useEffect(() => {
        // (Re-) number the system index and id values.
        // Should be performed at each render due to possible user actions (insert or delete system).
        if (!editorScore) return
        const executionitems: ExecutionItem[] = []
        editorScore.systems.forEach((systemData, sysIdx) => {
            systemData.index = sysIdx
            systemData.id = systemData.index + 1
            if (systemData.execution) executionitems.push(...systemData.execution)
        })
        // Update the goto display values.
        debug('updating flow items')
        executionitems.forEach((item) => {
            if (item.type == 'goto') {
                const target = editorScore.systems.find((sys) => sys.uuid == item.targetuuid)
                if (target) item.targetname = target.label || `# ${target.id}`
                else {
                    item.targetname = 'target unknown'
                    console.error(`system ${item} of goto directive not found.`)
                }
                item.tooltip = executionItemTooltip(item, 'long')
                item.tooltipshort = executionItemTooltip(item, 'short')
            }
            debug(`${item.tooltip} -- ${item.tooltipshort}`)
        })
    }, [editorScore])

    function getEditorScore() {
        return editorScore
    }

    function updateSystem(sysData: EditorSystem) {
        if (!editorScore) return
        const sysIdx = sysData.index
        const newScore: EditorScore = { ...editorScore }
        const systems = editorScore.systems
        newScore.systems = [...systems.slice(0, sysIdx), sysData, ...systems.slice(sysIdx + 1)]
        setEditorScore(newScore)
    }

    function updateParts(parts: Record<string, string[]>) {
        if (!editorScore) return
        const newScore: EditorScore = { ...editorScore }
        newScore.parts = { ...parts }
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
            if (systemData.execution) {
                systemData.execution
                    .filter((item) => item.type == 'goto')
                    .forEach((goto) => {
                        const destination = newSystemData.find((sysData) => sysData.uuid == goto.targetuuid)
                        if (destination) {
                            debug(`found goto destination ${destination.uuid}`)
                            {
                                goto.targetname = gotoItemTargetName(destination)
                                goto.tooltip = executionItemTooltip(goto, 'long')
                                goto.tooltipshort = executionItemTooltip(goto, 'short')
                            }
                        } else {
                            goto.targetname = 'Error: goto target not found.'
                            goto.tooltip = goto.targetname
                            goto.tooltipshort = 'Error'
                            console.error(`Error: goto target not found for ${systemData.uuid}.`)
                        }
                    })
            } else systemData.execution = undefined
        })
    }

    // Handles user actions triggered with buttons in the panel header
    function executeItemAction(fieldname: string, systemData: EditorSystem, value?: string) {
        if (!editorScore) return
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
                newSystemData.label = undefined
                newSystemData.execution = undefined
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
                newSystemData.label = undefined
                newSystemData.copyfromkey = source.uuid
                // newSystemData.copyfrom = source.label || `#${source.index}`
                sliceIndex1 = systemData.index + 1 // Copy after the current system
                break
            }
            case 'execution':
                // Changes to the system data have been performed by the FlowItemsForm
                const validation = cycleValidation(editorScore)
                if (!validation.isValid) dashboardFunctions.setDashboardWarning('cycle', validation.message, 'error')
                else dashboardFunctions.clearDashboardWarning('cycle')
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
        debug('UPDATING SCORE by editorscoremanager')
        updatePointers(newData)
        setEditorScore({ ...editorScore, ...{ systems: newData } })
    }
    return {
        editorScore,
        getEditorScore,
        updateScore,
        labels,
        updateSystem,
        updateParts,
        scoreToFormattedJson,
        executeItemAction
    }
}
