// The FlowManager functions enable to run through the score in the correct sequence.
// the functions take `loop` and `goto` directives into account.
// They also keep track of the 'current' tempo and dynamics.
import type { UUID } from 'crypto'
import _ from 'lodash'
import type { BPM } from 'tone/build/esm/core/type/Units'
import { defaultDynamics, defaultTempo } from '../../config/config'
import type { Position } from '../../typing/basetypes'
import type {
    ExecutionItem,
    ExecutionItemType,
    ExpressionItem,
    GotoItem,
    LoopItem,
    SequenceItem,
    WaitItem
} from '../../typing/execution'
import type { PlaybackType } from '../../typing/playback'
import type { Score, Staff, System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { getBeatNotation, getSystemBeatCount } from '../../utils/objectUtils'

// Keeps track of pass and iteration counters for each system. Also contains lists of
// directives (goto, loop, tempo and dynamics), sorted by priority.
interface FlowInfoTable {
    [idx: string]: {
        system: System
        maxBeatIdx: number
        pass: number
        iteration: number
        executionItems: Record<ExecutionItemType, ExecutionItem[]>
    }
}

// Keeps track of the 'current' cursor position
interface FlowCursor {
    systemIdx: number // Index of the current system (numbering starts at 0)
    beatIdx: number // Index of the current kempli beat (numbering starts at 0)
    newSystem: boolean // True if this system is different than that of the previous step
    systemStart: boolean // True if this is the first section of the system
    lastBeat: boolean // True if this is the last kempli beat of the current system
    sequence: UUID[] | undefined // Currently active sequence (UUIDs of systems to be performed in the given order)
    sequenceIdx: number | undefined // Current index of the active sequence
}

// Returned by function nextInFlow.
// Contains information about the FlowCursor's current system.
export interface FlowStep {
    id: number
    system: System
    systemIdx: number
    beatIdx: number
    pass: number // Current pass count
    iteration: number // current iteration count
    beats: Partial<Record<Position, Staff>>
    positions: Partial<Position>[]
    tempo: BPM[]
    dynamics: number[]
    lastSystem: boolean
    lastBeat: boolean
    waitMsAfter: number // Delay after the end of the current section in milliseconds
    sequence?: UUID[] // Currently active sequence (UUIDs of systems to be performed in the given order)
    sequenceIdx?: number // Current index of the active sequence
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
export function executionManager(
    score: Score,
    playbackType: PlaybackType = 'multiple',
    startAtSystemIndex: number = 0,
    startAtPass: number = 1
) {
    var currentStep: FlowStep | undefined = undefined

    // Create the lookup table and initialize the flow.
    var flowinfo: FlowInfoTable = Object.fromEntries(
        score.systems.map((system) => {
            const beatCount = getSystemBeatCount(system)
            const executionItems: Record<ExecutionItemType, ExecutionItem[]> = Object()
            for (const type of ['goto', 'loop', 'wait', 'tempo', 'dynamics', 'sequence'] as ExecutionItemType[]) {
                executionItems[type] = system.execution?.filter((item) => item.type == type)?.sort(compareItems) || []
                // debug(`executionItems[system ${system.id}}]=${JSON.stringify(executionItems)}`)
            }
            return [
                system.index,
                { system: system, maxBeatIdx: beatCount - 1, pass: 0, iteration: 0, executionItems: executionItems }
            ]
        })
    )

    var uuidLookup: Record<string, number> = Object.fromEntries(
        score.systems.map((system) => [system.uuid, system.index])
    )

    // Fast forward to the requested system and pass
    // This will set all flow variables correctly
    if (startAtSystemIndex != 0 || startAtPass != 1) {
        var quit = false
        do {
            const nextStep = nextStepInFlow(true) // get next step but do not change flow variables
            if (!nextStep) {
                console.error(`Requested system ${startAtSystemIndex} unreachable from the start of the score`)
                currentStep = nextStepInFlow()
                break
            }
            if (nextStep.systemIdx != startAtSystemIndex || nextStep.pass != startAtPass) {
                // Proceed to next step if the requested position is not yet reached
                // or if the end of the score is reached.
                currentStep = nextStepInFlow()
            } else quit = true
        } while (!quit)
    }

    function resetFlow() {
        _.values(flowinfo).forEach((value) => {
            value.iteration = 0
            value.pass = 0
        })
        currentStep = undefined
    }

    // Returns the best matching 'goto', 'loop', 'tempo' or 'dynamics' item for the current pass/iteration count values
    // or undefined if none was found.
    function getExecutionItems(type: ExecutionItemType, sysIdx: number): ExecutionItem[] {
        const matches: ExecutionItem[] = []
        const items = flowinfo![sysIdx].executionItems[type]
        const flow = flowinfo![sysIdx]
        for (const item of items) {
            var iterationMatches =
                item.type == 'loop'
                    ? flow.iteration <= item.count
                    : !('iterations' in item) ||
                      !item.iterations ||
                      item.iterations.length == 0 ||
                      item.iterations.includes(flow.iteration)
            if (!iterationMatches) continue
            // if `each`==false or undefined: match=true if no passes are given or if flow.pass
            //                                matches a pass in item.passes
            // if `each`==true and one or more passes are given: match=true if flow.pass % maxPassNr
            //                                matches a pass in item.passes
            // The case `each`==true and item.passes==undefined or empty is invalid and should not return a match.
            // The case `each`==true and gotoItem.passes==undefined or empty is invalid and should not return a match.
            var passMatches = !item.passes || item.passes.length == 0 || item.passes.includes(flow.pass)
            if (!item.nthpass && passMatches) matches.push(item)
            else if (item.nthpass && item.passes && item.passes.length > 0 && iterationMatches) {
                const maxPassNr = Math.max(...item.passes)
                if (item.nthpass && item.passes && item.passes.includes(((flow.pass - 1) % maxPassNr) + 1)) {
                    // Matching item found
                    matches.push(item)
                }
            }
        }
        return matches
    }

    // Returns the sequence linked to the given system if available
    function getSequence(currentStep: FlowStep): UUID[] | undefined {
        const sequenceItems: SequenceItem[] = getExecutionItems('sequence', currentStep.systemIdx) as SequenceItem[]
        if (sequenceItems.length > 0) {
            // There should not be more than one sequence item
            return sequenceItems[0].uuids as UUID[]
        }
    }

    // Returns the next index in the current system's sequence if there is a sequence
    // or undefined if there are no more systems in the sequence.
    function getNextSequenceIdx(currentStep: FlowStep, sequence: UUID[]): number | undefined {
        var currSequenceIdx = currentStep.sequenceIdx != undefined ? currentStep.sequenceIdx : -1
        if (currSequenceIdx < sequence.length - 1) {
            return currSequenceIdx + 1
        }
    }

    function getNextSystemInFlow(
        currentStep: FlowStep,
        flowInfo: FlowInfoTable,
        sequence: UUID[] | undefined
    ): { systemIdx: number | undefined; sequenceIdx: number | undefined } {
        var systemIdx: number | undefined = currentStep.systemIdx
        var sequenceIdx: number | undefined = undefined
        const loopItems: LoopItem[] = getExecutionItems('loop', systemIdx) as LoopItem[]
        if (loopItems.length > 0 && flowInfo[systemIdx].iteration < loopItems[0].count) {
            return { systemIdx, sequenceIdx: currentStep.sequenceIdx }
        }
        if (sequence) {
            sequenceIdx = getNextSequenceIdx(currentStep, sequence)
            debug(
                `next in sequence: ${sequenceIdx != undefined ? sequence[sequenceIdx] : 'undefined'} systemId: ${sequenceIdx != undefined ? uuidLookup[sequence[sequenceIdx]] : 'undefined'}`
            )
            if (sequenceIdx != undefined) return { systemIdx: uuidLookup[sequence[sequenceIdx]], sequenceIdx }
        }
        const gotoItems: GotoItem[] = getExecutionItems('goto', systemIdx) as GotoItem[]
        if (gotoItems.length == 0) {
            systemIdx = systemIdx == score.systems.length - 1 ? undefined : systemIdx + 1
        } else {
            systemIdx = uuidLookup[gotoItems[0].targetuuid]
        }
        return { systemIdx, sequenceIdx }
    }

    function getWaitTimeMsAfter(sysIdx: number): number {
        const waitItems: WaitItem[] = getExecutionItems('wait', sysIdx) as WaitItem[]
        return waitItems.reduce((subtotal, item) => subtotal + item.seconds * 1000, 0)
    }

    function getExpressionValue(
        type: 'tempo' | 'dynamics',
        sysIdx: number,
        beatIdx: number,
        currentValue: number
    ): number[] {
        const matches = getExecutionItems(type, sysIdx)
        // debug(`matches[system ${sysIdx + 1} pass=${flowinfo[sysIdx].pass}]=${JSON.stringify(matches)}`)
        if (matches.length == 0) return [currentValue, currentValue]
        // Find an item that matches the given section index.
        const beatNbr = beatIdx + 1 // Beats are numbered from 1
        for (const item of matches) {
            const exprItem = item as ExpressionItem
            // debug(`exprItem=${JSON.stringify([exprItem])}, section=${beatNbr}`)
            if (!exprItem.isGradual) {
                if (beatNbr == exprItem.fromBeat) {
                    // Non-gradual matching item found
                    // debug(`EXPRESSION(${type}) NON-GRADUAL=${JSON.stringify([exprItem.toValue, exprItem.toValue])}`)
                    return [exprItem.value, exprItem.value]
                }
            } else if (exprItem.fromBeat && exprItem.fromBeat <= beatNbr && beatNbr <= exprItem.toBeat!) {
                // Gradual matching item found: determine start and end values for the given section.
                if (undefined !== exprItem.fromValue) {
                    // Case 1: fromValue is given
                    const totalBeats = exprItem.toBeat! - exprItem.fromBeat! + 1
                    const valueRange = exprItem.value - exprItem.fromValue
                    const startValue = exprItem.fromValue + valueRange * ((beatNbr - exprItem.fromBeat) / totalBeats)
                    const endValue = startValue + valueRange / totalBeats
                    // debug(`EXPRESSION(${type}) GRADUAL1=${JSON.stringify([startValue, endValue])}`)
                    return [startValue, endValue]
                } else {
                    // Case 2: fromValue is undefined.
                    const remainingBeats = exprItem.toBeat! - beatNbr + 1
                    const fromValue = currentValue
                    const valueRange = exprItem.value - fromValue
                    const startValue = fromValue
                    const endValue = fromValue + valueRange * (1 / remainingBeats)
                    // debug(`EXPRESSION(${type}) GRADUAL2=${JSON.stringify([startValue, endValue])}`)
                    return [startValue, endValue]
                }
            }
        }
        // debug(`EXPRESSION(${type}) DEFAULT=${JSON.stringify([currentValue, currentValue])}`)
        return [currentValue, currentValue]
    }

    // Returns the next step in the execution flow
    // peek: if true, state variables (cursor, pass and iteration counters) will not be changed
    function nextStepInFlow(peek: boolean = false): FlowStep | undefined {
        const next: FlowCursor = {
            systemIdx: -1,
            beatIdx: -1,
            newSystem: false,
            systemStart: false,
            lastBeat: false,
            sequence: undefined,
            sequenceIdx: undefined
        }
        switch (true) {
            case flowinfo == undefined: {
                console.error(`missing lookup table`)
                return undefined
            }
            case !currentStep: {
                // Start of playback sequence: return the first measure
                _.assign(next, {
                    systemIdx: 0,
                    beatIdx: 0,
                    newSystem: true,
                    systemStart: true,
                    lastBeat: flowinfo![0].maxBeatIdx == 0
                } as FlowCursor)
                break
            }
            case currentStep!.beatIdx < flowinfo![currentStep!.systemIdx].maxBeatIdx: {
                // Next section, same system
                _.assign(next, {
                    systemIdx: currentStep.systemIdx,
                    beatIdx: currentStep.beatIdx + 1,
                    newSystem: false,
                    systemStart: false,
                    lastBeat: currentStep.beatIdx + 1 == flowinfo![currentStep.systemIdx].maxBeatIdx,
                    sequence: currentStep.sequence,
                    sequenceIdx: currentStep.sequenceIdx
                } as FlowCursor)
                break
            }
            case currentStep!.beatIdx >= flowinfo![currentStep!.systemIdx].maxBeatIdx: {
                // Reached end of system. Determine next system.
                // Check if a sequence or goto or loop item is applicable. Otherwise, take next system in sequence.
                const sequence = currentStep.sequence || getSequence(currentStep)
                // const nextSequenceIdx = sequence ? getNextSequenceIdx(currentStep, sequence) : undefined
                const { systemIdx: nextSysIdx, sequenceIdx: nextSequenceIdx } = getNextSystemInFlow(
                    currentStep,
                    flowinfo,
                    sequence
                )
                // In case of single system playback: quit if we leave the requested system
                if (
                    playbackType == 'single' &&
                    currentStep.systemIdx == startAtSystemIndex &&
                    nextSysIdx != startAtSystemIndex
                )
                    return undefined

                if (nextSysIdx == undefined) return undefined
                _.assign(next, {
                    systemIdx: nextSysIdx,
                    beatIdx: 0,
                    newSystem: currentStep.systemIdx != nextSysIdx,
                    systemStart: true,
                    lastBeat: flowinfo![nextSysIdx].maxBeatIdx == 0,
                    sequence: nextSequenceIdx != undefined ? sequence : undefined,
                    sequenceIdx: nextSequenceIdx
                } as FlowCursor)
                break
            }
            default:
                break
        }
        if (next.systemIdx >= 0 && next.beatIdx >= 0) {
            // debug(`NEXTCURSOR [pass=${flowinfo[next.systemIdx].pass}]: ${JSON.stringify(next)}`)
            const nextSystem = flowinfo[next.systemIdx].system
            // Build a Staff per position containing only the current section's notation
            const beats = _.fromPairs(
                _.toPairs(nextSystem.staffs)
                    .filter(([_key, staff]) => staff != null)
                    .map(([key, staff]) => {
                        const objNotation = getBeatNotation(
                            staff!.objNotation,
                            next.beatIdx,
                            nextSystem,
                            key as Position
                        )
                        return [
                            key,
                            { notation: objNotation.map((note) => note.canonicalSymbol), objNotation } as Staff
                        ]
                    })
            ) as Partial<Record<Position, Staff>>

            const nextPass = next.newSystem ? flowinfo[next.systemIdx].pass + 1 : flowinfo[next.systemIdx].pass
            const nextIteration = next.systemStart
                ? flowinfo[next.systemIdx].iteration + 1
                : flowinfo[next.systemIdx].iteration

            if (!peek) {
                // Set/reset iteration and pass counters unless only a preview (peek) of the next step was requested
                if (currentStep && next.newSystem) flowinfo[currentStep.systemIdx].iteration = 0
                if (next.newSystem) flowinfo[next.systemIdx].pass += 1
                if (next.systemStart) flowinfo[next.systemIdx].iteration += 1
            }

            const nextStep: FlowStep = {
                id: currentStep ? currentStep.id + 1 : 1,
                system: nextSystem,
                systemIdx: nextSystem.index,
                beatIdx: next.beatIdx,
                pass: peek ? nextPass : flowinfo[next.systemIdx].pass,
                iteration: peek ? nextIteration : flowinfo[next.systemIdx].iteration,
                beats: beats,
                positions: _.keys(beats) as Position[],
                tempo: getExpressionValue('tempo', next.systemIdx, next.beatIdx, currentStep?.tempo[1] || defaultTempo),
                dynamics: getExpressionValue(
                    'dynamics',
                    next.systemIdx,
                    next.beatIdx,
                    currentStep?.dynamics[1] || defaultDynamics
                ),
                lastSystem: next.systemIdx == score.systems.length - 1 || playbackType == 'single',
                lastBeat: next.beatIdx == flowinfo[next.systemIdx].maxBeatIdx,
                waitMsAfter: next.lastBeat ? getWaitTimeMsAfter(next.systemIdx) : 0,
                sequence: next.sequence,
                sequenceIdx: next.sequenceIdx
            }

            if (!peek) {
                currentStep = nextStep
                // debug(
                //     `NEXTSTEP: #${nextStep.system.id} beat:${nextStep.beatIdx} lastBeat:${nextStep.lastBeat} waitMsAfter:${nextStep.waitMsAfter}`
                // )
            }
            return nextStep
        }
        return undefined
    }

    return { nextInFlow: nextStepInFlow, resetFlow }
}
