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
    Position
} from '../models/types'
import { debug } from '../utils/debugger'
import type { PlaybackType } from './playbackReducer'

// Keeps track of the 'current' cursor position
interface FlowCursor {
    sysIdx: number
    sectIdx: number
    lastSystem: boolean
    lastSection: boolean
    tempo: BPM[]
    dynamics: number[]
}

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

// Returned by function nextInFlow.
// Contains detailed information corresponding with the current FlowCursor settings.
export interface FlowStep {
    system: EditorSystem
    measures: Record<Position, EditorMeasure>
    positions: Position[]
    tempo: BPM[]
    dynamics: number[]
    sectionIdx: number // for future use
    lastSystem: boolean
    lastSection: boolean
}

const itemPriority = (item: ExecutionItem): number => {
    // prio 1: specific pass number(s).
    // prio 2: every nth pass number(s) (each==true)
    // prio 3: no pass specification.
    var prio = 99
    if (item.passes != undefined && item.passes.length > 0 && !item.each) prio = 1
    else if (item.passes != undefined && item.passes.length > 0 && item.each) prio = 2
    else if ((item.passes == undefined || item.passes.length == 0) && !item.each) prio = 4
    return prio
}

// Lower prio number goes first
const compareItems = (item1: ExecutionItem, item2: ExecutionItem): number => itemPriority(item1) - itemPriority(item2)

// Returns functions that can be used to run throught the score in the correct sequence.
export function executionManager(score: EditorScore, startIndex: number = 0, playbackType: PlaybackType = 'multiple') {
    var cursor: FlowCursor | undefined = undefined

    // Reset the cursor and create the lookup table
    var flowinfo: FlowInfoTable = Object.fromEntries(
        score.systems.map((system, idx) => {
            const firstPos = Object.keys(system.staffs)[0] as Position
            const sectionCount = system.staffs[firstPos].length
            const executionItems: Record<ExecutionItemType, ExecutionItem[]> = Object()
            for (const type of ['goto', 'loop', 'tempo', 'dynamics'] as ExecutionItemType[]) {
                executionItems[type] = system.execution?.filter((item) => item.type == type)?.sort(compareItems) || []
                // debug(`executionItems[system ${system.id}}]=${JSON.stringify(executionItems)}`)
            }
            return [
                idx,
                { system: system, maxSectIdx: sectionCount - 1, pass: 0, loop: 0, executionItems: executionItems }
            ]
        })
    )

    var uuidLookup: Record<string, number> = Object.fromEntries(score.systems.map((system, idx) => [system.uuid, idx]))

    function resetFlow() {
        _.values(flowinfo).forEach((value) => {
            value.loop = 0
            value.pass = 0
        })
        cursor = undefined
    }

    // Returns the best matching 'goto', 'tempo' or 'dynamics' item for the current pass/loop count values
    // or undefined if none was found.
    function getExecutionItems(type: ExecutionItemType, sysIdx: number): ExecutionItem[] {
        const matches: ExecutionItem[] = []
        const items = flowinfo![sysIdx].executionItems[type]
        const flow = flowinfo![sysIdx]
        for (const item of items) {
            // if `each`==false or undefined: match=true if no passes are given or if flow.pass
            //                                matches a pass in item.passes
            // if `each`==true and one or more passes are given: match=true if flow.pass % maxPassNr
            //                                matches a pass in item.passes
            // The case `each`==true and item.passes==undefined or empty is invalid and should not return a match.
            // The case `each`==true and gotoItem.passes==undefined or empty is invalid and should not return a match.
            if (!item.each && (!item.passes || item.passes.length == 0 || item.passes.includes(flow.pass)))
                matches.push(item)
            else if (item.each && item.passes && item.passes.length > 0) {
                const maxPassNr = Math.max(...item.passes)
                if (item.each && item.passes && item.passes.includes(((flow.pass - 1) % maxPassNr) + 1)) {
                    // Matching item found
                    matches.push(item)
                }
            }
        }
        return matches
    }

    function getNextSystemInFlow(sysIdx: number, lastSystem: boolean): number | undefined {
        const flowItems: GotoItem[] = getExecutionItems('goto', sysIdx) as GotoItem[]
        if (flowItems.length == 0) return lastSystem ? undefined : sysIdx + 1
        return uuidLookup[flowItems[0].targetuuid]
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
                    const startValue = exprItem.fromValue + valueRange * ((sectionNbr - 1) / totalSections)
                    const endValue = exprItem.fromValue + valueRange * (sectionNbr / totalSections)
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

    function nextInFlow(): FlowStep | undefined {
        switch (true) {
            case flowinfo == undefined: {
                console.error(`missing lookup table`)
                return undefined
            }
            case !cursor: {
                // Start of playback sequence: return the first measure
                const [sysIdx, sectIdx] = [startIndex, 0]
                cursor = {
                    sysIdx: sysIdx,
                    sectIdx: sectIdx,
                    lastSystem: playbackType == 'single' || score.systems.length == 1,
                    lastSection: flowinfo[0].maxSectIdx == 1,
                    tempo: getExpressionValue('tempo', sysIdx, sectIdx, defaultTempo),
                    dynamics: getExpressionValue('dynamics', sysIdx, sectIdx, defaultDynamics)
                }
                flowinfo[sysIdx].pass += 1
                flowinfo[sysIdx].loop += 1
                break
            }
            case cursor!.sectIdx < flowinfo![cursor!.sysIdx].maxSectIdx: {
                // Next section, same system
                const [sysIdx, sectIdx] = [cursor.sysIdx, cursor.sectIdx + 1]
                cursor = {
                    sysIdx: sysIdx,
                    sectIdx: sectIdx,
                    lastSystem: cursor.lastSystem,
                    lastSection: sectIdx == flowinfo[sysIdx].maxSectIdx,
                    tempo: getExpressionValue('tempo', sysIdx, sectIdx, cursor.tempo[1]),
                    dynamics: getExpressionValue('dynamics', sysIdx, sectIdx, cursor.dynamics[1])
                }
                break
            }
            case cursor!.sectIdx >= flowinfo![cursor!.sysIdx].maxSectIdx: {
                // Reached end of system. Determine next system.
                if (playbackType == 'single') return undefined
                // Check if a goto item is applicable. Otherwise, take next system in sequence.
                const nextSysIdx = getNextSystemInFlow(cursor.sysIdx, cursor.lastSystem)
                if (nextSysIdx == undefined) return undefined
                // Update pass and loop counters
                if (nextSysIdx == cursor.sysIdx) flowinfo[cursor.sysIdx].loop += 1
                else {
                    // Reset loop counter of the current system
                    flowinfo[cursor.sysIdx].loop = 0
                    flowinfo[nextSysIdx].pass += 1
                    flowinfo[nextSysIdx].loop += 1
                }
                const [sysIdx, sectIdx] = [nextSysIdx, 0]
                cursor = {
                    sysIdx: sysIdx,
                    sectIdx: sectIdx,
                    lastSystem: sysIdx == score.systems.length - 1,
                    lastSection: sectIdx == flowinfo[sysIdx].maxSectIdx,
                    tempo: getExpressionValue('tempo', sysIdx, sectIdx, cursor.tempo[1]),
                    dynamics: getExpressionValue('dynamics', sysIdx, sectIdx, cursor.dynamics[1])
                }
                break
            }
            default:
                cursor = undefined
        }
        if (cursor) {
            const system = score.systems[cursor.sysIdx]
            const measures = _.fromPairs(_.toPairs(system.staffs).map(([key, staff]) => [key, staff[cursor!.sectIdx]]))
            debug(`CURSOR [pass=${flowinfo[cursor.sysIdx].pass}]: ${JSON.stringify(cursor)}`)
            return {
                system: flowinfo[cursor.sysIdx].system,
                measures: measures as Record<Position, EditorMeasure>,
                positions: score.positions,
                tempo: cursor.tempo,
                dynamics: cursor.dynamics,
                sectionIdx: cursor.sectIdx,
                lastSystem: cursor.sysIdx == score.systems.length - 1 || playbackType == 'single',
                lastSection: cursor.sectIdx == flowinfo[cursor.sysIdx].maxSectIdx
            }
        }
        return undefined
    }

    return { nextInFlow, resetFlow }
}
