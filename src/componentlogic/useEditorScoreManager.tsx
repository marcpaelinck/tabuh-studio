import _ from 'lodash'
import { useEffect, useState } from 'react'
import { useDialog } from 'rsuite'
import { v4 as uuidv4 } from 'uuid'
import { type DashboardFunctionsType } from '../components/contexts'
import type { EditorScore, EditorSystem, ExecutionItem } from '../typing/types'
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

function getSeqId(item: ExecutionItem) {
    const typeSeq = { loop: 1000, tempo: 2000, dynamics: 3000, wait: 4000, goto: 5000 }[item.type]
    const beatSeq = 100 * ('fromSection' in item ? item.fromSection || item.toSection : 0)
    const passesSeq = 10 * (_.min(item.passes) || 0)
    const iterSeq = 'iterations' in item ? _.min(item.iterations) || 0 : 0
    return typeSeq + beatSeq + passesSeq + iterSeq
}

// Formats a floating point value as int if the decimals are all 0
function fmtFloat(value: number): number {
    return value == Math.floor(value) ? Math.floor(value) : value
}

export function executionItemTooltip(item: ExecutionItem, length: 'short' | 'long'): string {
    const nbrOfPasses = !item.passes ? 0 : item.passes.length
    // const maxPassNr = !item.passes ? 0 : Math.max(...item.passes)
    const sortedPasses = item.passes ? item.passes.sort() : []
    const sortedIterations = 'iterations' in item && item.iterations ? item.iterations.sort() : []
    // Create components for the values to return.
    var instruction: string = ''
    var preposition: string = ''
    var shortTooltip: string = ''
    item.seqId = getSeqId(item)
    switch (item.type) {
        case 'goto': {
            shortTooltip = item.targetname
            instruction = `go to ${item.targetname}`
            preposition = 'after'
            break
        }
        case 'loop': {
            shortTooltip = `${item.count}X`
            instruction = `play ${item.count}X`
            preposition = 'on'
            break
        }
        case 'wait': {
            shortTooltip = `${item.seconds} sec.`
            instruction = `wait ${fmtFloat(item.seconds)} ${item.seconds > 1 ? 'seconds' : 'second'}`
            preposition = 'after'
            break
        }
        case 'tempo':
        case 'dynamics': {
            const current = length == 'long' ? 'current ' : ''
            const itemtype = length == 'long' ? `${item.type} ` : ''
            if (item.type == 'tempo') {
                const isGradual = item.isGradual && item.fromValue != item.toValue
                shortTooltip = `${itemtype}${isGradual ? (!item.fromValue ? `${current}→` : item.fromValue + '→') : ''}${item.toValue} BPM`
            } else {
                const isGradual = item.isGradual && item.fromDynamics != item.toDynamics
                shortTooltip = `${itemtype}${isGradual ? (!item.fromDynamics ? `${current}→` : item.fromDynamics + '→') : ''}${item.toDynamics}`
            }
            const multipleSections = item.isGradual && item.fromSection != item.toSection
            instruction =
                shortTooltip +
                ` beat ${multipleSections ? (!item.fromSection ? '1→' : item.fromSection + '→') : ''}${item.toSection}`
            preposition = 'on'
            break
        }
    }
    if (length == 'short') return shortTooltip

    var loopcondition = ''
    var andloopcondition = ''
    if (sortedIterations.length > 0) {
        const loopcond = `${toText(sortedIterations, true)} ${sortedIterations.length > 1 ? 'iterations' : 'iteration'}`
        loopcondition = ' ' + preposition + ' ' + loopcond
        andloopcondition = ', ' + loopcond
    }
    // Compose the long tooltip version
    switch (true) {
        case !nbrOfPasses:
            return `${instruction}${loopcondition}`
        case nbrOfPasses && !item.nthpass:
            return `${instruction} ${preposition} ${nbrOfPasses > 1 ? 'passes' : 'pass'} ${toText(item.passes)}${andloopcondition}`
        case nbrOfPasses && item.nthpass:
            return `${instruction} ${preposition} every ${toText(sortedPasses, true)} ${nbrOfPasses > 1 ? 'passes' : 'pass'}${andloopcondition}`
        default:
            return `Invalid combination: missing one or more pass numbers.`
    }
}

function scoreToFormattedJson(score: EditorScore, clearCache: boolean = true): string {
    const flatten = (key: string, value: any) => {
        if (/^([A-Z][A-Z\d_]+|execution)$/.test(key) && value) {
            const json = value.map((meas: any) => {
                return JSON.stringify(meas)
            })
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
    if (clearCache) {
        score.systems.forEach((sys) =>
            _.toPairs(sys.staffs).forEach(([_, measures]) => measures.forEach((measure) => delete measure.notation_))
        )
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
    const [indexedDb, setIndexedDb] = useState<IDBDatabase | undefined>(undefined)
    const dialog = useDialog()

    function updateScore(score: EditorScore) {
        debug(`updating score with title ${score.title}`)
        setEditorScore(score)
        const labeldict = Object.fromEntries(
            score.systems.filter((sys) => sys.label != undefined).map((sys) => [sys.label, sys])
        )
        setLabels(labeldict)
    }

    useEffect(() => {
        if (indexedDb) return
        // Create a temporary Indexed database in the browser that will always contain the
        // latest version of the score currently being edited. To be used for recovery purposes.
        // See https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
        const dbDeleteRequest: IDBOpenDBRequest = window.indexedDB.deleteDatabase('TabuhStudio')
        dbDeleteRequest.onsuccess = (event) => {
            const dbOpenRequest: IDBOpenDBRequest = window.indexedDB.open('TabuhStudio', 1)
            dbOpenRequest.onupgradeneeded = (event) => {
                // Save the IDBDatabase interface
                const db = dbOpenRequest.result
                // Create an objectStore for this database
                debug('Creating object store')
                db.createObjectStore('Score', { keyPath: 'uuid' })
            }
            dbOpenRequest.onsuccess = () => {
                const db = dbOpenRequest.result
                setIndexedDb(db)
                // TODO replace this alert with an icon in the Dashboard.
                dashboardFunctions.setDashboardElement('localCache', { visible: true, level: 'info' })
            }
            dbOpenRequest.onerror = () =>
                // TODO replace this alert with an icon in the Dashboard.
                dashboardFunctions.setDashboardElement('localCache', { visible: true, level: 'warning' })
        }
    }, [])

    useEffect(() => {
        // (Re-) number the system index and id values.
        // Re-create and order the execution list
        // Should be performed at each render due to possible user actions (insert or delete system).
        if (!editorScore) return
        const executionitems: ExecutionItem[] = []
        editorScore.systems.forEach((systemData, sysIdx) => {
            systemData.index = sysIdx
            systemData.id = systemData.index + 1
            if (systemData.execution) executionitems.push(...systemData.execution)
        })

        // Store the score object in the browser's IDB Database, for recovery purposes.
        if (indexedDb) {
            dashboardFunctions.setDashboardElement('localCache', { visible: true, level: 'info' })
            const transaction = indexedDb.transaction('Score', 'readwrite')
            const request = transaction.objectStore('Score').put(editorScore)
            var dateStr = new Date().toString().replace(/ GMT.*$/, '')
            request.onsuccess = () =>
                dashboardFunctions.setDashboardElement('localCache', {
                    visible: true,
                    level: 'info',
                    tooltip: `${dateStr}\nSaved to local cache`
                })
            request.onerror = () =>
                dashboardFunctions.setDashboardElement('localCache', {
                    visible: true,
                    level: 'warning',
                    tooltip: `${dateStr}\nCould not save the current status to local storage.`
                })
        } else dashboardFunctions.setDashboardElement('localCache', { visible: true, level: 'warning' })

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
                if (newSystemData.execution) newSystemData.execution.sort((a, b) => a.seqId - b.seqId)
                const validation = cycleValidation(editorScore, true)
                if (!validation.isValid)
                    dashboardFunctions.setDashboardElement('cycle', {
                        visible: true,
                        tooltip: validation.message,
                        level: 'error'
                    })
                else dashboardFunctions.clearDashboardElement('cycle')
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
