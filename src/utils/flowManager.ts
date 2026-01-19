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
    // prio 1: specific pass number(s) without cycle
    // prio 2: pass number(s) with `each` without cycle
    // prio 3: pass number(s) with `each` and cycle
    // prio 4: no pass/cycle specification
    var prio = 99
    if (goto.passes != undefined && !goto.each) prio = 1
    else if (goto.passes != undefined && goto.each && goto.cycle == undefined) prio = 2
    else if (goto.passes != undefined && goto.each && goto.cycle != undefined) prio = 3
    else if (goto.passes == undefined && !goto.each && goto.cycle == undefined) prio = 4
    return prio
}

// Lower prio number goes first
const compareGoto = (goto1: GotoItem, goto2: GotoItem): number => prioGoto(goto1) - prioGoto(goto2)

// Returns functions that can be used to run throught the score in the correct sequence.
export function flowManager(score: EditorScore, startIndex: number = 0, playbackType: PlaybackType = 'multiple') {
    var cursor: FlowCursor | undefined = undefined

    // Reset the cursor and create the lookup table
    var flowinfo: FlowInfoTable = Object.fromEntries(
        score.systems.map((system, idx) => {
            const firstPos = Object.keys(system.staffs)[0] as Position
            const sectionCount = system.staffs[firstPos].length
            const gotos = system.flow?.filter((item) => item.type == 'goto')?.sort(compareGoto)
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

    function getGotoId(sysIdx: number): number | undefined {
        const gotos = flowinfo![sysIdx].flowitems?.filter((item) => item.type == 'goto')
        if (!gotos) return undefined
        const flow = flowinfo![sysIdx]
        for (const gotoItem of gotos) {
            const maxPassNr = gotoItem.passes ? Math.max(...gotoItem.passes) : 0
            const cycle = Math.max(gotoItem.cycle || 0, maxPassNr)
            const match =
                (!gotoItem.each && (!gotoItem.passes || gotoItem.passes.includes(flow.pass))) ||
                (gotoItem.each && gotoItem.passes && gotoItem.passes.includes(((flow.pass - 1) % cycle) + 1))
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
