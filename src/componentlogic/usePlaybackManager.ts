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
import { useEffect, useRef, useState, type RefObject } from 'react'
import * as Tone from 'tone'
import type { TimeObject } from 'tone/build/esm/core/type/Units'
import { defaultIntroTime, defaultOutroTime, defaultTempo, noteConfigs, positionConfigs } from '../config/config'
import { isExtension, isMuting } from '../config/configfunctions'
import type {
    AnimationNote,
    EditorSystem,
    GenericAction,
    Note,
    NoteSymbol,
    PlaybackAnimationAction,
    PlaybackCallbackFunctions,
    PlaybackEditorCursorAction,
    PlaybackPlayerCursorAction,
    PlaybackSamplerAction,
    PlaybackTempoAction,
    Position,
    TempoFunctionParameters,
    TimeLine
} from '../typing/types'
import { cleanSymbol } from '../utils/alphabet'
import { debug } from '../utils/debugger'
import { defaultObject } from '../utils/objectUtils'
import { speedDefaultOption } from '../utils/selectorsUtils'
import { millis2BaseNoteEquiv, n2TO, To2Millis, TO2n, TOminusTO, TOplusNumber, TOplusTO } from '../utils/timeunits'
import { executionManager, type FlowStep } from './executionManager'
import { createNoteActions, totalDuration } from './patternManager'
import type { PlaybackAction } from './playbackReducer'
import { useInstruments } from './useInstruments'
import { cycleValidation } from './validationManager'

// Most of the playback functions will be provided by the PlayerWindow and EditorWindow elements.
export const defaultCallbackFunctions: PlaybackCallbackFunctions = {
    tempo: (): void => {},
    play: (): void => {
        debug('void player')
    },
    animate: (): void => {},
    playercursor: (): void => {},
    editorcursor: (): void => {},
    generic: (): void => {}
}
export interface SchedulePlaybackParams {
    pbAction: PlaybackAction
    useCache?: boolean
    intro?: number
    outro?: number
}

export function usePlaybackManager(selectedFocus: Position[]) {
    const { playInstrument } = useInstruments(selectedFocus, 0)
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(speedDefaultOption.value as number)
    const [totalDurationMs, setTotalDurationMs] = useState<number>(0)
    const [timeLine, setTimeline] = useState<TimeLine>({} as TimeLine)

    // Use a ref object to avoid playbackFunctions being reset to defaultPlaybackFunctions. I don't understand why this happens.
    const pbFunctionsRef: RefObject<PlaybackCallbackFunctions> =
        useRef<PlaybackCallbackFunctions>(defaultCallbackFunctions)

    useEffect(() => {
        updatePlaybackCallbackFunctions({ tempo: changeTempo, play: playInstrument })
        debug('setting play function')
    }, [])

    function changeTempo(time: number, params: TempoFunctionParameters): void {
        if (params.bpm != undefined) {
            Tone.getTransport().bpm.setValueAtTime(params.bpm * params.pbSpeed, time)
        }
    }

    // The
    function updatePlaybackCallbackFunctions(functions: Partial<PlaybackCallbackFunctions>) {
        debug(`UPDATING PB FUNCTIONS ${Object.keys(functions)} new pbFunctions: }`)
        debug({ ...pbFunctionsRef.current, ...functions })
        pbFunctionsRef.current = { ...pbFunctionsRef.current, ...functions }
    }
    const samplerAction2AnimationNotes = (position: Position, action: PlaybackSamplerAction): AnimationNote[] => {
        if (!(position in positionConfigs)) return []
        if (!action) debug(`samplerAction2AnimationNotes ${position} ${action}`)
        const cleanedSymbol = cleanSymbol(action.params.symbol)
        const shorthandCodes = positionConfigs[position].symbolToNoteNames[cleanedSymbol] || []
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

    // Creates a timeline to play back (parts of) the score in the editor
    // useCache: if true, the unsaved (cached) user edits will be played back.
    function createTimelineFromScore(
        pbAction: PlaybackAction,
        useCache: boolean,
        intro: number = defaultIntroTime,
        outro: number = defaultOutroTime
    ): TimeLine | undefined {
        // Check that all necessary data is being passed
        debug(
            `creating timeline ${pbAction.playbackType} totSystems=${pbAction.score?.systems.length} startAtIndex=${pbAction.systemIndex} in/out=${JSON.stringify([intro, outro])}`
        )
        if (!(pbAction.playbackType && pbAction.score && pbAction.systemIndex != undefined)) return undefined

        const validation = cycleValidation(pbAction.score, true)
        if (!validation.isValid) return undefined

        const timeline: TimeLine = {
            totalDurationMs: 0,
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
        var currAction: Record<string, PlaybackSamplerAction | null> = Object.fromEntries(
            Object.keys(positionConfigs).map((key) => [key, null])
        )
        var prevNote = { ...currAction }
        var currentStep: FlowStep | undefined = nextInFlow()
        if (!currentStep) return timeline
        // Keeps track of the longest measure duration in a section. All measures in a system should have
        // the same length but in case they don't, this value will be used to resync the following system.
        var maxMeasureDuration: number = 0
        // const introTimeBn = Math.round(millis2BaseNoteEquiv(defaultIntroTime, 60))
        var sectionStartTime: number = millis2BaseNoteEquiv(intro, currentStep.tempo[0])

        // This dict will be used to create animation actions
        // @ts-ignore
        const samplerActionsByPos: Record<Position, PlaybackSamplerAction[]> = Object.fromEntries(
            _.keys(positionConfigs).map((key) => [key, []] as [Position, PlaybackSamplerAction[]])
        )
        var currentTempo = 0

        while (currentStep) {
            maxMeasureDuration = 0

            // CREATE TEMPO ACTION
            // Gradual changes will be implemented by changing the tempo at the start of each symbol in the measure.
            // first determine the max. measure length
            const [startTempo, endTempo] = currentStep.tempo
            const sectionDuration = Object.entries(currentStep.measures).reduce(
                (maxDur, [position, measure]) =>
                    Math.max(maxDur, totalDuration(measure.notation, position as Position, startTempo, 'basenote')),
                0
            )
            if (startTempo == endTempo) {
                if (currentStep.tempo[0] != currentTempo) {
                    // Immediate change
                    const newTempo = startTempo
                    timeline.tempoactions.push({
                        time: n2TO(sectionStartTime),
                        function: pbFunctionsRef.current.tempo,
                        params: { bpm: newTempo, pbSpeed: playbackSpeed }
                    })
                    currentTempo = newTempo
                }
            } else {
                // Gradual change
                for (var t = 0; t < sectionDuration; t++) {
                    const newTempo = startTempo + (t / sectionDuration) * (endTempo - startTempo)
                    if (newTempo != currentTempo) {
                        timeline.tempoactions.push({
                            time: n2TO(sectionStartTime + t),
                            function: pbFunctionsRef.current.tempo,
                            params: { bpm: newTempo, pbSpeed: playbackSpeed }
                        })
                        currentTempo = newTempo
                    }
                }
            }

            for (const position of currentStep.positions) {
                var currTime: number = sectionStartTime
                var cursorPos: number = 0
                timeline.notation[position] = []
                const measure = currentStep.measures[position]
                var notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
                if (!notation) notation = Array(4).fill(defaultObject('JsonSymbol'))
                var prevSymbol: NoteSymbol | undefined = undefined

                notation.forEach((symbol: NoteSymbol, symbolIdx) => {
                    var symbolDuration = 1 // This is the default duration for a note or silence
                    const endOfPosition =
                        currentStep!.lastSystem && currentStep!.lastSection && symbolIdx == notation.length - 1

                    // CREATE SAMPLER ACTION

                    if (isExtension(symbol)) {
                        if (currAction[position])
                            currAction[position].params.duration = TOplusNumber(currAction[position].params.duration, 1)
                        symbolDuration = 1
                    } else if (isMuting(symbol)) {
                        symbolDuration = 1
                    } else {
                        // Convert potential patterns to individual note actions.
                        const patternNoteActions: PlaybackSamplerAction[] = createNoteActions({
                            samplerFunction: pbFunctionsRef.current.play,
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
                            prevaction: _.last(timeline.sampleractions),
                            isLast: endOfPosition
                        })
                        // Create one or more sampler action(s) for the new note or pattern
                        patternNoteActions.forEach((noteAction: PlaybackSamplerAction, idx) => {
                            currAction[position] = noteAction
                            if (noteAction.params.isLast)
                                // Extend the final note of the current position
                                currAction[position].params.duration = TOplusNumber(
                                    currAction[position].params.duration,
                                    millis2BaseNoteEquiv(outro, currentStep!.tempo[1])
                                )
                            prevNote[position] = currAction[position]
                            timeline.sampleractions.push(currAction[position])
                            samplerActionsByPos[position].push(currAction[position])
                        })
                        symbolDuration =
                            TO2n(TOplusTO(currAction[position]!.time, currAction[position]!.params.duration)) - currTime
                    }

                    // // CREATE ANIMATION CURSOR ACTION
                    // const sysUuid = currentStep!.system.uuid
                    // const sectionIdx = currentStep!.sectionIdx
                    // const newSystem = currentStep!.system != prevSystem
                    // const newSection = symbolIdx == 0
                    // const lastNoteOfSection = symbolIdx == notation.length - 1

                    // if (newSection) currentline += ' '
                    // const range = [currentline.length, currentline.length + symbol.s.length]
                    // currentline += symbol.s

                    // timeline.playercursoractions.push({
                    //     function: pbFunctionsRef.current.playercursor,
                    //     time: n2TO(currTime),
                    //     params: {
                    //         sysuuid: currentStep!.system.uuid,
                    //         section: currentStep!.sectionIdx,
                    //         position: position,
                    //         symbol: symbol,
                    //         line: 0,
                    //         range: [cursorPos, cursorPos + symbol.length]
                    //     }
                    // })
                    // if (lastNoteOfSection) {
                    //     timeline.notation[position].push(
                    //         createElement(
                    //             'p',
                    //             {
                    //                 key: line,
                    //                 id: `notation-${line}`,
                    //                 className: 'appearance-none p-[0px] m-0 text-sm/6 balifont'
                    //             },
                    //             currentline
                    //         )
                    //     )
                    //     currentline = ''
                    //     line++
                    // }

                    cursorPos += symbol.length
                    currTime += symbolDuration
                    prevSymbol = symbol
                })
                maxMeasureDuration = Math.max(currTime - sectionStartTime, maxMeasureDuration)
            }

            // CREATE EDITOR CURSOR ACTIONS

            // Only one cursor action per system is needed.
            var cursorTime = sectionStartTime
            timeline.editorcursoractions.push({
                function: pbFunctionsRef.current.editorcursor,
                time: n2TO(cursorTime),
                params: {
                    prevsysuuid: prevSystem?.uuid || undefined,
                    sysuuid: currentStep.system.uuid,
                    section: currentStep.sectionIdx
                }
            })
            prevSystem = currentStep.system
            currentStep = nextInFlow()
            sectionStartTime += maxMeasureDuration
        }
        // CREATE ANIMATION ACTIONS

        _.keys(samplerActionsByPos).forEach((pos) => {
            const position = pos as Position
            const actions: PlaybackSamplerAction[] = samplerActionsByPos[position]
            // Add an animation action for the displacement of the panggul
            // from the starting position to the first note
            if (!actions || actions.length == 0) return
            timeline.animationactions.push({
                function: pbFunctionsRef.current.animate,
                time: n2TO(0),
                params: {
                    position: position,
                    currnotes: [],
                    nextnotes: samplerAction2AnimationNotes(position, actions[1]),
                    timeuntil: actions[1].time,
                    timeuntilMs: To2Millis(actions[1].time, actions[0].params.bpm)
                }
            })

            actions.forEach((action, index) => {
                const currIsLast: boolean = index == actions.length - 1
                const aNotes: AnimationNote[] = samplerAction2AnimationNotes(position, actions[index])
                const nextAction = currIsLast ? undefined : actions[index + 1]
                const nextANotes: AnimationNote[] = currIsLast
                    ? []
                    : samplerAction2AnimationNotes(position, actions[index + 1])
                const timeUntil: TimeObject = currIsLast ? n2TO(1000) : TOminusTO(actions[index + 1].time, action.time)
                const timeUntilMs: number = currIsLast
                    ? outro
                    : To2Millis(nextAction!.time, nextAction!.params.bpm) - To2Millis(action!.time, action!.params.bpm)

                timeline.animationactions.push({
                    time: action.time,
                    function: pbFunctionsRef.current.animate,
                    params: {
                        position: position,
                        currnotes: aNotes,
                        nextnotes: nextANotes,
                        timeuntil: timeUntil,
                        timeuntilMs: timeUntilMs
                    }
                })
                timeline.totalDurationMs = Math.max(timeline.totalDurationMs, timeUntilMs + outro)
            })
        })

        // Determine the total playback duration
        timeline.totalDurationTO = n2TO(sectionStartTime)
        setTotalDurationMs(timeline.totalDurationMs)
        if (pbFunctionsRef.current.generic)
            timeline.genericactions.push({
                function: pbFunctionsRef.current.generic,
                time: timeline.totalDurationTO,
                params: {}
            })
        debug(timeline, true)
        return timeline
    }

    function createPlaybackSchedule(timeLine: TimeLine | undefined, pbSpeed: number = 1) {
        // Creates the schedule for the Transport object.
        if (!timeLine) return

        Tone.getTransport().stop()
        Tone.getTransport().cancel()
        Tone.getTransport().seconds = 0

        //Instrument sampler actions (notes)
        timeLine.sampleractions.forEach((action: PlaybackSamplerAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
        })

        // Tempo actions
        // Set the initial tempo to 60 (intro time)
        const tAction: PlaybackTempoAction = {
            time: { '16n': 0 },
            function: pbFunctionsRef.current.tempo,
            params: { bpm: defaultTempo, pbSpeed: pbSpeed }
        }
        Tone.getTransport().schedule((time) => tAction.function(time, tAction.params), tAction.time)
        timeLine.tempoactions.forEach((action: PlaybackTempoAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
        })

        // Animation actions
        timeLine.animationactions.forEach((action: PlaybackAnimationAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
        })

        // Player Cursor actions
        timeLine.playercursoractions.forEach((action: PlaybackPlayerCursorAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
        })

        // Editor Cursor actions
        timeLine.editorcursoractions.forEach((action: PlaybackEditorCursorAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
        })

        // Action for when end of schedule is reached
        timeLine.genericactions.forEach((action: GenericAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
        })
    }

    function schedulePlayback({
        pbAction,
        useCache = true,
        intro = defaultIntroTime,
        outro = defaultOutroTime
    }: SchedulePlaybackParams): void {
        const timeLine = createTimelineFromScore(pbAction, useCache, intro, outro)
        if (timeLine) {
            createPlaybackSchedule(timeLine, playbackSpeed)
            setTimeline(timeLine)
        }
    }

    return {
        timeLine,
        // playbackFunctions,
        updatePlaybackCallbackFunctions,
        playbackSpeed,
        setPlaybackSpeed,
        schedulePlayback,
        totalDurationMs
    }
}
