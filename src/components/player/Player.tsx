import { useEffect, useState, type ActionDispatch, type JSX } from 'react'
import * as Tone from 'tone'
import { type EditorScore } from '../../typing/types'
//-------------------------CONTROLS--------------------------------------
import { FaPause, FaPlay } from 'react-icons/fa'
import { FaBackwardFast } from 'react-icons/fa6'
import { Slider } from 'rsuite'
import 'rsuite/Slider/styles/index.css'
import type { PlaybackAction, PlaybackState } from '../../componentlogic/playbackReducer'

type AudioState = 'false' | 'true' | 'wait'

interface PlayerProps {
    score: EditorScore | undefined
    totalDurationMs: number
    playback: ActionDispatch<[action: PlaybackAction]>
    playbackState: PlaybackState
}

export function Player({ score, totalDurationMs, playback, playbackState }: PlayerProps): JSX.Element {
    // STATE VARIABLES
    const [audioStarted, setAudioStarted] = useState<AudioState>('false') // MOVE TO MAINWINDOW
    // const [playing, setPlaying] = useState<boolean>(false) // MOVE TO MAINWINDOW
    const [progress, setProgress] = useState<number>(0) // MOVE TO MAINWINDOW

    useEffect(() => setAudioStarted('false'), [score])

    function jumpToProgressTime(time: number | number[]) {
        const newTime = typeof time === 'number' ? time : time[1]
        Tone.getTransport().stop()
        Tone.getTransport().seconds = newTime
        Tone.getTransport().start()
        setProgress(newTime)
    }

    // const play = () => {
    //     // muteAll(0)
    //     if (Tone.getTransport().state !== 'started') Tone.getTransport().start()
    //     setPlaying(true)
    // }

    // const pause = () => {
    //     Tone.getTransport().pause()
    // muteAll(Tone.getTransport().seconds)
    // setPlaying(false)
    // }

    // async function playPause() {
    //     if (!score) return
    //     if (audioStarted === 'false') {
    //         Tone.start()
    //         setAudioStarted('wait')
    //         await Tone.loaded()
    //         // logSamplersLoaded()
    //         setAudioStarted('true')
    //         play()
    //     } else {
    //         if (playing) pause()
    //         else play()
    //     }
    // }

    function playPause() {
        switch (playbackState.audioState) {
            case 'nodata':
                playback({
                    actionType: 'play',
                    playbackType: 'multiple',
                    score: score,
                    systemIndex: 0,
                    intro: 2000,
                    outro: 5000
                })
                break
            case 'playing':
                playback({ actionType: 'pause' })
                break
            case 'paused':
                playback({ actionType: 'play' })
                break
            default:
        }
    }

    function rewind() {
        if (!score) return

        Tone.getTransport().stop()
        Tone.getTransport().seconds = 0
        setProgress(0)
        playback({ actionType: 'pause' })
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
                    {playbackState.audioState == 'playing' ? <FaPause color="orange" /> : <FaPlay color="orange" />}
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
                    max={Math.ceil(totalDurationMs / 1000)}
                    value={progress}
                    onChange={(val) => jumpToProgressTime(val)}
                />
            </div>
            <span className="flex w-12 shrink-0 justify-center">
                <p>{toMmSs(Math.ceil(totalDurationMs / 1000))}</p>
            </span>
        </div>
    )
}
