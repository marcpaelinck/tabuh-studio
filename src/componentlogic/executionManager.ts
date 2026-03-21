// The FlowManager functions enable to run through the score in the correct sequence.
// the functions take `loop` and `goto` directives into account.
// They also keep track of the 'current' tempo and dynamics.
import _ from 'lodash'
import type { BPM } from 'tone/build/esm/core/type/Units'
import { defaultDynamics, defaultTempo } from '../config/config'
import type {
    EditorMeasure,
    EditorScore,
    EditorSystem,
    ExecutionItem,
    ExecutionItemType,
    ExpressionItem,
    GotoItem,
    LoopItem,
    Position,
    WaitItem
} from '../typing/types'
import { debug } from '../utils/debugger'
import type { PlaybackType } from './playbackReducer'

// Keeps track of pass and loop counters for each system. Also contains lists of
// directives (goto, loop, tempo and dynamics), sorted by priority.
interface FlowInfoTable {
    [idx: string]: {
        system: EditorSystem
        maxSectIdx: number
        pass: number
        loop: number
        executionItems: Record<ExecutionItemType, ExecutionItem[]>
    }
}

// Keeps track of the 'current' cursor position
interface FlowCursor {
    systemIdx: number // Index of the current system (numbering starts at 0)
    sectionIdx: number // Index of the current section (numbering starts at 0)
    newSystem: boolean // True if this system is different than that of the previous step
    systemStart: boolean // True if this the first beat of the system
    lastSection: boolean // True if this is the last section of the current system
}

// Returned by function nextInFlow.
// Contains detailed information corresponding with the current FlowCursor settings.
export interface FlowStep {
    system: EditorSystem
    systemIdx: number
    sectionIdx: number // for future use
    measures: Record<Position, EditorMeasure>
    positions: Position[]
    tempo: BPM[]
    dynamics: number[]
    lastSystem: boolean
    lastSection: boolean
    waitMsBefore: number // Delay before the start of the current section in milliseconds
    waitMsAfter: number // Delay after the end of the current section in milliseconds
}

const itemPriority = (item: ExecutionItem): number => {
    // prio 1: specific pass number(s).
    // prio 2: every nth pass number(s) (each==true)
    // prio 3: no pass specification.
    var prio = 99
    if (item.passes != undefined && item.passes.length > 0 && !item.nthpass) prio = 1
    else if (item.passes != undefined && item.passes.length > 0 && item.nthpass) prio = 2
    else if ((item.passes == undefined || item.passes.length == 0) && !item.nthpass) prio = 4
    return prio
}

// Lower prio number goes first
const compareItems = (item1: ExecutionItem, item2: ExecutionItem): number => itemPriority(item1) - itemPriority(item2)

// Returns functions that can be used to run throught the score in the correct sequence.
export function executionManager(score: EditorScore, startIndex: number = 0, playbackType: PlaybackType = 'multiple') {
    var currentStep: FlowStep | undefined = undefined

    // Create the lookup table and initialize the flow.
    var flowinfo: FlowInfoTable = Object.fromEntries(
        score.systems.map((system) => {
            const firstPos = Object.keys(system.staffs)[0] as Position
            const sectionCount = system.staffs[firstPos].length
            const executionItems: Record<ExecutionItemType, ExecutionItem[]> = Object()
            for (const type of ['goto', 'loop', 'wait', 'tempo', 'dynamics'] as ExecutionItemType[]) {
                executionItems[type] = system.execution?.filter((item) => item.type == type)?.sort(compareItems) || []
                // debug(`executionItems[system ${system.id}}]=${JSON.stringify(executionItems)}`)
            }
            return [
                system.index,
                { system: system, maxSectIdx: sectionCount - 1, pass: 0, loop: 0, executionItems: executionItems }
            ]
        })
    )

    var uuidLookup: Record<string, number> = Object.fromEntries(
        score.systems.map((system) => [system.uuid, system.index])
    )

    function resetFlow() {
        _.values(flowinfo).forEach((value) => {
            value.loop = 0
            value.pass = 0
        })
        currentStep = undefined
    }

    // Returns the best matching 'goto', 'loop', 'tempo' or 'dynamics' item for the current pass/loop count values
    // or undefined if none was found.
    function getExecutionItems(type: ExecutionItemType, sysIdx: number): ExecutionItem[] {
        const matches: ExecutionItem[] = []
        const items = flowinfo![sysIdx].executionItems[type]
        const flow = flowinfo![sysIdx]
        for (const item of items) {
            var loopMatches =
                item.type == 'loop'
                    ? flow.loop <= item.count
                    : !('iterations' in item) ||
                      !item.iterations ||
                      item.iterations.length == 0 ||
                      item.iterations.includes(flow.loop)
            if (!loopMatches) continue
            // if `each`==false or undefined: match=true if no passes are given or if flow.pass
            //                                matches a pass in item.passes
            // if `each`==true and one or more passes are given: match=true if flow.pass % maxPassNr
            //                                matches a pass in item.passes
            // The case `each`==true and item.passes==undefined or empty is invalid and should not return a match.
            // The case `each`==true and gotoItem.passes==undefined or empty is invalid and should not return a match.
            var passMatches = !item.passes || item.passes.length == 0 || item.passes.includes(flow.pass)
            if (!item.nthpass && passMatches) matches.push(item)
            else if (item.nthpass && item.passes && item.passes.length > 0 && loopMatches) {
                const maxPassNr = Math.max(...item.passes)
                if (item.nthpass && item.passes && item.passes.includes(((flow.pass - 1) % maxPassNr) + 1)) {
                    // Matching item found
                    matches.push(item)
                }
            }
        }
        return matches
    }

    function getNextSystemInFlow(sysIdx: number, flowInfo: FlowInfoTable, lastSystem: boolean): number | undefined {
        const loopItems: LoopItem[] = getExecutionItems('loop', sysIdx) as LoopItem[]
        if (loopItems.length > 0 && flowInfo[sysIdx].loop < loopItems[0].count) {
            return sysIdx
        }
        const gotoItems: GotoItem[] = getExecutionItems('goto', sysIdx) as GotoItem[]
        if (gotoItems.length == 0) return lastSystem ? undefined : sysIdx + 1
        return uuidLookup[gotoItems[0].targetuuid]
    }

    function getWaitTimeMsAfter(sysIdx: number): number {
        const waitItems: WaitItem[] = getExecutionItems('wait', sysIdx) as WaitItem[]
        return waitItems.reduce((subtotal, item) => subtotal + item.seconds * 1000, 0)
    }

    function getExpressionValue(
        type: 'tempo' | 'dynamics',
        sysIdx: number,
        sectIdx: number,
        currentValue: number
    ): number[] {
        const matches = getExecutionItems(type, sysIdx)
        // debug(`matches[system ${sysIdx + 1} pass=${flowinfo[sysIdx].pass}]=${JSON.stringify(matches)}`)
        if (matches.length == 0) return [currentValue, currentValue]
        // Find an item that matches the given section index.
        const sectionNbr = sectIdx + 1 // Sections are numbered from 1
        for (const item of matches) {
            const exprItem = item as ExpressionItem
            // debug(`exprItem=${JSON.stringify([exprItem])}, section=${sectionNbr}`)
            if (!exprItem.isGradual) {
                if (sectionNbr == exprItem.toSection) {
                    // Non-gradual matching item found
                    // debug(`EXPRESSION(${type}) NON-GRADUAL=${JSON.stringify([exprItem.toValue, exprItem.toValue])}`)
                    return [exprItem.toValue, exprItem.toValue]
                }
            } else if (exprItem.fromSection && exprItem.fromSection <= sectionNbr && sectionNbr <= exprItem.toSection) {
                // Gradual matching item found: determine start and end values for the given section.
                if (undefined != exprItem.fromValue) {
                    // Case 1: fromValue is given
                    const totalSections = exprItem.toSection - exprItem.fromSection + 1
                    const valueRange = exprItem.toValue - exprItem.fromValue
                    const startValue =
                        exprItem.fromValue + valueRange * ((sectionNbr - exprItem.fromSection) / totalSections)
                    const endValue = startValue + valueRange / totalSections
                    // debug(`EXPRESSION(${type}) GRADUAL1=${JSON.stringify([startValue, endValue])}`)
                    return [startValue, endValue]
                } else {
                    // Case 2: fromValue is undefined.
                    const remainingSections = exprItem.toSection - sectionNbr + 1
                    const fromValue = currentValue
                    const valueRange = exprItem.toValue - fromValue
                    const startValue = fromValue
                    const endValue = fromValue + valueRange * (1 / remainingSections)
                    // debug(`EXPRESSION(${type}) GRADUAL2=${JSON.stringify([startValue, endValue])}`)
                    return [startValue, endValue]
                }
            }
        }
        // debug(`EXPRESSION(${type}) DEFAULT=${JSON.stringify([currentValue, currentValue])}`)
        return [currentValue, currentValue]
    }

    // Returns the next step in the execution flow
    // peek: if true, state variables (cursor, pass and loop counters) will not be changed
    function nextInFlow(peek: boolean = false): FlowStep | undefined {
        const next: FlowCursor = {
            systemIdx: -1,
            sectionIdx: -1,
            newSystem: false,
            systemStart: false,
            lastSection: false
        }
        switch (true) {
            case flowinfo == undefined: {
                console.error(`missing lookup table`)
                return undefined
            }
            case !currentStep: {
                // Start of playback sequence: return the first measure
                _.assign(next, {
                    systemIdx: startIndex,
                    sectionIdx: 0,
                    newSystem: true,
                    systemStart: true,
                    lastSection: flowinfo![startIndex].maxSectIdx == 0
                })
                break
            }
            case currentStep!.sectionIdx < flowinfo![currentStep!.systemIdx].maxSectIdx: {
                // Next section, same system
                _.assign(next, {
                    systemIdx: currentStep.systemIdx,
                    sectionIdx: currentStep.sectionIdx + 1,
                    newSystem: false,
                    systemStart: false,
                    lastSection: currentStep.sectionIdx + 1 == flowinfo![currentStep!.systemIdx].maxSectIdx
                })
                break
            }
            case currentStep!.sectionIdx >= flowinfo![currentStep!.systemIdx].maxSectIdx: {
                // Reached end of system. Determine next system.
                if (playbackType == 'single') return undefined
                // Check if a goto or loop item is applicable. Otherwise, take next system in sequence.
                const nextSysIdx = getNextSystemInFlow(currentStep.systemIdx, flowinfo, currentStep.lastSystem)
                if (nextSysIdx == undefined) return undefined
                _.assign(next, {
                    systemIdx: nextSysIdx,
                    sectionIdx: 0,
                    newSystem: currentStep.systemIdx != nextSysIdx,
                    systemStart: true,
                    lastSection: currentStep.sectionIdx + 1 == 0
                })
                break
            }
            default:
                break
        }
        if (next.systemIdx >= 0 && next.sectionIdx >= 0) {
            debug(`NEXTCURSOR [pass=${flowinfo[next.systemIdx].pass}]: ${JSON.stringify(next)}`)
            const nextSystem = flowinfo[next.systemIdx].system
            const measures = _.fromPairs(
                _.toPairs(nextSystem.staffs).map(([key, staff]) => [key, staff[next.sectionIdx]])
            ) as Record<Position, EditorMeasure>

            const nextStep = {
                system: nextSystem,
                systemIdx: nextSystem.index,
                sectionIdx: next.sectionIdx,
                measures: measures,
                positions: score.positions,
                tempo: getExpressionValue(
                    'tempo',
                    next.systemIdx,
                    next.sectionIdx,
                    currentStep?.tempo[1] || defaultTempo
                ),
                dynamics: getExpressionValue(
                    'dynamics',
                    next.systemIdx,
                    next.sectionIdx,
                    currentStep?.dynamics[1] || defaultDynamics
                ),
                lastSystem: next.systemIdx == score.systems.length - 1 || playbackType == 'single',
                lastSection: next.sectionIdx == flowinfo[next.systemIdx].maxSectIdx,
                waitMsBefore: next.newSystem ? getWaitTimeMsAfter(currentStep?.systemIdx || 0) : 0,
                waitMsAfter: next.lastSection ? getWaitTimeMsAfter(next.systemIdx) : 0
            }
            if (!peek) {
                // Set/reset loop and pass counters unless only a preview (peek) of the next step was requested
                if (currentStep && next.newSystem) flowinfo[currentStep.systemIdx].loop = 0
                if (next.newSystem) flowinfo[next.systemIdx].pass += 1
                if (next.systemStart) flowinfo[next.systemIdx].loop += 1
                currentStep = nextStep
            }
            return nextStep
        }
        return undefined
    }

    return { nextInFlow, resetFlow }
}
