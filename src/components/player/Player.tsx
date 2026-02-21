import { useEffect, useMemo, useRef, useState, type Dispatch, type JSX, type RefObject } from 'react'
import * as Tone from 'tone'
import { useAnimationEngine } from '../../componentlogic/useAnimation'
import { useInstruments } from '../../componentlogic/useInstruments'
import {
    type HighlightRange,
    type MenuItemInfo,
    type PlaybackActionFunctions,
    type PlaybackAnimationAction,
    type PlaybackPlayerCursorAction,
    type PlaybackSamplerAction,
    type Position,
    type Score,
    type SVGInfo,
    type TempoAction,
    type TimeLine
} from '../../typing/types'
import { createTimeline } from '../../utils/score'
//-------------------------CONTROLS--------------------------------------
import { FaPause, FaPlay } from 'react-icons/fa'
import { FaBackwardFast } from 'react-icons/fa6'
import { Slider } from 'rsuite'
import 'rsuite/Slider/styles/index.css'
import { changeTempo } from '../../componentlogic/interpretationManager'
import { debug } from '../../utils/debugger'
import { panggulDefaultOption } from './Animation'

type AudioState = 'false' | 'true' | 'wait'

export function ScorePlayer({
    score,
    focus,
    pbSpeed,
    svgInfo,
    panggulOption,
    highlightFunctionRef,
    timelineUpdater
}: {
    score: Score | undefined
    focus: Position[]
    pbSpeed: number
    svgInfo: SVGInfo
    panggulOption: MenuItemInfo
    highlightFunctionRef: RefObject<Dispatch<HighlightRange>>
    timelineUpdater: Dispatch<TimeLine>
}): JSX.Element {
    // STATE VARIABLES
    const [audioStarted, setAudioStarted] = useState<AudioState>('false') // MOVE TO MAINWINDOW
    const [playing, setPlaying] = useState<boolean>(false) // MOVE TO MAINWINDOW
    const [progress, setProgress] = useState<number>(0) // MOVE TO MAINWINDOW
    const [totalDuration, setTotalDuration] = useState<number>(0) // MOVE TO MAINWINDOW

    const svgInfoRef: RefObject<SVGInfo> = useRef<SVGInfo>({
        svg: null,
        panggul: null,
        x: null,
        y: null,
        animation: null
    })
    const panggulOptionRef: RefObject<MenuItemInfo> = useRef<MenuItemInfo>(panggulDefaultOption)
    const focusRef: RefObject<Position[]> = useRef<Position[]>([])
    const pbSpeedRef: RefObject<number> = useRef<number>(1)
    svgInfoRef.current = svgInfo
    panggulOptionRef.current = panggulOption
    focusRef.current = focus
    pbSpeedRef.current = pbSpeed

    // HOOKS
    const { playInstrument, muteAll } = useInstruments(focus)
    const { animateInstrument, animateNotation } = useAnimationEngine(
        svgInfoRef,
        highlightFunctionRef,
        panggulOptionRef,
        focusRef,
        pbSpeedRef
    )

    const actionFunctions: PlaybackActionFunctions = {
        play: playInstrument,
        animate: animateInstrument,
        playercursor: animateNotation,
        editorcursor: null,
        generic: null
    }

    // MEMOS AND EFFECTS
    const timeline = useMemo<TimeLine>(() => createTimeline(score, actionFunctions), [score])

    useEffect(() => {
        timelineUpdater(timeline)
        createSchedule(timeline)
        rewind()
    }, [timeline])

    function updateProgress() {
        setProgress(Tone.getTransport().seconds)
        Tone.getTransport()
    }

    function createSchedule(timeline: TimeLine | null) {
        // Creates the schedule for the Transport object.
        if (!timeline || !score) return

        if (audioStarted) pause()
        Tone.getTransport().stop()
        Tone.getTransport().cancel()
        Tone.getTransport().seconds = 0

        debug(`Creating schedule for ${score?.title}`)

        // tempo and instrument actions (notes)
        // Set the initial tempo to 60 (intro time)
        const initialBpm = score.systems[0].sections[0].tempo[0]
        const tAction: TempoAction = { time: { '16n': 0 }, bpm: initialBpm, duration: { '16n': 0 } }
        Tone.getTransport().schedule((time) => changeTempo(time, tAction, pbSpeed), tAction.time)
        timeline.sampleractions.forEach((sAction: PlaybackSamplerAction) => {
            Tone.getTransport().schedule((time) => changeTempo(time, sAction, pbSpeed), sAction.time)
            Tone.getTransport().schedule((time) => sAction.function(time, sAction), sAction.time)
        })
        // Schedule animation actions
        timeline.animationactions.forEach((aAction: PlaybackAnimationAction) => {
            Tone.getTransport().schedule((time) => aAction.function(time, aAction), aAction.time)
        })
        // Schedule cursor actions
        timeline.playercursoractions.forEach((cAction: PlaybackPlayerCursorAction) => {
            Tone.getTransport().schedule((time) => cAction.function(time, cAction), cAction.time)
        })

        setTotalDuration(Math.round(score.durationMs / 1000))
        // Refresh progress bar 2x per second
        Tone.getTransport().scheduleRepeat(() => updateProgress(), '2hz', 0)
    }

    function jumpToProgressTime(time: number | number[]) {
        const newTime = typeof time === 'number' ? time : time[1]
        Tone.getTransport().stop()
        Tone.getTransport().seconds = newTime
        Tone.getTransport().start()
        setProgress(newTime)
    }

    const play = () => {
        muteAll(0)
        if (Tone.getTransport().state !== 'started') Tone.getTransport().start()
        setPlaying(true)
    }

    const pause = () => {
        Tone.getTransport().pause()
        muteAll(Tone.getTransport().seconds)
        setPlaying(false)
    }

    async function playPause() {
        if (!timeline) return

        if (audioStarted === 'false') {
            Tone.start()
            setAudioStarted('wait')
            await Tone.loaded()
            // logSamplersLoaded()
            setAudioStarted('true')
            play()
        } else {
            if (playing) pause()
            else play()
        }
    }

    function rewind() {
        if (!timeline) return

        Tone.getTransport().stop()
        Tone.getTransport().seconds = 0
        setProgress(0)
        pause()
    }

    //-------------------------CONTROLS--------------------------------------
    const toMmSs = (time: number): string => {
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    //-----------------------------------------------------------------------

    return (
        <div className="px-4 pt-3 pb-4 flex w-full items-center gap-5 justify-center select-none">
            <div className="h-4 w-4 shrink-0">
                <button onClick={() => rewind()}>
                    <FaBackwardFast color="orange" />
                </button>
            </div>
            <div className="h-4 w-4 shrink-0">
                <button onClick={() => playPause()}>
                    {playing ? <FaPause color="orange" /> : <FaPlay color="orange" />}
                </button>
            </div>
            <span className="flex w-12 shrink-0 justify-center">
                <p>{toMmSs(progress)}</p>
            </span>
            <div className="flex w-full items-center ">
                <Slider
                    progress
                    className="flex w-full ts-theme-player"
                    barClassName="flex w-full ts-theme-player"
                    renderTooltip={(value) => (value ? toMmSs(value) : '')}
                    min={0}
                    max={totalDuration}
                    value={progress}
                    onChange={(val) => jumpToProgressTime(val)}
                />
            </div>
            <span className="flex w-12 shrink-0 justify-center">
                <p>{toMmSs(totalDuration)}</p>
            </span>
        </div>
    )
}
