import type { HTMLAttributes, MouseEvent, RefObject } from 'react'
import { useEffect, useRef } from 'react'
import { IoPlay, IoPlayOutline, IoPlaySkipForward, IoPlaySkipForwardOutline, IoStop } from 'react-icons/io5'
import { Button, ButtonGroup } from 'rsuite'
import type { AudioState, PlaybackAction, PlaybackState, PlaybackType } from '../../typing/playback'
import type { Score } from '../../typing/score'
import { debug } from '../../utils/debugger'

export function PlaybackButtons({
    scoreRef,
    sysUuid,
    playbackState,
    hasCursor,
    // playbackType,
    // playbackAudioState,
    playback,
    ...props
}: {
    scoreRef: RefObject<Score>
    sysUuid: string
    playbackState: PlaybackState
    hasCursor: boolean
    playbackType: PlaybackType
    playbackAudioState: AudioState
    playback: (action: PlaybackAction) => void
} & HTMLAttributes<HTMLDivElement>) {
    const buttongroupRef = useRef<HTMLDivElement>(null)

    function isDisabled(pbType: PlaybackType) {
        return playbackState.audioState == 'playing' && playbackState.playbackType != pbType
    }

    async function playStopClicked(event: MouseEvent<HTMLElement>, pbType: PlaybackType) {
        // event.stopPropagation()
        if (isDisabled(pbType)) return
        if (playbackState.audioState == 'playing') {
            playback({ actionType: 'stop' })
        } else {
            debug(`playing sys seq=${sysUuid}`)
            // Create a playback score
            const index = scoreRef.current.systems.findIndex((sysData) => sysData.uuid == sysUuid)
            if (index < 0) {
                console.error(`no playback data found for system ${sysUuid}`)
            }
            playback({
                actionType: 'play',
                playbackType: pbType,
                score: scoreRef.current,
                systemIndex: index,
                intro: 2000,
                outro: 5000
            })
            // playback({ actionType: 'play', playbackType: pbType })
        }
    }

    useEffect(() => {
        debug(`playback state is ${playbackState.audioState}`)
    }, [playbackState.audioState])

    function buttonColor(pbType: PlaybackType) {
        if (hasCursor) debug(`button-sysidx=${sysUuid} has the cursor`)
        return hasCursor && playbackState.playbackType == pbType ? 'orange' : 'gray'
    }

    const playIcon = (pbType: PlaybackType, color: string) =>
        pbType == 'single' ? <IoPlay color={color} /> : <IoPlaySkipForward color={color} />

    const playIconOutline = (pbType: PlaybackType, color: string) =>
        pbType == 'single' ? <IoPlayOutline color={color} /> : <IoPlaySkipForwardOutline color={color} />

    const button = (pbType: PlaybackType) => (
        <Button as="div" onClick={(e) => playStopClicked(e, pbType)} disabled={isDisabled(pbType)}>
            {playbackState.audioState == 'playing' ? (
                playbackState.playbackType == pbType ? (
                    <IoStop color={buttonColor(pbType)} />
                ) : (
                    playIconOutline(pbType, buttonColor(pbType))
                )
            ) : (
                playIcon(pbType, 'gray')
            )}
        </Button>
    )

    return (
        <ButtonGroup size="sm" className={props.className} as="div" ref={buttongroupRef}>
            {button('single')}
            {button('multiple')}
        </ButtonGroup>
    )
}
