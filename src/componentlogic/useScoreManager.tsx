import _ from 'lodash'
import { useEffect, useState } from 'react'
import { useDialog } from 'rsuite'
import { v4 as uuidv4 } from 'uuid'
import { type DashboardFunctionsType } from '../components/contexts'
import type { ExecutionItem, Score, System } from '../typing/types'
import { debug } from '../utils/debugger'
import { executionItemTooltip } from '../utils/executionItems'
import { cycleValidation } from './validationManager'

function gotoItemTargetName(destination: System) {
    return destination.label ? destination.label : `#${destination.id}`
}
export function useScoreManager(dashboardFunctions: DashboardFunctionsType) {
    const [score, setScore] = useState<Score | undefined>(undefined)
    const [labels, setLabels] = useState<Record<string, System>>({})
    const [indexedDb, setIndexedDb] = useState<IDBDatabase | undefined>(undefined)
    const dialog = useDialog()

    function updateScore(score: Score) {
        debug(`updating score with title ${score.title}`)
        setScore(score)
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
        if (!score) return
        const executionitems: ExecutionItem[] = []
        score.systems.forEach((systemData, sysIdx) => {
            systemData.index = sysIdx
            systemData.id = systemData.index + 1
            if (systemData.execution) executionitems.push(...systemData.execution)
        })

        // Store the score object in the browser's IDB Database, for recovery purposes.
        if (indexedDb) {
            dashboardFunctions.setDashboardElement('localCache', { visible: true, level: 'info' })
            const transaction = indexedDb.transaction('Score', 'readwrite')
            const request = transaction.objectStore('Score').put(score)
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
                const target = score.systems.find((sys) => sys.uuid == item.targetuuid)
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
    }, [score])

    function getScore() {
        return score
    }

    function updateSystem(sysData: System) {
        if (!score) return
        const sysIdx = sysData.index
        const newScore: Score = { ...score }
        const systems = score.systems
        newScore.systems = [...systems.slice(0, sysIdx), sysData, ...systems.slice(sysIdx + 1)]
        setScore(newScore)
    }

    function updateParts(parts: Record<string, string[]>) {
        if (!score) return
        const newScore: Score = { ...score }
        newScore.parts = { ...parts }
        setScore(newScore)
    }

    function updatePointers(newSystemData: System[]) {
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
    function executeItemAction(fieldname: string, systemData: System, value?: string) {
        if (!score) return
        debug(`processing ${fieldname}`)
        // Used for insertion and update
        var newSystemData: System | null = _.cloneDeep(systemData)
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
                const source = score.systems.find((sys) => sys.uuid == value)
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
                const validation = cycleValidation(score, true)
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
            ? [...score.systems.slice(0, sliceIndex1), newSystemData, ...score.systems.slice(sliceIndex2)]
            : [...score.systems.slice(0, sliceIndex1), ...score.systems.slice(sliceIndex2)]
        // Update all system IDs
        newData.forEach((sysData, sysIdx) => {
            sysData.index = sysIdx
            sysData.id = sysIdx + 1
        })
        debug('UPDATING SCORE by scoreManager')
        updatePointers(newData)
        setScore({ ...score, ...{ systems: newData } })
    }
    return { score, getScore, updateScore, labels, updateSystem, updateParts, executeItemAction }
}
