// Contains functions that enable to convert a notation to scheduled playback actions.
// These actions consists of audio playback, instrument animation and/or cursor movements.
//
// Timeline building has moved to the pure module `timelineBuilder.ts`
// (`buildTimeline`); `createTimelineFromScore` here is a thin wrapper that also records
// the total duration for the progress bar.
//
// createPlaybackSchedule:
// Creates events in the schedule of the Tone.Transport object, based on the TimeLine's actions.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import * as Tone from 'tone'
import { defaultTempo, editorIntroTime, editorOutroTime, playerIntroTime, playerOutroTime } from '../../config/config'
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
import { debug } from '../../utils/debugger'
import { buildTimeline } from './timelineBuilder'
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

export function usePlaybackManager() {
    const { playInstrument } = useInstruments(0)
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(speedDefaultOption.objValue as number)
    const [totalDurationMs, setTotalDurationMs] = useState<number>(0)
    const [timeLine, setTimeline] = useState<TimeLine>({} as TimeLine)
    const [playbackProgress, setPlaybackProgress] = useState<number>(0)
    const [playbackTempo, setPlaybackTempo] = useState<number>(60)
    const { beatPosition } = useScoreStore()
    const { mainView } = useUserSelectionStore()

    // Use a ref object to avoid playbackFunctions being reset to defaultPlaybackFunctions. I don't understand why this happens.
    const pbFunctionsRef: RefObject<PlaybackCallbackFunctions> =
        useRef<PlaybackCallbackFunctions>(defaultCallbackFunctions)

    // The live playback speed, so the (stable) scheduled tempo callback applies the CURRENT
    // speed rather than the value baked into the schedule when playback started. Without this,
    // changing speed mid-playback is instantly reverted by the next scheduled tempo event.
    const playbackSpeedRef: RefObject<number> = useRef<number>(playbackSpeed)
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    useEffect(() => {
        updatePlaybackCallbackFunctions({ tempo: changeTempo, play: playInstrument, progress: updateProgress })
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

    const updatePlaybackCallbackFunctions = useCallback((functions: Partial<PlaybackCallbackFunctions>) => {
        pbFunctionsRef.current = { ...pbFunctionsRef.current, ...functions }
    }, [])

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
            samplerFunction: pbFunctionsRef.current.play
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
        updatePlaybackCallbackFunctions,
        playbackProgress,
        setPlaybackProgress,
        playbackSpeed,
        setPlaybackSpeed,
        schedulePlayback,
        totalDurationMs
    }
}
