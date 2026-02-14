// Contains functions that enable to convert a notation to scheduled playback actions.
// These actions consists of audio playback, instrument animation and/or cursor movements.
//
// This module contains two main functions:
// createTimelineFromScore: Creates a TimeLine object which contains separate lists of
// action objects for each type of playback action.
//
// createPlaybackSchedule:
// Creates events in the schedule of the Tone.Transport object, based on the TimeLine's actions.

import * as Tone from 'tone'
import { defaultIntroTime, defaultOutroTime, defaultTempo, positionConfigs } from '../config/config'
import { isExtension, isMuting } from '../config/configfunctions'
import type {
    EditorCursorAction,
    EditorSystem,
    GenericAction,
    PlayerCursorAction,
    Position,
    SamplerAction,
    TempoAction,
    TimeLine
} from '../models/types'
import { cleanSymbol } from '../utils/alphabet'
import { debug } from '../utils/debugger'
import { defaultObject } from '../utils/objectUtils'
import { millis2BaseNoteEquiv, n2TO, TO2n } from '../utils/timeunits'
import { executionManager, type FlowStep } from './executionManager'
import { createPattern, type PatternNoteAction } from './patternManager'
import type { PlaybackAction } from './playbackReducer'

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
export function createTimelineFromScore(
    pbAction: PlaybackAction,
    useCache: boolean,
    intro: number = defaultIntroTime,
    outro: number = defaultOutroTime
): TimeLine | undefined {
    // Check that all necessary data is being passed
    debug(
        `creating timeline ${pbAction.playbackType} totSystems=${pbAction.score?.systems.length} startAtIndex=${pbAction.systemIndex} functions OK: ${pbAction.actionFunctions != undefined} in/out=${JSON.stringify([intro, outro])}`
    )
    if (!(pbAction.playbackType && pbAction.score && pbAction.systemIndex != undefined && pbAction.actionFunctions))
        return undefined

    const timeline: TimeLine = {
        totalDurationSec: 0,
        totalDurationTO: n2TO(0),
        tempoactions: [],
        sampleractions: [],
        animationactions: [],
        playercursoractions: [],
        editorcursoractions: [],
        genericactions: [],
        notation: {} as Record<Position, any>
    }

    const { nextInFlow } = executionManager(pbAction.score, pbAction.systemIndex, pbAction.playbackType)

    var prevSystem: EditorSystem | undefined = undefined
    var currNote: Record<string, SamplerAction | null> = Object.fromEntries(
        Object.keys(positionConfigs).map((key) => [key, null])
    )
    var current: FlowStep | undefined = nextInFlow()
    if (!current) return timeline
    // Keeps track of the longest measure duration in a section. All measures in a system should have
    // the same length but in case they don't, this value will be used to resync the following system.
    var maxMeasureDuration: number = 0
    // const introTimeBn = Math.round(millis2BaseNoteEquiv(defaultIntroTime, 60))
    var sectionStartTime: number = millis2BaseNoteEquiv(intro, current.tempo[0])
    debug(current)

    while (current) {
        debug(current)
        maxMeasureDuration = 0
        for (const position of current.positions) {
            var currTime: number = sectionStartTime
            var cursorPos: number = 0
            const measure = current.measures[position]
            var notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
            if (!notation) notation = Array(4).fill(defaultObject('JsonSymbol'))
            notation.forEach((symbol, symidx) => {
                const endOfPosition = current!.lastSystem && current!.lastSection && symidx == notation.length - 1
                if (pbAction.actionFunctions!.play && (!isExtension(symbol) || endOfPosition)) {
                    // Encountered a new note symbol, a muting symbol or last symbol for this instrument position.
                    if (currNote[position]) {
                        // Need to close and save the currently 'playing' note.
                        // Add a basenote duration if the last symbol of the staff is an extension
                        const addDuration = isExtension(symbol) ? millis2BaseNoteEquiv(outro, current!.tempo[1]) : 0
                        // TODO: Update the current note's sampler action and save it to the timeline.
                        currNote[position].duration = n2TO(currTime - TO2n(currNote[position].time) + addDuration)
                        currNote[position].isLast = endOfPosition && isExtension(symbol)
                        timeline.sampleractions.push(currNote[position])
                        currNote[position] = null
                    }
                    if (!isExtension(symbol) && !isMuting(symbol)) {
                        // Convert potential patterns to individual notes.
                        const patternNoteActions: PatternNoteAction[] = createPattern({
                            time: currTime,
                            position,
                            cleanedSymbol: cleanSymbol(symbol),
                            bpm:
                                current!.tempo[0] +
                                (symidx / notation.length) * (current!.tempo[1] - current!.tempo[0]),
                            velocity:
                                current!.dynamics[0] +
                                (symidx / notation.length) * (current!.dynamics[1] - current!.dynamics[0])
                        })
                        // Create a sampler action for the new note
                        patternNoteActions.forEach((noteAction: PatternNoteAction, idx) => {
                            const lastPatternNote = idx == patternNoteActions.length - 1
                            const finalNote = endOfPosition && lastPatternNote
                            currNote[position] = {
                                ...noteAction,
                                ...{ action: pbAction.actionFunctions!.play!, isLast: finalNote }
                            }
                            // Do not finalize single notes or the last note of a pattern because it might be followed
                            // by a continuation symbol. The note's duration will then need to be updated before it is saved.
                            if (!lastPatternNote || finalNote) {
                                // No more notes expected: save the action here and extend its duration
                                currNote[position].duration = n2TO(
                                    TO2n(currNote[position].time) + millis2BaseNoteEquiv(outro, current!.tempo[1])
                                )
                                if (patternNoteActions.length > 1)
                                    debug(`PATTERN=${JSON.stringify(currNote[position])}`)
                                timeline.sampleractions.push(currNote[position])
                                currNote[position] = null
                            }
                        })
                    }
                }
                if (position == 'UGAL') debug(`CURRNOTE: ${JSON.stringify(currNote)}`)
                // Create a cursor action
                if (pbAction.actionFunctions!.playercursor) {
                    timeline.playercursoractions.push({
                        action: pbAction.actionFunctions!.playercursor,
                        time: n2TO(currTime),
                        sysuuid: current!.system.uuid,
                        section: current!.sectionIdx,
                        position: position,
                        symbol: symbol,
                        line: 0,
                        range: [cursorPos, cursorPos + symbol.length]
                    })
                }
                cursorPos += symbol.length
                currTime += 1
            })
            maxMeasureDuration = Math.max(currTime - sectionStartTime, maxMeasureDuration)
        }
        // Create editor cursor actions and tempo actions.
        // Only one cursor action per system is needed.
        if (pbAction.actionFunctions.editorcursor) {
            var cursorTime = sectionStartTime
            timeline.editorcursoractions.push({
                action: pbAction.actionFunctions.editorcursor,
                time: n2TO(cursorTime),
                prevsysuuid: prevSystem?.uuid || undefined,
                sysuuid: current.system.uuid,
                section: current.sectionIdx
            })
        }
        prevSystem = current.system
        current = nextInFlow()
        sectionStartTime += maxMeasureDuration
    }
    // Determine the total playback duration
    timeline.totalDurationTO = n2TO(sectionStartTime)
    if (pbAction.actionFunctions.generic)
        timeline.genericactions.push({ action: pbAction.actionFunctions.generic, time: timeline.totalDurationTO })
    debug(timeline, true)
    return timeline
}

export function createPlaybackSchedule(timeLine: TimeLine | undefined, pbSpeed: number = 1) {
    // Creates the schedule for the Transport object.
    if (!timeLine) return

    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0

    // Tempo and instrument actions (notes)
    // Set the initial tempo to 60 (intro time)
    const tAction: TempoAction = { time: { '16n': 0 }, bpm: defaultTempo, duration: { '16n': 0 } }
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
