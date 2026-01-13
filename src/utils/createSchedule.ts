import * as Tone from 'tone'
import { positionConfigs } from '../config/config'
import { isExtension, isMuting } from '../config/configfunctions'
import type {
    ActionFunctions,
    EditorCursorAction,
    EditorSystemData,
    GenericAction,
    PlayerCursorAction,
    SamplerAction,
    TempoAction,
    TimeLine
} from '../models/types'
import { cleanSymbol } from './alphabet'
import { debug } from './debugger'
import { defaultObject } from './objectUtils'
import { n2TO, TO2n } from './timeunits'

const changeTempo: (time: number, action: TempoAction | SamplerAction, pbSpeed: number) => void = (
    time: number,
    action: TempoAction,
    pbSpeed: number
) => {
    if (action.bpm != undefined) {
        Tone.getTransport().bpm.setValueAtTime(action.bpm * pbSpeed, time)
    }
}

// Creates a timeline to play back (parts of) the score in the editor
// useCache: if true, the unsaved (cached) user edits will be played back.
export function createTimelineFromEditor(
    data: EditorSystemData[],
    actionFunctions: ActionFunctions,
    useCache: boolean
): TimeLine {
    const timeline: TimeLine = {
        totalDurationSec: 0,
        totalDurationTO: n2TO(0),
        initialBPM: 60, // Update after BPM and velocity have been added to EditorSystemData
        tempoactions: [],
        sampleractions: [],
        animationactions: [],
        playercursoractions: [],
        editorcursoractions: [],
        genericactions: [],
        notation: {}
    }

    const velocity = 0.7 // Update after BPM and velocity have been added to EditorSystemData
    var prevSystem: EditorSystemData | null = null
    var currTime: number = 0
    var sysStartTime: number = 0
    var maxStaffDuration: number = 0
    var currNote: Record<string, SamplerAction | null> = Object.fromEntries(
        Object.keys(positionConfigs).map((key) => [key, null])
    )
    var cursorPos = 0
    var sysidx = 0
    const passcounter: Record<string, number> = {}

    while (sysidx < data.length) {
        const system = data[sysidx]
        const lastSystem = sysidx == data.length - 1
        sysStartTime += maxStaffDuration
        maxStaffDuration = 0
        Object.entries(system.staffs).forEach(([position, measures]) => {
            currTime = sysStartTime
            measures.forEach((measure, measureidx) => {
                const lastMeasure = lastSystem && measureidx == measures.length - 1
                cursorPos = 0
                var notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
                if (!notation) notation = Array(4).fill(defaultObject('JsonSymbol'))
                notation.forEach((symbol, symidx) => {
                    const endOfPosition = lastMeasure && symidx == notation.length - 1
                    if (actionFunctions.play && (!isExtension(symbol.s) || endOfPosition)) {
                        // Encountered a new note symbol, a muting symbol or last symbol for this instrument position.
                        if (currNote[position]) {
                            // Need to close and save the currently 'playing' note.
                            // Add a basenote duration if the last symbol of the staff is an extension
                            const addDuration = isExtension(symbol.s) ? 1 : 0
                            // Update the current note's sampler action and save it to the timeline.
                            currNote[position].duration = n2TO(currTime - TO2n(currNote[position].time) + addDuration)
                            currNote[position].isLast = endOfPosition && isExtension(symbol.s)
                            timeline.sampleractions.push(currNote[position])
                            currNote[position] = null
                        }
                        if (!isExtension(symbol.s) && !isMuting(symbol.s)) {
                            // Create a sampler action for the new note
                            currNote[position] = {
                                action: actionFunctions.play,
                                position: position,
                                cleanedSymbol: cleanSymbol(symbol.s),
                                bpm:
                                    measure.tempo[0] +
                                    (symidx / notation.length) * (measure.tempo[1] - measure.tempo[0]),
                                velocity: velocity,
                                time: n2TO(currTime),
                                duration: n2TO(1), // can be updated later
                                isLast: endOfPosition // can be updated later
                            }
                            if (endOfPosition) {
                                timeline.sampleractions.push(currNote[position])
                                currNote[position] = null
                            }
                        }
                    }
                    // Create a cursor action
                    if (actionFunctions.playercursor) {
                        timeline.playercursoractions.push({
                            action: actionFunctions.playercursor,
                            time: n2TO(currTime),
                            sysuuid: system.uuid,
                            section: measureidx,
                            position: position,
                            symbol: symbol.s,
                            line: 0,
                            range: [cursorPos, cursorPos + symbol.s.length]
                        })
                    }
                    cursorPos += symbol.s.length
                    currTime += 1
                })
            })
            maxStaffDuration = Math.max(currTime - sysStartTime, maxStaffDuration)
        })
        // Create editor cursor actions and tempo actions
        // Select the staff with the most beats. This will ensure that an incomplete notation will be played correctly.
        const longest = Object.entries(system.staffs).reduce(
            (acc, [position, measures]) => (measures.length > acc.len ? { pos: position, len: measures.length } : acc),
            { pos: '', len: 0 }
        )
        debug(`longest=${JSON.stringify(longest)}`)
        if (actionFunctions.editorcursor && longest.pos != '') {
            const measures = system.staffs[longest.pos]
            var cursorTime = sysStartTime
            for (var measureIdx = 0; measureIdx < longest.len; measureIdx++) {
                timeline.editorcursoractions.push({
                    action: actionFunctions.editorcursor,
                    time: n2TO(cursorTime),
                    prevsysuuid: prevSystem?.uuid || undefined,
                    sysuuid: system.uuid,
                    section: measureIdx
                })
                cursorTime += Math.max(
                    measures[measureIdx].notation.length,
                    measures[measureIdx].notation_?.length || 0
                )
                debug(`cursorTime=${currTime}`)
            }
        }
        prevSystem = system
        // TODO TEMPORARY DEFAULT ELABORATION OF GOTO. ADD GOTO LOGIC HERE.
        if (system.goto && system.goto.length > 0) {
            if (!(system.uuid in passcounter)) passcounter[system.uuid] = 1
            else passcounter[system.uuid] += 1
            //@ts-ignore suppress incorrect warning 'system.goto might be undefined'.
            if (passcounter[system.uuid] <= 2) sysidx = data.findIndex((sys) => sys.uuid == system.goto[0].targetuuid)
            else sysidx += 1
        } else sysidx += 1
    }
    timeline.totalDurationTO = n2TO(sysStartTime + maxStaffDuration)
    if (actionFunctions.generic)
        timeline.genericactions.push({ action: actionFunctions.generic, time: timeline.totalDurationTO })
    debug(timeline, true)
    return timeline
}

export function scheduleTransport(timeLine: TimeLine | null, pbSpeed: number = 1) {
    // Creates the schedule for the Transport object.
    if (!timeLine) return

    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0

    // Tempo and instrument actions (notes)
    // Set the initial tempo to 60 (intro time)
    const tAction: TempoAction = { time: { '16n': 0 }, bpm: timeLine.initialBPM, duration: { '16n': 0 } }
    Tone.getTransport().schedule((time) => changeTempo(time, tAction, pbSpeed), tAction.time)
    timeLine.sampleractions.forEach((sAction: SamplerAction) => {
        Tone.getTransport().schedule((time) => changeTempo(time, sAction, pbSpeed), sAction.time)
        Tone.getTransport().schedule((time) => sAction.action(time, sAction), sAction.time)
    })

    // Player Cursor actions
    timeLine.playercursoractions.forEach((cAction: PlayerCursorAction) => {
        Tone.getTransport().schedule((time) => cAction.action(time, cAction), cAction.time)
    })

    // Editor Cursor actions
    timeLine.editorcursoractions.forEach((cAction: EditorCursorAction) => {
        Tone.getTransport().schedule((time) => cAction.action(time, cAction), cAction.time)
    })

    // Action for when end of schedule is reached
    timeLine.genericactions.forEach((gAction: GenericAction) => {
        Tone.getTransport().schedule((time) => gAction.action(time), gAction.time)
    })
}
