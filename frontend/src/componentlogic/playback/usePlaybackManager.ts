// Contains functions that enable to convert a notation to scheduled playback actions.
// These actions consists of audio playback, instrument animation and/or cursor movements.
//
// This module contains two main functions:
// createTimelineFromScore: Creates a TimeLine object which contains separate lists of
// action objects for each type of playback action.
//
// createPlaybackSchedule:
// Creates events in the schedule of the Tone.Transport object, based on the TimeLine's actions.

import { NoteObject } from '@tabuhstudio/shared'
import { KEMPLI_BEAT_CHAR, SPACE_CHAR } from '@tabuhstudio/shared'
import _ from 'lodash'
import { createElement, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { ReactElement } from 'rsuite/esm/internals/types'
import * as Tone from 'tone'
import {
    defaultBeatFrequency,
    defaultIntroTime,
    defaultOutroTime,
    defaultTempo,
    dynamicsToNumber,
    noteConfigs,
    positionConfigs
} from '../../config/config'
import type { BPM, Position } from '../../typing/basetypes'
import type { FlowStep } from '../../typing/execution'
import { speedDefaultOption } from '../../typing/interface'
import type {
    AnimationNote,
    GenericAction,
    PlaybackAction,
    PlaybackAnimationAction,
    PlaybackCallbackFunctions,
    PlaybackDashboardAction,
    PlaybackEditorCursorAction,
    PlaybackPlayerCursorAction,
    PlaybackSamplerAction,
    PlaybackTempoAction,
    TempoFunctionParameters,
    TimeLine
} from '../../typing/playback'
import type { Note, Score, System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { getSystemDuration } from '../../utils/objectUtils'
import { BaseNoteEquiv2Millis, millis2BaseNoteEquiv, n2TO, To2Millis, TO2n, TOplusNumber } from '../../utils/timeunits'
import { cycleValidation } from '../validationManager'
import { executionManager } from './executionManager'
import { createNoteActions, noteDuration } from './strokeManager'
import { useInstruments } from './useInstruments'

// Most of the playback functions will be provided by the PlayerWindow and EditorWindow elements.
export const defaultCallbackFunctions: PlaybackCallbackFunctions = {
    tempo: (): void => {},
    play: (): void => {
        debug('void player')
    },
    animate: (): void => {},
    playercursor: (): void => {},
    editorcursor: (): void => {},
    updatedashboard: (): void => {},
    progress: (): void => {},
    generic: (): void => {}
}
export interface SchedulePlaybackParams {
    pbAction: PlaybackAction
    useCache?: boolean
    intro?: number
    outro?: number
}

export function usePlaybackManager(focusRef: RefObject<Position[]>, activePanggulRef: RefObject<Position[]>) {
    const { playInstrument } = useInstruments(focusRef, activePanggulRef, 0)
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(speedDefaultOption.objValue as number)
    const [totalDurationMs, setTotalDurationMs] = useState<number>(0)
    const [timeLine, setTimeline] = useState<TimeLine>({} as TimeLine)
    const [playbackProgress, setPlaybackProgress] = useState<number>(0)
    const [playbackTempo, setPlaybackTempo] = useState<number>(60)

    var tempoLookup: Record<number, Record<number, number>> = {}

    // Use a ref object to avoid playbackFunctions being reset to defaultPlaybackFunctions. I don't understand why this happens.
    const pbFunctionsRef: RefObject<PlaybackCallbackFunctions> =
        useRef<PlaybackCallbackFunctions>(defaultCallbackFunctions)

    useEffect(() => {
        updatePlaybackCallbackFunctions({ tempo: changeTempo, play: playInstrument, progress: updateProgress })
    }, [])

    useEffect(() => {
        // Immediately change tempo when playback speed is changed by the user.
        // Tempo changes that are scheduled to fire after the current time
        // will take the new playback speed into account.
        Tone.getTransport().bpm.value = playbackTempo * playbackSpeed
    }, [playbackSpeed])

    // Callback function for the playback scheduler
    const changeTempo = useCallback(
        (time: number, params: TempoFunctionParameters): void => {
            if (params.bpm != undefined) {
                Tone.getTransport().bpm.setValueAtTime(params.bpm * params.pbSpeed, time)
                setPlaybackTempo(params.bpm)
            }
        },
        [playbackSpeed]
    )

    const updateProgress = useCallback(() => {
        setPlaybackProgress(Tone.getTransport().seconds)
        Tone.getTransport()
    }, [])

    const updatePlaybackCallbackFunctions = useCallback((functions: Partial<PlaybackCallbackFunctions>) => {
        pbFunctionsRef.current = { ...pbFunctionsRef.current, ...functions }
    }, [])

    const samplerAction2AnimationNotes = (position: Position, action: PlaybackSamplerAction): AnimationNote[] => {
        if (!(position in positionConfigs)) return []
        const shorthandCodes = positionConfigs[position].symbolToNoteNames[action.params.note.canonicalSymbol] || []
        const result: AnimationNote[] = []
        shorthandCodes.forEach((shCode) => {
            const instrType: string = positionConfigs[position].type
            if (!shCode) return null
            const note: Note = noteConfigs[instrType][shCode]
            const keyname: string = `${note.tone}${note.octave != null ? note.octave : ''}`
            result.push({
                time: action.time,
                keyname: keyname,
                tone: note.tone,
                stroke: note.stroke,
                muting: note.muting,
                duration: action.params.duration,
                isLast: action.params.isLast
            })
        })
        return result
    }

    function getNotationParagraphs(score: Score): Partial<Record<Position, ReactElement[]>> {
        const notation: Partial<Record<Position, ReactElement[]>> = {}
        for (const position of score.positions) {
            const posNotation: ReactElement[] = []
            for (const system of score.systems) {
                var line: string
                if (position in system.staffs) {
                    line = system.staffs[position]!.objNotation.map((note) => note.toString()).join('')
                } else {
                    // Position not present: fill with spaces matching first staff length
                    const firstStaff = Object.values(system.staffs)[0]
                    line = SPACE_CHAR.repeat(firstStaff?.objNotation.length ?? 0)
                }

                posNotation.push(
                    createElement(
                        'p',
                        {
                            key: `${position}-${system.index}`,
                            id: `${position}-${system.index}`,
                            className:
                                'appearance-none p-[0px] m-0 text-sm/6 balifont wrap-break-word break-all whitespace-normal'
                        },
                        line
                    )
                )
            }
            notation[position] = posNotation
        }
        return notation
    }

    // Returns the tempo at the given relative time from the start of the current section in TimeObject units.
    function tempoAt(timeFromSectionStartInTO: number, currentStep: FlowStep) {
        if (currentStep.id in tempoLookup && timeFromSectionStartInTO in tempoLookup[currentStep.id])
            return tempoLookup[currentStep.id][timeFromSectionStartInTO]
        if (!(currentStep.id in tempoLookup)) tempoLookup[currentStep.id] = []

        const [startTempo, endTempo] = currentStep.tempo
        if (timeFromSectionStartInTO > currentStep.duration) {
            console.error('Requesting tempo outside of current measure.')
        }
        if (startTempo == endTempo) {
            tempoLookup[currentStep.id][timeFromSectionStartInTO] = startTempo
        } else {
            // Gradual change
            tempoLookup[currentStep.id][timeFromSectionStartInTO] =
                startTempo + (timeFromSectionStartInTO / currentStep.duration) * (endTempo - startTempo)
        }
        return tempoLookup[currentStep.id][timeFromSectionStartInTO]
    }

    function extendLastSamplerAction(action: PlaybackSamplerAction | null | undefined, toDuration: number) {
        if (action && !action.ismuted) {
            action.params.duration = TOplusNumber(action.params.duration, toDuration)
        }
    }

    function setLastSamplerActionEndtime(action: PlaybackSamplerAction | null | undefined, toEndtime: number) {
        if (action && !action.ismuted) {
            action.params.duration = n2TO(toEndtime - TO2n(action.time))
        }
    }

    // Creates a timeline to play back (parts of) the score in the editor
    // useCache: if true, the unsaved (cached) user edits will be played back.
    function createTimelineFromScore(
        pbAction: PlaybackAction,
        useCache: boolean,
        intro: number = defaultIntroTime,
        outro: number = defaultOutroTime
    ): TimeLine | undefined {
        // Check that all necessary data is being passed
        if (!(pbAction.playbackType && pbAction.score && pbAction.systemIndex != undefined)) return undefined

        const validation = cycleValidation(pbAction.score)
        if (!validation.isValid) return undefined

        const newTimeLine: TimeLine = {
            playbackAction: pbAction,
            totalDurationMs: 0,
            totalDurationTO: n2TO(0),
            tempoactions: [],
            sampleractions: [],
            animationactions: [],
            playercursoractions: [],
            editorcursoractions: [],
            dashboardactions: [],
            genericactions: [],
            notation: {} as Record<Position, any>
        }

        // Reset all cached tempo values
        tempoLookup = {}

        const { nextInFlow } = executionManager(pbAction.score, pbAction.playbackType, pbAction.systemIndex)

        function nextNote(
            objNotation: NoteObject[],
            currIdx: number,
            pos: Position,
            useCache: boolean
        ): NoteObject | undefined {
            if (currIdx + 1 < objNotation.length) return objNotation[currIdx + 1]
            const nextStep = nextInFlow(true)
            if (nextStep && pos in nextStep.beats) {
                const sectionStaff = nextStep.beats[pos as Position]
                const sectionNotation =
                    useCache && sectionStaff?.objNotation_ ? sectionStaff.objNotation_ : sectionStaff?.objNotation
                return sectionNotation && sectionNotation.length > 0 ? sectionNotation[0] : undefined
            }
            return undefined
        }

        var prevSystem: System | undefined = undefined
        var currAction: Record<string, PlaybackSamplerAction | null> = Object.fromEntries(
            Object.keys(positionConfigs).map((key) => [key, null])
        )
        var currentStep: FlowStep | undefined = nextInFlow()
        var introTempo: BPM = defaultTempo // Needed for initial animation action.
        if (!currentStep) return newTimeLine
        // Keeps track of the longest measure duration in a section. All measures in a system should have
        // the same length but in case they don't, this value will be used to resync the following system.
        var maxMeasureDuration: number = 0
        // const introTimeBn = Math.round(millis2BaseNoteEquiv(defaultIntroTime, 60))
        var beatStartTime: number = millis2BaseNoteEquiv(intro, introTempo)
        var beatStartTimeMs: number = intro

        // This dict will be used to create animation actions
        // @ts-ignore
        const samplerActionsByPos: Record<Position, PlaybackSamplerAction[]> = Object.fromEntries(
            _.keys(positionConfigs).map((key) => [key, []] as [Position, PlaybackSamplerAction[]])
        )
        var currentTempo = 0

        newTimeLine.totalDurationMs = intro

        while (currentStep) {
            const lastStep = nextInFlow(true) == undefined
            maxMeasureDuration = 0

            // CREATE TEMPO ACTION
            // Gradual changes will be implemented by changing the tempo at the start of each symbol in the measure.
            // first determine the max. measure length
            const [startTempo, endTempo] = currentStep.tempo
            if (startTempo == endTempo) {
                if (currentStep.tempo[0] != currentTempo) {
                    // Immediate change
                    const newTempo = startTempo
                    newTimeLine.tempoactions.push({
                        time: n2TO(beatStartTime),
                        params: { bpm: newTempo, pbSpeed: playbackSpeed }
                    })
                    currentTempo = newTempo
                }
            } else {
                // Gradual change
                for (var t = 0; t < currentStep.duration; t++) {
                    const newTempo = startTempo + (t / currentStep.duration) * (endTempo - startTempo)
                    if (newTempo != currentTempo) {
                        newTimeLine.tempoactions.push({
                            time: n2TO(beatStartTime + t),
                            params: { bpm: newTempo, pbSpeed: playbackSpeed }
                        })
                        currentTempo = newTempo
                    }
                }
            }

            // All vertically aligned notes (=column) should start simultaneously.
            // The note with the longest duration determines the duration of a column.
            const beatNotationArrays = _.values(currentStep.beats).map((s) =>
                useCache ? (s.objNotation_ ?? s.objNotation) : s.objNotation
            )
            const columnCount = Math.max(...beatNotationArrays.map((n) => n.length))
            const columnDurations: number[] = []
            const columnDurationsMs: number[] = []
            let cumDuration = 0
            for (let col = 0; col < columnCount; col++) {
                const colTempo = tempoAt(cumDuration, currentStep!)
                // when calculating the column duration, space characters get a zero duration.
                // But if the entire column consists of space characters, the column gets length 1.
                let colDuration =
                    Math.max(
                        ...beatNotationArrays.map((notation) =>
                            col >= notation.length || notation[col].canonicalSymbol == SPACE_CHAR
                                ? 0
                                : noteDuration(notation[col], colTempo, 'basenote')
                        )
                    ) || 1
                columnDurations.push(colDuration)
                columnDurationsMs.push(To2Millis(n2TO(colDuration), colTempo))
                cumDuration += colDuration
            }
            var maxEndTime = 0
            var maxEndTimeMs = 0
            for (const position of currentStep.positions) {
                if (position == 'KEMPLI' && currentStep.system.kempli.state != 'notation') {
                    // Kempli will be generated separately based on 'on' or 'off' state.
                    break
                }

                var currTime: number = beatStartTime
                var currTimeMs = beatStartTimeMs

                newTimeLine.notation[position] = []
                const sectionStaff = currentStep.beats[position]
                var objNotation: NoteObject[] =
                    (useCache && sectionStaff?.objNotation_ ? sectionStaff.objNotation_ : sectionStaff?.objNotation) ??
                    Array(4).fill(new NoteObject(SPACE_CHAR, position))
                var prevNote: NoteObject | undefined = undefined

                objNotation.forEach((note: NoteObject, noteIdx) => {
                    const endOfMeasure = noteIdx == objNotation.length - 1
                    const waitTimeAfter = endOfMeasure
                        ? millis2BaseNoteEquiv(currentStep!.waitMsAfter, currentStep!.tempo[1])
                        : 0
                    // const endOfPosition = currentStep!.lastSystem && currentStep!.lastBeat && endOfMeasure

                    // CREATE SAMPLER ACTION
                    // Determine the default duration for a single base note.
                    // Add the given delay time if we reached the last note of the measure.
                    if (noteIdx == 0) {
                        // Start of new measure: extend the last note until the current time. This ensures that
                        // if the previous measure was incomplete, it gets extended to the length of the beat
                        // to which it belongs.
                        setLastSamplerActionEndtime(currAction[position], currTime)
                    }
                    if (note.isExtensionSilence && currAction[position]) {
                        // Extend the last note of the current position with one basenote duration.
                        extendLastSamplerAction(currAction[position], columnDurations[noteIdx] + waitTimeAfter)
                    } else if (note.isMutingSilence) {
                        if (currAction[position]) currAction[position].ismuted = true
                    } else {
                        // Convert potential motifs to individual note sampler actions.
                        const motifNoteActions: PlaybackSamplerAction[] = createNoteActions({
                            samplerFunction: pbFunctionsRef.current.play,
                            time: currTime,
                            timeMs: currTimeMs,
                            measureIdx: currentStep!.beatIdx,
                            position,
                            prevnote: prevNote,
                            note: note,
                            nextnote: nextNote(objNotation, noteIdx, position, useCache),
                            bpm:
                                currentStep!.tempo[0] +
                                (noteIdx / objNotation.length) * (currentStep!.tempo[1] - currentStep!.tempo[0]),
                            velocity:
                                currentStep!.dynamics[0] +
                                (noteIdx / objNotation.length) * (currentStep!.dynamics[1] - currentStep!.dynamics[0]),
                            prevaction: _.last(newTimeLine.sampleractions),
                            isLast: lastStep && endOfMeasure
                        })
                        // Update note's duration
                        // and push the note in the `sampleractions` array.
                        motifNoteActions.forEach((noteAction: PlaybackSamplerAction, idx) => {
                            currAction[position] = noteAction
                            if (endOfMeasure && noteAction.params.isLastOfMotif && currentStep!.waitMsAfter) {
                                // Extend the last note of the section with wait time if it is indicated in the score.
                                currAction[position].params.duration = TOplusNumber(
                                    currAction[position].params.duration,
                                    millis2BaseNoteEquiv(currentStep!.waitMsAfter, currentStep!.tempo[1])
                                )
                            }
                            if (noteAction.params.isLast)
                                // Extend the final note of the current position with outro time
                                currAction[position].params.duration = TOplusNumber(
                                    currAction[position].params.duration,
                                    millis2BaseNoteEquiv(outro, currentStep!.tempo[1])
                                )
                            newTimeLine.sampleractions.push(currAction[position])
                            samplerActionsByPos[position].push(currAction[position])
                        })
                        if (waitTimeAfter > 0 && currAction[position]) {
                            extendLastSamplerAction(currAction[position], waitTimeAfter)
                        }
                    }
                    /** DEBUG */
                    var [prevCurrTime, prevCurrTimeMs] = [currTime, currTimeMs]
                    currTime += columnDurations[noteIdx] + waitTimeAfter
                    currTimeMs += columnDurationsMs[noteIdx] + (waitTimeAfter > 0 ? currentStep!.waitMsAfter : 0)
                    if (position == 'PEMADE_POLOS' && waitTimeAfter)
                        debug(
                            `time ${JSON.stringify(prevCurrTime)} -> ${JSON.stringify(currTime)}  timeMs ${prevCurrTimeMs} -> ${currTimeMs} waittime=${waitTimeAfter} waittimeMs=${currentStep!.waitMsAfter} tempo=${JSON.stringify(currentStep?.tempo)}`
                        )
                    /** END DEBUG */
                    prevNote = note
                })
                // CREATE PLAYER NOTATION CURSOR ACTION (CURSOR HIGHLIGHTS ENTIRE MEASURE)

                var cursorStart = 0
                var cursorWidth = 0
                if (position in currentStep.system.staffs) {
                    // Character offset = start index of current section in the flat notation
                    const beatIdx = currentStep!.beatIdx
                    const noteIdx = currentStep.beatSlices[beatIdx]
                    const posNotation = currentStep.system.staffs[position]!.notation
                    const notationBeforeCursor = noteIdx.start
                        ? posNotation.slice(0, Math.min(noteIdx.start, posNotation.length))
                        : []

                    cursorStart = notationBeforeCursor.map((note) => note.toString()).join('').length
                    cursorWidth = objNotation.map((note) => note.toString()).join('').length
                    newTimeLine.playercursoractions.push(
                        ...[
                            // Highlight on
                            {
                                functionName: 'playercursor',
                                time: n2TO(beatStartTime),
                                params: {
                                    sysuuid: currentStep!.system.uuid,
                                    beat: currentStep!.beatIdx,
                                    position: position,
                                    line: currentStep!.system.index,
                                    range: [cursorStart, cursorStart + cursorWidth]
                                }
                            },
                            // Highlight off
                            {
                                functionName: 'playercursor',
                                time: n2TO(currTime),
                                params: {
                                    sysuuid: currentStep!.system.uuid,
                                    beat: currentStep!.beatIdx,
                                    position: position,
                                    line: currentStep!.system.index,
                                    range: [0, 0]
                                }
                            }
                        ]
                    )
                }

                maxMeasureDuration = Math.max(currTime - beatStartTime, maxMeasureDuration)
                maxEndTime = currTime > maxEndTime ? currTime : maxEndTime
                maxEndTimeMs = currTimeMs > maxEndTimeMs ? currTimeMs : maxEndTimeMs
            }

            // CREATE EDITOR CURSOR ACTION

            var cursorTime = beatStartTime
            newTimeLine.editorcursoractions.push({
                time: n2TO(cursorTime),
                params: {
                    prevSysUuid: prevSystem?.uuid || undefined,
                    cursor: {
                        sysUuid: currentStep.system.uuid,
                        beatSlice: currentStep.beatSlices[currentStep.beatIdx],
                        lastColumn: currentStep.beatSlices.length
                            ? currentStep.beatSlices[currentStep.beatSlices.length - 1].end
                            : 0
                    }
                }
            })

            // CREATE DASHBOARD ACTION

            newTimeLine.dashboardactions.push({
                time: n2TO(cursorTime),
                params: {
                    system: currentStep.system.id,
                    pass: currentStep.pass,
                    iteration: currentStep.iteration,
                    tempo: currentStep.tempo[0],
                    dynamics: currentStep.dynamics[0]
                }
            })

            // CREATE KEMPLI ACTION

            // Generate kempli actions once at the start of the system.
            // Note: the tempo is currently only used for rake motifs
            // which should not be used in combination with implicit kempli beats
            const systemDuration = getSystemDuration(currentStep.system, currentStep.tempo[0])
            if (
                currentStep.beatIdx == 0 &&
                currentStep.system.kempli.state == 'on' &&
                currentStep.system.kempli.frequency != undefined
            ) {
                for (
                    var beatOffset = 0;
                    beatOffset < systemDuration;
                    beatOffset += currentStep.system.kempli.frequency || defaultBeatFrequency
                ) {
                    const strokeNoteActions: PlaybackSamplerAction[] = createNoteActions({
                        samplerFunction: pbFunctionsRef.current.play,
                        time: beatStartTime + beatOffset, // Note that this is equal to the system start
                        // The tempo given for the following calculation is not precise
                        // but this is irrelevent because there is no kempli animation
                        timeMs: BaseNoteEquiv2Millis(beatStartTime + beatOffset, currentStep.tempo[0]),
                        measureIdx: currentStep!.beatIdx,
                        position: 'KEMPLI',
                        prevnote: undefined,
                        note: new NoteObject(KEMPLI_BEAT_CHAR, 'KEMPLI'),
                        nextnote: undefined,
                        // The tempo is not precise but irrelevant for single notes
                        bpm: currentStep.tempo[0],
                        velocity: dynamicsToNumber['mf'],
                        prevaction: undefined,
                        isLast: lastStep && beatOffset + currentStep.system.kempli.frequency! > systemDuration
                    })
                    // createNoteActions always returns an array containing 1 or more actions
                    if (strokeNoteActions) {
                        newTimeLine.sampleractions.push(...strokeNoteActions)
                    } else {
                        console.log('what`s going on here?')
                    }
                }
            }

            beatStartTime = maxEndTime
            beatStartTimeMs = maxEndTimeMs
            prevSystem = currentStep.system
            currentStep = nextInFlow()
        }

        // Note that `beatStartTime` is now equal to maxEndTime
        newTimeLine.totalDurationTO = n2TO(beatStartTime)
        newTimeLine.totalDurationMs = beatStartTimeMs

        // CREATE ANIMATION ACTIONS FROM THE SAMPLER ACTIONS
        _.keys(samplerActionsByPos).forEach((pos) => {
            const position = pos as Position
            const samplerActions: PlaybackSamplerAction[] = samplerActionsByPos[position]
            // Add an animation action for the displacement of the panggul
            // from the starting position to the first note
            if (!samplerActions || samplerActions.length == 0) return
            newTimeLine.animationactions.push({
                time: n2TO(0),
                params: {
                    position: position,
                    currnotes: [],
                    nextnotes: samplerAction2AnimationNotes(position, samplerActions[0]),
                    timeuntilMs: samplerActions[0].timeMs
                }
            })

            samplerActions.forEach((action, index) => {
                const currIsLast: boolean = index == samplerActions.length - 1
                const aNotes: AnimationNote[] = samplerAction2AnimationNotes(position, samplerActions[index])
                const nextAction = currIsLast ? undefined : samplerActions[index + 1]
                const nextANotes: AnimationNote[] = currIsLast
                    ? []
                    : samplerAction2AnimationNotes(position, samplerActions[index + 1])
                const timeUntilMs: number = currIsLast ? outro : nextAction!.timeMs - action!.timeMs

                const animationAction = {
                    time: action.time,
                    params: { position: position, currnotes: aNotes, nextnotes: nextANotes, timeuntilMs: timeUntilMs }
                }
                if (
                    position == 'PEMADE_POLOS' &&
                    TO2n(action.params.duration) >= 3 &&
                    action.params.note.canonicalSymbol == 'a,' &&
                    143 < TO2n(action.time) &&
                    TO2n(action.time) < 148
                ) {
                    debug('--')
                    debug(action)
                    debug(nextAction)
                }
                newTimeLine.animationactions.push(animationAction)
            })
        })

        // ADD DASHBOARD ACTION TO SWITCH OFF THE DASHBOARD PLAYBACK ITEM
        newTimeLine.dashboardactions.push({
            time: newTimeLine.totalDurationTO,
            params: { system: undefined, pass: 0, iteration: 0, tempo: 0, dynamics: 0 }
        })

        // Determine the total playback duration
        setTotalDurationMs(newTimeLine.totalDurationMs)
        newTimeLine.genericactions.push({ time: newTimeLine.totalDurationTO, params: {} })

        newTimeLine.notation = getNotationParagraphs(pbAction.score!)
        return newTimeLine
    }

    function createPlaybackSchedule(timeLine: TimeLine | undefined, pbSpeed: number = 1) {
        // Creates the schedule for the Transport object.
        if (!timeLine) return

        Tone.getTransport().stop()
        Tone.getTransport().cancel()
        Tone.getTransport().seconds = 0

        //Instrument sampler actions (notes)
        timeLine.sampleractions.forEach((action: PlaybackSamplerAction) => {
            Tone.getTransport().schedule((time) => pbFunctionsRef.current.play(time, action.params), action.time)
        })

        // Tempo actions
        // Set the initial tempo to 60 (intro time)
        const tAction: PlaybackTempoAction = { time: { '16n': 0 }, params: { bpm: defaultTempo, pbSpeed: pbSpeed } }
        Tone.getTransport().schedule((time) => pbFunctionsRef.current.tempo(time, tAction.params), tAction.time)
        timeLine.tempoactions.forEach((action: PlaybackTempoAction) => {
            Tone.getTransport().schedule((time) => pbFunctionsRef.current.tempo(time, action.params), action.time)
        })

        // Animation actions
        timeLine.animationactions.forEach((action: PlaybackAnimationAction) => {
            Tone.getTransport().schedule((time) => pbFunctionsRef.current.animate(time, action.params), action.time)
        })

        // Player Cursor actions
        timeLine.playercursoractions.forEach((action: PlaybackPlayerCursorAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.playercursor(time, action.params),
                action.time
            )
        })

        // Editor Cursor actions
        timeLine.editorcursoractions.forEach((action: PlaybackEditorCursorAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.editorcursor(time, action.params),
                action.time
            )
        })

        // Dashboard actions
        timeLine.dashboardactions.forEach((action: PlaybackDashboardAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.updatedashboard(time, action.params),
                action.time
            )
        })

        // Action for when end of schedule is reached
        timeLine.genericactions.forEach((action: GenericAction) => {
            Tone.getTransport().schedule((time) => pbFunctionsRef.current.generic(time, action.params), action.time)
        })

        // Schedule a progress counter
        Tone.getTransport().scheduleRepeat((time) => updateProgress(), '2hz', 0)
    }

    function schedulePlayback({
        pbAction,
        useCache = true,
        intro = defaultIntroTime,
        outro = defaultOutroTime
    }: SchedulePlaybackParams): void {
        const newTimeLine = createTimelineFromScore(pbAction, useCache, intro, outro)
        if (newTimeLine) {
            createPlaybackSchedule(newTimeLine, playbackSpeed)
            setTimeline(newTimeLine)
        }
    }

    return {
        timeLine,
        updatePlaybackCallbackFunctions,
        playbackProgress,
        setPlaybackProgress,
        playbackSpeed,
        setPlaybackSpeed,
        schedulePlayback,
        totalDurationMs
    }
}
