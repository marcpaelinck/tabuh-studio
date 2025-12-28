import * as Tone from 'tone'
import type {
    ActionFunctions,
    AnimationAction,
    CursorAction,
    EditorSystemData,
    GenericAction,
    SamplerAction,
    TempoAction,
    TimeLine
} from '../models/types'
import { n2TO, TO2n } from './timeunits'
import { cleanSymbol } from './alphabet'
import { isExtension, isMuting } from '../config/configfunctions'
import { debug } from './debugger'
import { positionConfigs } from '../config/config'

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
export function createTimelineFromEditor(data: EditorSystemData[], actionFunctions: ActionFunctions): TimeLine {
    const timeline: TimeLine = {
        totalDurationSec: 0,
        totalDurationTO: n2TO(0),
        initialBPM: 60, // Update after BPM and velocity have been added to EditorSystemData
        tempoactions: [],
        sampleractions: [],
        animationactions: [],
        cursoractions: [],
        genericactions: [],
        notation: {}
    }

    const velocity = 0.7 // Update after BPM and velocity have been added to EditorSystemData
    const bpm = 60
    var currTime: number = 0
    var sysStartTime: number = 0
    var maxStaffDuration: number = 0
    var msg = ''
    var currNote: Record<string, SamplerAction | null> = Object.fromEntries(
        Object.keys(positionConfigs).map((key) => [key, null])
    )
    var cursorPos = 0

    data.forEach((system, sysidx) => {
        const lastSystem = sysidx == data.length - 1
        sysStartTime += maxStaffDuration
        maxStaffDuration = 0
        Object.entries(system.staffs).forEach(([position, measures]) => {
            currTime = sysStartTime
            measures.forEach((measure, measureidx) => {
                const lastMeasure = lastSystem && measureidx == measures.length - 1
                cursorPos = 0
                measure.notation.forEach((symbol, symidx) => {
                    const endOfPosition = lastMeasure && symidx == measure.notation.length - 1
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
                                    (symidx / measure.notation.length) * (measure.tempo[1] - measure.tempo[0]),
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
                    // Create cursor and tempo actions if the system-section combi differs
                    // from the previous entry. Therefore we only one position (KEMPLI).
                    const last =
                        timeline.cursoractions.length > 0
                            ? timeline.cursoractions[timeline.cursoractions.length - 1]
                            : null
                    const same =
                        last != null &&
                        system.id == last.system &&
                        measureidx == last.section &&
                        position == last.position
                    if (actionFunctions.cursor && !same && position == 'KEMPLI') {
                        timeline.cursoractions.push({
                            action: actionFunctions.cursor,
                            time: n2TO(currTime),
                            system: system.id,
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
        })
        maxStaffDuration = Math.max(currTime - sysStartTime, maxStaffDuration)
    })
    timeline.totalDurationTO = n2TO(sysStartTime + maxStaffDuration)
    if (actionFunctions.generic)
        timeline.genericactions.push({ action: actionFunctions.generic, time: timeline.totalDurationTO })
    debug(timeline, createTimelineFromEditor.name)
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

    // Cursor actions
    timeLine.cursoractions.forEach((cAction: CursorAction) => {
        Tone.getTransport().schedule((time) => cAction.action(time, cAction), cAction.time)
    })

    // Action for when end of schedule is reached
    timeLine.genericactions.forEach((gAction: GenericAction) => {
        Tone.getTransport().schedule((time) => gAction.action(time), gAction.time)
    })
}
