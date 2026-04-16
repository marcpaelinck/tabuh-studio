import { type ActionDispatch, type JSX } from 'react'
import { type Score } from '../../typing/types'
//-------------------------CONTROLS--------------------------------------
import { FaPause, FaPlay } from 'react-icons/fa'
import { FaBackwardFast } from 'react-icons/fa6'
import { Slider } from 'rsuite'
import 'rsuite/Slider/styles/index.css'
import type { PlaybackAction, PlaybackState } from '../../componentlogic/playbackReducer'

interface PlayerProps {
    score: Score | undefined
    totalDurationMs: number
    playback: ActionDispatch<[action: PlaybackAction]>
    playbackState: PlaybackState
    playbackProgress: number
}

export function Player({
    score,
    totalDurationMs,
    playback,
    playbackState,
    playbackProgress
}: PlayerProps): JSX.Element {
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
            case 'stopped':
            case 'paused':
                playback({ actionType: 'play' })
                break
            default:
        }
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
                <button onClick={() => playback({ actionType: 'rewind' })}>
                    <FaBackwardFast color="orange" />
                </button>
            </div>
            <div className="h-4 w-4 shrink-0">
                <button onClick={() => playPause()}>
                    {playbackState.audioState == 'playing' ? <FaPause color="orange" /> : <FaPlay color="orange" />}
                </button>
            </div>
            <span className="flex w-12 shrink-0 justify-center">
                <p>{toMmSs(playbackProgress)}</p>
            </span>
            <div className="flex w-full items-center ">
                <Slider
                    progress
                    className="flex w-full ts-theme-player"
                    barClassName="flex w-full ts-theme-player"
                    renderTooltip={(value) => (value ? toMmSs(value) : '')}
                    min={0}
                    max={Math.ceil(totalDurationMs / 1000)}
                    value={playbackProgress}
                    onChange={(val) => playback({ actionType: 'jumptotime', seconds: val })}
                />
            </div>
            <span className="flex w-12 shrink-0 justify-center">
                <p>{toMmSs(Math.ceil(totalDurationMs / 1000))}</p>
            </span>
        </div>
    )
}
