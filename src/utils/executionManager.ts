// The FlowManager functions enable to run through the score in the correct sequence.
// the functions take `loop` and `goto` directives into account.
// They also keep track of the 'current' tempo and dynamics.
import _ from 'lodash'
import type { PlaybackType } from '../hooks/playbackReducer'
import type { EditorMeasure, EditorScore, EditorSystem, FlowItem, GotoItem, Position } from '../models/types'

interface FlowCursor {
    sysIdx: number
    sectIdx: number
    lastSystem: boolean
    lastSection: boolean
}

interface FlowInfoTable {
    [idx: string]: {
        system: EditorSystem
        maxSectIdx: number
        pass: number
        loop: number
        flowitems: FlowItem[] | undefined
    }
}

export interface FlowStep {
    system: EditorSystem
    measures: Record<Position, EditorMeasure>
    positions: Position[]
    sectionIdx: number // for future use
    lastSystem: boolean
    lastSection: boolean
}

const prioGoto = (goto: GotoItem): number => {
    // prio 1: specific pass number(s).
    // prio 2: every nth pass number(s) (each==true)
    // prio 3: no pass specification.
    var prio = 99
    if (goto.passes != undefined && goto.passes.length > 0 && !goto.each) prio = 1
    else if (goto.passes != undefined && goto.passes.length > 0 && goto.each) prio = 2
    else if ((goto.passes == undefined || goto.passes.length == 0) && !goto.each) prio = 4
    return prio
}

// Lower prio number goes first
const compareGoto = (goto1: GotoItem, goto2: GotoItem): number => prioGoto(goto1) - prioGoto(goto2)

// Returns functions that can be used to run throught the score in the correct sequence.
export function executionManager(score: EditorScore, startIndex: number = 0, playbackType: PlaybackType = 'multiple') {
    var cursor: FlowCursor | undefined = undefined

    // Reset the cursor and create the lookup table
    var flowinfo: FlowInfoTable = Object.fromEntries(
        score.systems.map((system, idx) => {
            const firstPos = Object.keys(system.staffs)[0] as Position
            const sectionCount = system.staffs[firstPos].length
            const gotos = system.execution?.filter((item) => item.type == 'goto')?.sort(compareGoto)
            return [idx, { system: system, maxSectIdx: sectionCount - 1, pass: 0, loop: 0, flowitems: gotos }]
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

    // Returns the target uuid of a matching 'goto' instruction or undefined.
    function getGotoId(sysIdx: number): number | undefined {
        const gotos = flowinfo![sysIdx].flowitems?.filter((item) => item.type == 'goto')
        if (!gotos) return undefined
        const flow = flowinfo![sysIdx]
        for (const gotoItem of gotos) {
            var match = false
            // if `each`==false or undefined: match=true if no passes are given or if flow.pass
            //                                matches a pass in gotoItem.passes
            // if `each`==true and one or more passes are given: match=true if flow.pass % maxPassNr
            //                                matches a pass in gotoItem.passes
            // The case `each`==true and gotoItem.passes==undefined or empty is invalid and should not return a match.
            if (!gotoItem.each)
                match = !gotoItem.passes || gotoItem.passes.length == 0 || gotoItem.passes.includes(flow.pass)
            else if (gotoItem.each && gotoItem.passes && gotoItem.passes.length > 0) {
                const maxPassNr = Math.max(...gotoItem.passes)
                match = gotoItem.each && gotoItem.passes && gotoItem.passes.includes(((flow.pass - 1) % maxPassNr) + 1)
            }
            if (match) return uuidLookup[gotoItem.targetuuid]
        }
        return undefined
    }

    function nextInFlow(): FlowStep | undefined {
        switch (true) {
            case flowinfo == undefined: {
                console.error(`missing lookup table`)
                return undefined
                break
            }
            case !cursor: {
                // Start of playback sequence: return the first measure
                cursor = {
                    sysIdx: startIndex,
                    sectIdx: 0,
                    lastSystem: playbackType == 'single' || score.systems.length == 1,
                    lastSection: flowinfo[0].maxSectIdx == 1
                }
                break
            }
            case cursor!.sectIdx < flowinfo![cursor!.sysIdx].maxSectIdx: {
                cursor = {
                    sysIdx: cursor.sysIdx,
                    sectIdx: cursor.sectIdx + 1,
                    lastSystem: cursor.lastSystem,
                    lastSection: cursor!.sectIdx + 1 == flowinfo[cursor.sysIdx].maxSectIdx
                }
                break
            }
            case cursor!.sectIdx >= flowinfo![cursor!.sysIdx].maxSectIdx: {
                // Reached end of system. Determine next system.
                if (playbackType == 'single') return undefined
                const gotoIdx = getGotoId(cursor.sysIdx)
                if (gotoIdx == undefined && cursor.sysIdx >= score.systems.length - 1) return undefined
                const nextSysIdx = gotoIdx != undefined ? gotoIdx : cursor.sysIdx + 1
                // Update pass and loop counters
                if (nextSysIdx == cursor.sysIdx) flowinfo[cursor.sysIdx].loop += 1
                else {
                    // Reset loop counter of the current system
                    flowinfo[cursor.sysIdx].loop = 0
                    flowinfo[nextSysIdx].pass += 1
                    flowinfo[nextSysIdx].loop += 1
                }
                cursor = {
                    sysIdx: nextSysIdx,
                    sectIdx: 0,
                    lastSystem: cursor.sysIdx == score.systems.length - 1,
                    lastSection: cursor!.sectIdx + 1 == flowinfo[cursor.sysIdx].maxSectIdx
                }
                break
            }
            default:
                cursor = undefined
        }
        if (cursor) {
            const system = score.systems[cursor.sysIdx]
            const measures = _.fromPairs(_.toPairs(system.staffs).map(([key, staff]) => [key, staff[cursor!.sectIdx]]))
            return {
                system: flowinfo[cursor.sysIdx].system,
                measures: measures as Record<Position, EditorMeasure>,
                positions: score.positions,
                sectionIdx: cursor.sectIdx,
                lastSystem: cursor.sysIdx == score.systems.length - 1 || playbackType == 'single',
                lastSection: cursor.sectIdx == flowinfo[cursor.sysIdx].maxSectIdx
            }
        }
        return undefined
    }

    // Detect endless loops
    function checkLoops() {}

    return { nextInFlow, resetFlow }
}
