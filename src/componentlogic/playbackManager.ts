// Contains functions that enable to convert a notation to scheduled playback actions.
// These actions consists of audio playback, instrument animation and/or cursor movements.
//
// This module contains two main functions:
// createTimelineFromScore: Creates a TimeLine object which contains separate lists of
// action objects for each type of playback action.
//
// createPlaybackSchedule:
// Creates events in the schedule of the Tone.Transport object, based on the TimeLine's actions.

import _ from 'lodash'
import * as Tone from 'tone'
import { defaultIntroTime, defaultOutroTime, defaultTempo, positionConfigs } from '../config/config'
import { isExtension, isMuting } from '../config/configfunctions'
import type {
    EditorCursorAction,
    EditorSystem,
    GenericAction,
    NoteSymbol,
    PlayerCursorAction,
    Position,
    SamplerAction,
    TempoAction,
    TimeLine
} from '../models/types'
import { cleanSymbol } from '../utils/alphabet'
import { debug } from '../utils/debugger'
import { defaultObject } from '../utils/objectUtils'
import { millis2BaseNoteEquiv, n2TO, TO2n, TOplusNumber, TOplusTO } from '../utils/timeunits'
import { executionManager, type FlowStep } from './executionManager'
import { createNoteActions, type PatternNoteAction } from './patternManager'
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

    function nextSymbol(
        notation: NoteSymbol[],
        currIdx: number,
        position: Position,
        useCache: boolean
    ): NoteSymbol | undefined {
        if (currIdx + 1 < notation.length) return notation[currIdx + 1]
        const nextStep = nextInFlow(true)
        if (nextStep && position in nextStep.measures) {
            const measure = nextStep.measures[position]
            const notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
            return notation.length > 0 ? notation[0] : undefined
        }
        return undefined
    }

    var prevSystem: EditorSystem | undefined = undefined
    var currNote: Record<string, SamplerAction | null> = Object.fromEntries(
        Object.keys(positionConfigs).map((key) => [key, null])
    )
    var prevNote = { ...currNote }
    var currentStep: FlowStep | undefined = nextInFlow()
    if (!currentStep) return timeline
    // Keeps track of the longest measure duration in a section. All measures in a system should have
    // the same length but in case they don't, this value will be used to resync the following system.
    var maxMeasureDuration: number = 0
    // const introTimeBn = Math.round(millis2BaseNoteEquiv(defaultIntroTime, 60))
    var sectionStartTime: number = millis2BaseNoteEquiv(intro, currentStep.tempo[0])
    debug(currentStep)

    while (currentStep) {
        debug(currentStep)
        maxMeasureDuration = 0
        for (const position of currentStep.positions) {
            var currTime: number = sectionStartTime
            var cursorPos: number = 0
            const measure = currentStep.measures[position]
            var notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
            if (!notation) notation = Array(4).fill(defaultObject('JsonSymbol'))
            var prevSymbol: NoteSymbol | undefined = undefined

            notation.forEach((symbol: NoteSymbol, symbolIdx) => {
                var symbolDuration = 1 // This is the default duration for a note or silence
                const endOfPosition =
                    currentStep!.lastSystem && currentStep!.lastSection && symbolIdx == notation.length - 1

                // CREATE SAMPLER ACTION

                if (pbAction.actionFunctions!.play) {
                    // Instead of this check, better to include the required action types in the function arguments
                    if (isExtension(symbol)) {
                        if (currNote[position])
                            currNote[position].duration = TOplusNumber(currNote[position].duration, 1)
                        symbolDuration = 1
                    } else if (isMuting(symbol)) {
                        symbolDuration = 1
                    } else {
                        // Convert potential patterns to individual note actions.
                        const patternNoteActions: PatternNoteAction[] = createNoteActions({
                            time: currTime,
                            position,
                            prevsymbol: prevSymbol,
                            symbol: cleanSymbol(symbol),
                            nextsymbol: nextSymbol(notation, symbolIdx, position, useCache),
                            bpm:
                                currentStep!.tempo[0] +
                                (symbolIdx / notation.length) * (currentStep!.tempo[1] - currentStep!.tempo[0]),
                            velocity:
                                currentStep!.dynamics[0] +
                                (symbolIdx / notation.length) * (currentStep!.dynamics[1] - currentStep!.dynamics[0]),
                            prevaction: _.last(timeline.sampleractions)
                        })
                        // Create one or more sampler action(s) for the new note or pattern
                        patternNoteActions.forEach((noteAction: PatternNoteAction, idx) => {
                            const lastPatternNote = idx == patternNoteActions.length - 1
                            const finalNote = endOfPosition && lastPatternNote
                            currNote[position] = {
                                ...noteAction,
                                ...{ action: pbAction.actionFunctions!.play!, isLast: finalNote }
                            }
                            if (finalNote)
                                // Extend the final note of the current position
                                currNote[position].duration = TOplusNumber(
                                    currNote[position].duration,
                                    millis2BaseNoteEquiv(outro, currentStep!.tempo[1])
                                )
                            if (patternNoteActions.length > 1) debug(`PATTERN=${JSON.stringify(currNote[position])}`)
                            prevNote[position] = currNote[position]
                            timeline.sampleractions.push(currNote[position])
                            // }
                        })
                        symbolDuration =
                            TO2n(TOplusTO(currNote[position]!.time, currNote[position]!.duration)) - currTime
                    }
                }
                if (position == 'UGAL') debug(`CURRNOTE: ${JSON.stringify(currNote)}`)

                // CREATE ANIMATION CURSOR ACTION

                if (pbAction.actionFunctions!.playercursor) {
                    timeline.playercursoractions.push({
                        action: pbAction.actionFunctions!.playercursor,
                        time: n2TO(currTime),
                        sysuuid: currentStep!.system.uuid,
                        section: currentStep!.sectionIdx,
                        position: position,
                        symbol: symbol,
                        line: 0,
                        range: [cursorPos, cursorPos + symbol.length]
                    })
                }
                cursorPos += symbol.length
                currTime += symbolDuration
                prevSymbol = symbol
            })
            maxMeasureDuration = Math.max(currTime - sectionStartTime, maxMeasureDuration)
        }

        // CREATE EDITOR CURSOR ACTIONS

        // Only one cursor action per system is needed.
        if (pbAction.actionFunctions.editorcursor) {
            var cursorTime = sectionStartTime
            timeline.editorcursoractions.push({
                action: pbAction.actionFunctions.editorcursor,
                time: n2TO(cursorTime),
                prevsysuuid: prevSystem?.uuid || undefined,
                sysuuid: currentStep.system.uuid,
                section: currentStep.sectionIdx
            })
        }
        prevSystem = currentStep.system
        currentStep = nextInFlow()
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
