import * as Tone from 'tone'
import type {
    AnimationAction,
    CursorAction,
    EditorSystemData,
    SamplerAction,
    TempoAction,
    TimeLine
} from '../models/types'
import { n2TO, TO2n } from '../utils/timeunits'
import { cleanSymbol } from '../utils/alphabet'
import { isExtension, isMuting } from '../config/configfunctions'
import { Timeline } from 'rsuite'

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
export function createTimelineFromEditor(data: EditorSystemData[]): TimeLine {
    const timeline: TimeLine = {
        totalDurationSec: 0,
        totalDurationTO: n2TO(0),
        initialBPM: 60, // Update after BPM and velocity have been added to EditorSystemData
        tempoactions: [],
        sampleractions: [],
        animationactions: [],
        cursoractions: [],
        notation: {}
    }

    const velocity = 0.7 // Update after BPM and velocity have been added to EditorSystemData
    const bpm = 60
    var currTime: number = 0
    var sysStartTime: number = 0
    var maxStaffDuration: number = 0
    var msg = ''
    var currNote: SamplerAction | null = null
    var cursorPos = 0

    data.forEach((system, sysidx) => {
        const lastSystem = sysidx == data.length - 1
        sysStartTime += maxStaffDuration
        maxStaffDuration = 0
        Object.entries(system.staffs).forEach(([position, measures]) => {
            currTime = sysStartTime
            measures.forEach((measure, measureidx) => {
                const lastMeasure = lastSystem && measureidx == measures.length - 1
                var cursorPos = 0
                measure.notation.forEach((symbol, symidx) => {
                    const endOfPosition = lastMeasure && symidx == measure.notation.length - 1
                    if (!isExtension(symbol.s) || endOfPosition) {
                        // Encountered a new note symbol, a muting symbol or last symbol for this instrument position.
                        if (currNote) {
                            // Need to close and save the currently 'playing' note.
                            // Add a basenote duration if the last symbol of the staff is an extension
                            const addDuration = isExtension(symbol.s) ? 1 : 0
                            // Update the current note's sampler action and save it to the timeline.
                            currNote.duration = n2TO(currTime - TO2n(currNote.time) + addDuration)
                            currNote.isLast = endOfPosition && isExtension(symbol.s)
                            timeline.sampleractions.push(currNote)
                            currNote = null
                        }
                        if (!isExtension(symbol.s) && !isMuting(symbol.s)) {
                            // Create a sampler action for the new note
                            currNote = {
                                action: 'play',
                                position: position,
                                cleanedSymbol: cleanSymbol(symbol.s),
                                bpm: bpm,
                                velocity: velocity,
                                time: n2TO(currTime),
                                duration: n2TO(1), // can be updated later
                                isLast: endOfPosition // can be updated later
                            }
                            if (endOfPosition) {
                                timeline.sampleractions.push(currNote)
                                currNote = null
                            }
                        }
                    }
                    // Create cursor actions
                    timeline.cursoractions.push({
                        time: n2TO(currTime),
                        system: symbol.system,
                        section: symbol.section,
                        position: position,
                        symbol: symbol.s,
                        line: 0,
                        range: [cursorPos, cursorPos + symbol.s.length]
                    })
                    cursorPos += symbol.s.length
                    currTime += 1
                })
            })
        })
        maxStaffDuration = Math.max(currTime - sysStartTime, maxStaffDuration)
    })
    timeline.totalDurationTO = n2TO(sysStartTime + maxStaffDuration)

    return timeline
}

export function scheduleTransport(
    timeLine: TimeLine | null,
    play: ((time: number, action: SamplerAction) => void) | null = null,
    animate: ((time: number, action: AnimationAction) => void) | null = null,
    cursor: ((time: number, action: CursorAction) => void) | null = null,
    onEndofSched: ((time: number) => void) | null = null,
    pbSpeed: number = 1
) {
    // Creates the schedule for the Transport object.
    if (!timeLine) return

    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0

    // tempo and instrument actions (notes)
    // Set the initial tempo to 60 (intro time)
    const tAction: TempoAction = { time: { '16n': 0 }, bpm: timeLine.initialBPM, duration: { '16n': 0 } }
    Tone.getTransport().schedule((time) => changeTempo(time, tAction, pbSpeed), tAction.time)
    if (play) {
        timeLine.sampleractions.forEach((sAction: SamplerAction) => {
            Tone.getTransport().schedule((time) => changeTempo(time, sAction, pbSpeed), sAction.time)
            Tone.getTransport().schedule((time) => play(time, sAction), sAction.time)
        })
    }
    if (onEndofSched) {
        Tone.getTransport().schedule((time) => onEndofSched(time), timeLine.totalDurationTO)
    }

    // timeline.animationactions.forEach((aAction: AnimationAction) => {
    //     Tone.getTransport().schedule((time) => animateInstrument(time, aAction), aAction.time)
    // })
    // // Schedule cursor actions
    // timeline.cursoractions.forEach((cAction: CursorAction) => {
    //     Tone.getTransport().schedule((time) => animateNotation(time, cAction), cAction.time)
    // })
}
