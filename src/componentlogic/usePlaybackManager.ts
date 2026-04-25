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
import { createElement, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { ReactElement } from 'rsuite/esm/internals/types'
import * as Tone from 'tone'
import { defaultIntroTime, defaultOutroTime, defaultTempo, noteConfigs, positionConfigs } from '../config/config'
import { isExtension, isMuting } from '../config/configfunctions'
import type { BPM, NoteSymbol } from '../typing/basetypes'
import type { Position } from '../typing/instruments'
import type {
    AnimationNote,
    GenericAction,
    PlaybackAction,
    PlaybackAnimationAction,
    PlaybackCallbackFunctions,
    PlaybackEditorCursorAction,
    PlaybackPlayerCursorAction,
    PlaybackSamplerAction,
    PlaybackTempoAction,
    TempoFunctionParameters,
    TimeLine
} from '../typing/playback'
import type { Note, Score, System } from '../typing/score'
import { cleanSymbol } from '../utils/alphabet'
import { debug } from '../utils/debugger'
import { defaultObject, same } from '../utils/objectUtils'
import { speedDefaultOption } from '../utils/selectorsUtils'
import {
    BaseNoteEquiv2Millis,
    millis2BaseNoteEquiv,
    n2TO,
    To2Millis,
    TO2n,
    TOplusNumber,
    TOplusTO
} from '../utils/timeunits'
import { executionManager, type FlowStep } from './executionManager'
import { createNoteActions, totalDuration } from './patternManager'
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
    progress: (): void => {},
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
    const [playbackProgress, setPlaybackProgress] = useState<number>(0)

    var tempoLookup: Record<number, Record<number, number>> = {}

    // Use a ref object to avoid playbackFunctions being reset to defaultPlaybackFunctions. I don't understand why this happens.
    const pbFunctionsRef: RefObject<PlaybackCallbackFunctions> =
        useRef<PlaybackCallbackFunctions>(defaultCallbackFunctions)

    useEffect(() => {
        updatePlaybackCallbackFunctions({ tempo: changeTempo, play: playInstrument, progress: updateProgress })
    }, [])

    const changeTempo = useCallback((time: number, params: TempoFunctionParameters): void => {
        if (params.bpm != undefined) {
            Tone.getTransport().bpm.setValueAtTime(params.bpm * params.pbSpeed, time)
        }
    }, [])

    const updateProgress = useCallback(() => {
        setPlaybackProgress(Tone.getTransport().seconds)
        Tone.getTransport()
    }, [])

    const updatePlaybackCallbackFunctions = useCallback((functions: Partial<PlaybackCallbackFunctions>) => {
        pbFunctionsRef.current = { ...pbFunctionsRef.current, ...functions }
    }, [])

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
            if (!note) console.log(`${shCode} ${position}`)
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
                    line = system.staffs[position]!.map((measure) => measure.notation.join('')).join(' ')
                } else {
                    line = system.colWidths.map((width) => ' '.repeat(width)).join(' ')
                }

                posNotation.push(
                    createElement(
                        'p',
                        {
                            key: `${position}-${system.index}`,
                            id: `${position}-${system.index}`,
                            className: 'appearance-none p-[0px] m-0 text-sm/6 balifont'
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
        const sectionDuration = Object.entries(currentStep.measures).reduce(
            (maxDur, [position, measure]) =>
                Math.max(maxDur, totalDuration(measure.notation, position as Position, startTempo, 'basenote')),
            0
        )
        if (timeFromSectionStartInTO > sectionDuration) {
            console.error('Requesting tempo outside of current measure.')
        }
        if (startTempo == endTempo) {
            tempoLookup[currentStep.id][timeFromSectionStartInTO] = startTempo
        } else {
            // Gradual change
            tempoLookup[currentStep.id][timeFromSectionStartInTO] =
                startTempo + (timeFromSectionStartInTO / sectionDuration) * (endTempo - startTempo)
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
        debug(
            `creating timeline ${pbAction.playbackType} totSystems=${pbAction.score?.systems.length} startAtIndex=${pbAction.systemIndex} in/out=${JSON.stringify([intro, outro])}`
        )
        if (!(pbAction.playbackType && pbAction.score && pbAction.systemIndex != undefined)) return undefined

        const validation = cycleValidation(pbAction.score, true)
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
            genericactions: [],
            notation: {} as Record<Position, any>
        }

        // Reset all cached tempo values
        tempoLookup = {}

        const { nextInFlow } = executionManager(pbAction.score, pbAction.systemIndex, pbAction.playbackType)

        function nextSymbol(
            notation: NoteSymbol[],
            currIdx: number,
            pos: Position,
            useCache: boolean
        ): NoteSymbol | undefined {
            if (currIdx + 1 < notation.length) return notation[currIdx + 1]
            const nextStep = nextInFlow(true)
            if (nextStep && pos in nextStep.measures) {
                const measure = nextStep.measures[pos]
                const notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
                return notation.length > 0 ? notation[0] : undefined
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
        var sectionStartTime: number = millis2BaseNoteEquiv(intro, introTempo)
        debug(`Intro=${sectionStartTime}`)

        // This dict will be used to create animation actions
        // @ts-ignore
        const samplerActionsByPos: Record<Position, PlaybackSamplerAction[]> = Object.fromEntries(
            _.keys(positionConfigs).map((key) => [key, []] as [Position, PlaybackSamplerAction[]])
        )
        var currentTempo = 0

        newTimeLine.totalDurationMs = intro

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
                    newTimeLine.tempoactions.push({
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
                        newTimeLine.tempoactions.push({
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
                var currTimeMs = newTimeLine.totalDurationMs

                // var cursorPos: number = 0
                newTimeLine.notation[position] = []
                const measure = currentStep.measures[position]
                var notation = useCache && measure.notation_ ? measure.notation_ : measure.notation
                if (!notation) notation = Array(4).fill(defaultObject('NoteSymbol'))
                var prevSymbol: NoteSymbol | undefined = undefined

                notation.forEach((symbol: NoteSymbol, symbolIdx) => {
                    const endOfMeasure = symbolIdx == notation.length - 1
                    const endOfPosition = currentStep!.lastSystem && currentStep!.lastSection && endOfMeasure

                    // CREATE SAMPLER ACTION
                    // Determine the default duration for a single base note.
                    // Add the given delay time if we reached the last note of the measure.
                    var symbolDuration = 1
                    var symbolDurationMs = To2Millis(n2TO(1), tempoAt(currTime - sectionStartTime, currentStep!))
                    var waitTime = 0
                    if (symbolIdx == 0) {
                        // Start of new measure: extend the last note until the current time. This ensures that
                        // if the previous measure was incomplete, it gets extended to the length of the beat
                        // to which it belongs.
                        setLastSamplerActionEndtime(currAction[position], currTime)
                    }
                    if (isExtension(symbol)) {
                        // Extend the last note of the current position with one basenote duration.
                        extendLastSamplerAction(currAction[position], symbolDuration)
                    } else if (isMuting(symbol)) {
                        if (currAction[position]) currAction[position].ismuted = true
                    } else {
                        // Convert potential patterns to individual note actions.
                        const patternNoteActions: PlaybackSamplerAction[] = createNoteActions({
                            samplerFunction: pbFunctionsRef.current.play,
                            time: currTime,
                            timeMs: currTimeMs,
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
                            prevaction: _.last(newTimeLine.sampleractions),
                            isLast: endOfPosition
                        })
                        // Create one or more sampler action(s) for the new note or pattern
                        patternNoteActions.forEach((noteAction: PlaybackSamplerAction, idx) => {
                            currAction[position] = noteAction
                            if (endOfMeasure && noteAction.params.isLastOfPattern && currentStep!.waitMsAfter) {
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
                        symbolDuration =
                            TO2n(TOplusTO(currAction[position]!.time, currAction[position]!.params.duration)) - currTime
                        symbolDurationMs = To2Millis(
                            n2TO(symbolDuration),
                            tempoAt(currTime - sectionStartTime, currentStep!)
                        )
                        if (endOfMeasure && currentStep!.waitMsAfter) {
                            waitTime = millis2BaseNoteEquiv(currentStep!.waitMsAfter, currentStep!.tempo[1])
                            if (currAction[position]) extendLastSamplerAction(currAction[position], waitTime)
                        }
                    }

                    currTime += symbolDuration + waitTime
                    currTimeMs += symbolDurationMs
                    prevSymbol = symbol
                })
                // CREATE PLAYER NOTATION CURSOR ACTION (CURSOR HIGHLIGHTS ENTIRE MEASURE)
                const system = currentStep!.system
                const sectIdx = currentStep!.sectionIdx
                var cursorPos = _.concat(system.staffs[position]!.slice(0, sectIdx))
                    .map((measure) => measure.notation.join('') + ' ') // measures are spearated by space characters.
                    .join('').length
                // if (sectIdx > 0) cursorPos += 1 // Additional offset for space after previous measure.
                const span = notation.join('')
                newTimeLine.playercursoractions.push({
                    function: pbFunctionsRef.current.playercursor,
                    functionName: 'playercursor',
                    time: n2TO(sectionStartTime),
                    params: {
                        sysuuid: currentStep!.system.uuid,
                        section: currentStep!.sectionIdx,
                        position: position,
                        symbol: notation.join(''),
                        line: currentStep!.system.index,
                        range: [cursorPos, cursorPos + span.length]
                    }
                })

                maxMeasureDuration = Math.max(currTime - sectionStartTime, maxMeasureDuration)
            }

            // CREATE EDITOR CURSOR ACTIONS

            var cursorTime = sectionStartTime
            newTimeLine.editorcursoractions.push({
                function: pbFunctionsRef.current.editorcursor,
                time: n2TO(cursorTime),
                params: {
                    prevsysuuid: prevSystem?.uuid || undefined,
                    sysuuid: currentStep.system.uuid,
                    section: currentStep.sectionIdx
                }
            })
            // const waitAfterBnEquiv = millis2BaseNoteEquiv(currentStep!.waitMsAfter, currentStep!.tempo[1])
            // if (currentStep.waitMsAfter)
            // debug(
            //     `cursorTime=${cursorTime} sectionStart=${sectionStartTime} maxMeasureDuration=${maxMeasureDuration} WAITTIME SYSTEM ${currentStep.systemIdx} SECTION ${currentStep.systemIdx} IS ${waitAfterBnEquiv} Basenotes WITH TEMPO ${currentStep!.tempo[1]}`
            // )
            newTimeLine.totalDurationMs += BaseNoteEquiv2Millis(sectionDuration, currentStep.tempo)
            sectionStartTime += maxMeasureDuration
            prevSystem = currentStep.system
            currentStep = nextInFlow()
        }
        // CREATE ANIMATION ACTIONS
        _.keys(samplerActionsByPos).forEach((pos) => {
            const position = pos as Position
            const samplerActions: PlaybackSamplerAction[] = samplerActionsByPos[position]
            // Add an animation action for the displacement of the panggul
            // from the starting position to the first note
            if (!samplerActions || samplerActions.length == 0) return
            newTimeLine.animationactions.push({
                function: pbFunctionsRef.current.animate,
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

                newTimeLine.animationactions.push({
                    time: action.time,
                    function: pbFunctionsRef.current.animate,
                    params: { position: position, currnotes: aNotes, nextnotes: nextANotes, timeuntilMs: timeUntilMs }
                })
            })
        })

        // Determine the total playback duration
        newTimeLine.totalDurationMs += outro
        newTimeLine.totalDurationTO = n2TO(sectionStartTime)
        setTotalDurationMs(newTimeLine.totalDurationMs)
        if (pbFunctionsRef.current.generic)
            newTimeLine.genericactions.push({
                function: pbFunctionsRef.current.generic,
                time: newTimeLine.totalDurationTO,
                params: {}
            })

        newTimeLine.notation = getNotationParagraphs(pbAction.score!)
        debug(newTimeLine, true)
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
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.playercursor(time, action.params),
                action.time
            )
        })

        // Editor Cursor actions
        timeLine.editorcursoractions.forEach((action: PlaybackEditorCursorAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
        })

        // Action for when end of schedule is reached
        timeLine.genericactions.forEach((action: GenericAction) => {
            Tone.getTransport().schedule((time) => action.function(time, action.params), action.time)
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
        // Do nothing if the timeline has already been generated
        if (timeLine && same<PlaybackAction>(pbAction, timeLine.playbackAction)) {
            console.log('Request to create timeline skipped.')
            return
        }

        console.log('Executing request to create timeline.')
        const newTimeLine = createTimelineFromScore(pbAction, useCache, intro, outro)
        if (newTimeLine) {
            createPlaybackSchedule(newTimeLine, playbackSpeed)
            setTimeline(newTimeLine)
        }
        console.log('Done.')
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
