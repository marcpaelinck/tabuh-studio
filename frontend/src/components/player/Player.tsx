import { type ActionDispatch, type JSX } from 'react'
import { type PlaybackAction, type PlaybackState } from '../../typing/playback'
import { type Score } from '../../typing/score'
//-------------------------CONTROLS--------------------------------------
import { FaPause, FaPlay } from 'react-icons/fa'
import { FaStop } from 'react-icons/fa6'
import { HStack, IconButton, Slider, Stack, Text } from 'rsuite'

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
        <HStack className="pl-2 pr-2 w-[100%]" spacing={2}>
            <IconButton onClick={() => playback({ actionType: 'rewind' })} icon={<FaStop />} size="sm" />
            <IconButton
                onClick={() => playPause()}
                icon={
                    playbackState.audioState == 'playing' ? (
                        <FaPause color="orange" />
                    ) : (
                        <FaPlay color={playbackState.audioState == 'paused' ? 'orange' : 'black'} />
                    )
                }
                size="sm"
            />
            <Text size="sm" className="pr-2">
                {toMmSs(playbackProgress)}
            </Text>
            <Stack.Item grow={1}>
                <Slider
                    progress
                    // className="flex w-full ts-theme-player"
                    // barClassName="flex w-full ts-theme-player"
                    renderTooltip={(value) => (value ? toMmSs(value) : '')}
                    min={0}
                    max={Math.ceil(totalDurationMs / 1000)}
                    value={playbackProgress}
                    onChange={(val) => playback({ actionType: 'jumptotime', seconds: val })}
                />
            </Stack.Item>
            <Text size="sm">{toMmSs(Math.ceil(totalDurationMs / 1000))}</Text>
        </HStack>
    )
}
