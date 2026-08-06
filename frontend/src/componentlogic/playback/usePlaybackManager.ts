/* Converts a notation to scheduled playback actions such as audio playback, instrument animation
 * and cursor movements. The playback actions consist of callback functions that reside with the
 * components that are involved in a playback action (Player, Animation, Editor). They are kept as
 * state variables in the PlaybackFunctionStore. Each component containing playback functions
 * is responsible for keeping the state variables in PlaybackFunctionStore up to date.
 *
 * Actions are scheduled in the Tone.js Transport schedule. Actions are playback function calls with
 * specific arguments and a timestamp. This is done in two steps.
 * 1. First a TimeLine object is created. It contains several lists each containing objects describing
 *    calls to a specific playback function.
 * 2. The Timeline list elements are translated into function calls and scheduled in the Transport schedule.
 *
 * After the schedule has been created the Transport scheduler fires the functions at the scheduled time.
 * Using a single schedule for all playback actions ensures that all functions calls will be synchronized
 * correctly.
 *
 * Timeline building has moved to the pure module `timelineBuilder.ts`
 * (`buildTimeline`); `createTimelineFromScore` here is a thin wrapper that also records
 * the total duration for the progress bar.
 *
 * createPlaybackSchedule:
 * Creates events in the schedule of the Tone.Transport object, based on the TimeLine's actions.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import * as Tone from 'tone'
import { defaultTempo, editorIntroTime, editorOutroTime, playerIntroTime, playerOutroTime } from '../../config/config'
import { usePlaybackFunctionStore } from '../../stores/usePlaybackFunctionStore'
import { useScoreStore } from '../../stores/useScoreStore'
import { speedDefaultOption, useUserSelectionStore } from '../../stores/useUserSettingsStore'
import type {
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
import { buildTimeline } from './timelineBuilder'
import { useInstruments } from './useInstruments'

export interface SchedulePlaybackParams {
    pbAction: PlaybackAction
    useCache?: boolean
    intro?: number
    outro?: number
}

export function usePlaybackManager() {
    const { playInstrument } = useInstruments(0)
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(speedDefaultOption.objValue as number)
    const [totalDurationMs, setTotalDurationMs] = useState<number>(0)
    const [timeLine, setTimeline] = useState<TimeLine>({} as TimeLine)
    const [playbackProgress, setPlaybackProgress] = useState<number>(0)
    const [playbackTempo, setPlaybackTempo] = useState<number>(60)
    const { beatPosition } = useScoreStore()
    const { mainView } = useUserSelectionStore()
    const { setTempoFunction, setPlayFunction, setProgressFunction } = usePlaybackFunctionStore()
    const {
        tempoFunction,
        playFunction,
        animateFunction,
        playerCursorFunction,
        editorCursorFunction,
        dashboardFunction,
        progressFunction,
        finalizeFunction
    } = usePlaybackFunctionStore()

    // Using a ref object for the playback functions ensures that functions are resolved at the scheduled
    // playback time. This ensures that state variables that are referred to from within a callback function
    // return their current value rather than the value that they had when the function was added to the schedule.
    const pbFunctionsRef: RefObject<PlaybackCallbackFunctions> =
        useRef<PlaybackCallbackFunctions>(usePlaybackFunctionStore())

    // Update the reference to the playback functions whenever they are updated.
    useEffect(() => {
        pbFunctionsRef.current = {
            tempoFunction,
            playFunction,
            animateFunction,
            playerCursorFunction,
            editorCursorFunction,
            dashboardFunction,
            progressFunction,
            finalizeFunction
        }
    }, [
        tempoFunction,
        playFunction,
        animateFunction,
        playerCursorFunction,
        editorCursorFunction,
        dashboardFunction,
        progressFunction,
        finalizeFunction
    ])

    // The live playback speed, so the (stable) scheduled tempo callback applies the CURRENT
    // speed rather than the value baked into the schedule when playback started. Without this,
    // changing speed mid-playback is instantly reverted by the next scheduled tempo event.
    const playbackSpeedRef: RefObject<number> = useRef<number>(playbackSpeed)
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    useEffect(() => {
        setTempoFunction(changeTempo)
        setPlayFunction(playInstrument)
        setProgressFunction(updateProgress)
    }, [])

    useEffect(() => {
        // Immediately change tempo when playback speed is changed by the user.
        // Tempo changes that are scheduled to fire after the current time
        // will take the new playback speed into account (see changeTempo).
        Tone.getTransport().bpm.value = playbackTempo * playbackSpeed
    }, [playbackSpeed])

    // Callback function for the playback scheduler. Uses the live speed ref so mid-playback
    // speed changes stick for every subsequent scheduled tempo event.
    const changeTempo = useCallback((time: number, params: TempoFunctionParameters): void => {
        if (params.bpm != undefined) {
            Tone.getTransport().bpm.setValueAtTime(params.bpm * playbackSpeedRef.current, time)
            setPlaybackTempo(params.bpm)
        }
    }, [])

    const updateProgress = useCallback(() => {
        setPlaybackProgress(Tone.getTransport().seconds)
        Tone.getTransport()
    }, [])

    // const updatePlaybackCallbackFunctions = useCallback((functions: Partial<PlaybackCallbackFunctions>) => {
    //     pbFunctionsRef.current = { ...pbFunctionsRef.current, ...functions }
    // }, [])

    // Creates a timeline to play back (parts of) the score. Delegates to the pure
    // `buildTimeline`; the only side effect is recording the total duration for the UI.
    // useCache: if true, the unsaved (cached) user edits will be played back.
    function createTimelineFromScore(
        pbAction: PlaybackAction,
        useCache: boolean,
        intro: number,
        outro: number
    ): TimeLine | undefined {
        const newTimeLine = buildTimeline(pbAction, {
            useCache,
            intro,
            outro,
            playbackSpeed,
            beatPosition,
            samplerFunction: pbFunctionsRef.current.playFunction
        })
        if (newTimeLine) setTotalDurationMs(newTimeLine.totalDurationMs)
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
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.playFunction(time, action.params),
                action.time
            )
        })

        // Tempo actions
        // Set the initial tempo to 60 (intro time)
        const tAction: PlaybackTempoAction = { time: { '16n': 0 }, params: { bpm: defaultTempo, pbSpeed: pbSpeed } }
        Tone.getTransport().schedule((time) => pbFunctionsRef.current.tempoFunction(time, tAction.params), tAction.time)
        timeLine.tempoactions.forEach((action: PlaybackTempoAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.tempoFunction(time, action.params),
                action.time
            )
        })

        // Animation actions
        timeLine.animationactions.forEach((action: PlaybackAnimationAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.animateFunction(time, action.params),
                action.time
            )
        })

        // Player Cursor actions
        timeLine.playercursoractions.forEach((action: PlaybackPlayerCursorAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.playerCursorFunction(time, action.params),
                action.time
            )
        })

        // Editor Cursor actions
        timeLine.editorcursoractions.forEach((action: PlaybackEditorCursorAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.editorCursorFunction(time, action.params),
                action.time
            )
        })

        // Dashboard actions
        timeLine.dashboardactions.forEach((action: PlaybackDashboardAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.dashboardFunction(time, action.params),
                action.time
            )
        })

        // Action for when end of schedule is reached
        timeLine.genericactions.forEach((action: GenericAction) => {
            Tone.getTransport().schedule(
                (time) => pbFunctionsRef.current.finalizeFunction(time, action.params),
                action.time
            )
        })

        // Schedule a progress counter
        Tone.getTransport().scheduleRepeat((time) => updateProgress(), '2hz', 0)
    }

    function schedulePlayback({
        pbAction,
        useCache = true,
        intro = mainView == 'player' ? playerIntroTime : editorIntroTime,
        outro = mainView == 'player' ? playerOutroTime : editorOutroTime
    }: SchedulePlaybackParams): void {
        const newTimeLine = createTimelineFromScore(pbAction, useCache, intro, outro)
        if (newTimeLine) {
            createPlaybackSchedule(newTimeLine, playbackSpeed)
            setTimeline(newTimeLine)
        }
    }

    return {
        timeLine,
        playbackProgress,
        setPlaybackProgress,
        playbackSpeed,
        setPlaybackSpeed,
        schedulePlayback,
        totalDurationMs
    }
}
