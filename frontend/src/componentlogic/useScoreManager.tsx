import _ from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { DashboardLevel } from '../components/Dashboard'
import { defaultBeatFrequency } from '../config/config'
import type { ExecutionItem } from '../typing/execution'
import { kempliStates, type Score, type Staff, type System, type ValidationResult } from '../typing/score'
import { debug } from '../utils/debugger'
import { executionItemTooltip } from '../utils/executionItems'
import { cycleValidation, defaultValidationValue } from './validationManager'

export interface LocalCacheInfo {
    level: DashboardLevel
    message: string
}

function gotoItemTargetName(destination: System) {
    return destination.label ? destination.label : `#${destination.id}`
}

export function useScoreManager() {
    const [score, setScore] = useState<Score | undefined>(undefined)
    const [labels, setLabels] = useState<Record<string, System>>({})
    const [indexedDb, setIndexedDb] = useState<IDBDatabase | undefined>(undefined)
    const [validation, setValidation] = useState<ValidationResult>(defaultValidationValue)
    const [localCacheState, setLocalCacheState] = useState<LocalCacheInfo>({ level: 'info', message: '' })

    // Debounce timer for the (heavy) IndexedDB recovery write.
    const idbTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(
        () => () => {
            if (idbTimer.current !== null) clearTimeout(idbTimer.current)
        },
        []
    )

    function updateScore(score: Score) {
        debug(`updating score with title ${score.title}`)
        setScore(score)
        const labeldict = Object.fromEntries(
            score.systems.filter((sys) => sys.label != undefined).map((sys) => [sys.label, sys])
        )
        setValidation(cycleValidation(score))

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
                setLocalCacheState({ level: 'info', message: '' })
            }
            dbOpenRequest.onerror = () =>
                // TODO replace this alert with an icon in the Dashboard.
                setLocalCacheState({ level: 'warning', message: '' })
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
        // Writing the whole score is expensive, so it is debounced: rapid score
        // changes coalesce into a single write of the latest score once edits settle.
        if (indexedDb) {
            if (idbTimer.current !== null) clearTimeout(idbTimer.current)
            idbTimer.current = setTimeout(() => {
                idbTimer.current = null
                const transaction = indexedDb.transaction('Score', 'readwrite')
                const request = transaction.objectStore('Score').put(score)
                const dateStr = new Date().toString().replace(/ GMT.*$/, '')
                request.onsuccess = () =>
                    setLocalCacheState({ level: 'info', message: `${dateStr}\nSaved to local cache` })
                request.onerror = () =>
                    setLocalCacheState({
                        level: 'warning',
                        message: `${dateStr}\nCould not save the current status to local storage.`
                    })
            }, 800)
        } else setLocalCacheState({ level: 'warning', message: '' })

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

    // Stable identity (empty deps) so memoised SystemNodes are not all re-rendered
    // when one system is committed. Uses functional setScore to read the latest score.
    const updateSystem = useCallback((sysData: System) => {
        setScore((current) => {
            if (!current) return current
            const sysIdx = sysData.index
            return {
                ...current,
                systems: [...current.systems.slice(0, sysIdx), sysData, ...current.systems.slice(sysIdx + 1)]
            }
        })
    }, [])

    const updateParts = useCallback((parts: Record<string, string[]>) => {
        if (!score) return
        const newScore: Score = { ...score }
        newScore.parts = { ...parts }
        setScore(newScore)
    }, [])

    function updatePointers(newSystemData: System[]) {
        // Update fields that depend on pointers to another system
        newSystemData.map((systemData) => {
            if (systemData.copyFromUuid) {
                const source = newSystemData.find((sysData) => sysData.uuid == systemData.copyFromUuid)
                if (source && source.uuid != systemData.uuid)
                    systemData.copyFrom = source.label ? source.label : `#${source.id}`
                else {
                    systemData.copyFrom = undefined
                    systemData.copyFromUuid = undefined
                }
            } else systemData.copyFrom = undefined
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

    // This function is called by executeItemAction.
    function updateScoreFromItemAction(
        score: Score | undefined,
        fieldname: string,
        systemData: System,
        value?: string | number
    ): Score | undefined {
        var newSystemData: System | null = _.cloneDeep(systemData)
        // Reset the edit buffers of the staffs.
        Object.values(newSystemData.staffs).forEach((staff) => {
            if (staff) delete (staff as Staff).notation_
        })
        if (!score) return undefined
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
                // Creates an empty system based on the staff settings of the current system.
                Object.values(newSystemData.staffs).forEach((staff: Staff) => {
                    if (!staff) return
                    delete staff.objNotation_
                    staff.objNotation = []
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
                newSystemData.copyFromUuid = source.uuid
                // newSystemData.copyfrom = source.label || `#${source.index}`
                sliceIndex1 = systemData.index + 1 // Copy after the current system
                break
            }
            case 'execution':
                // Changes returned by the FlowItemsForm
                if (newSystemData.execution) newSystemData.execution.sort((a, b) => a.seqId - b.seqId)
                break
            case 'delete':
                if (newSystemData.label) {
                    newLabels = { ...labels }
                    delete labels[newSystemData.label]
                    setLabels(newLabels)
                }
                newSystemData = null
                break
            case 'kempli':
                if (value) {
                    // Field value was edited
                    newSystemData.kempli.frequency = value as number
                } else {
                    // Button was clicked: toggle the kempli state
                    const stateIdx = kempliStates.indexOf(newSystemData.kempli.state)
                    const nextIdx = (stateIdx + 1) % kempliStates.length
                    newSystemData.kempli.state = kempliStates[nextIdx]
                    if (!newSystemData.kempli.frequency) newSystemData.kempli.frequency = defaultBeatFrequency
                }
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
        return { ...score, ...{ systems: newData } }
    }

    // Handles user actions triggered with buttons in the panel header.
    // Note this is a callback function.
    const executeItemAction = useCallback(
        (fieldname: string, systemData: System, value?: string | number) => {
            debug(`processing ${fieldname}`)
            // Callback functions have to pass a function to state setters if they need to
            // access to the current value of that state.
            setScore((currentScore) => updateScoreFromItemAction(currentScore, fieldname, systemData, value))
        },
        // Depends only on `labels` (used by updateScoreFromItemAction); the score is
        // read via the functional setScore above, so editing does not change identity.
        [labels]
    )

    return {
        score,
        validation,
        labels,
        localCacheState,
        getScore,
        updateScore,
        updateSystem,
        updateParts,
        executeItemAction
    }
}
