import type { HTMLAttributes, MouseEvent } from 'react'
import { useRef } from 'react'
import { IoPlay, IoPlayOutline, IoPlaySkipForward, IoPlaySkipForwardOutline, IoStop } from 'react-icons/io5'
import { Button, ButtonGroup } from 'rsuite'
import type { AudioState, PlaybackAction, PlaybackType } from '../../componentlogic/playbackReducer'
import type { EditorScore } from '../../typing/types'
import { debug } from '../../utils/debugger'

export function PlaybackButtons({
    score,
    sysUuid,
    systemIdPrefix,
    hasCursor,
    playbackType,
    playbackAudioState,
    expandIfNotExpanded,
    playback,
    ...props
}: {
    score: EditorScore
    sysUuid: string
    systemIdPrefix: string
    hasCursor: boolean
    playbackType: PlaybackType
    playbackAudioState: AudioState
    expandIfNotExpanded: (uuid: string, expand: boolean) => void
    playback: (action: PlaybackAction) => void
} & HTMLAttributes<HTMLDivElement>) {
    const buttongroupRef = useRef<HTMLDivElement>(null)

    function isDisabled(pbType: PlaybackType) {
        return playbackAudioState == 'playing' && playbackType != pbType
    }

    async function playStopClicked(event: MouseEvent<HTMLElement>, pbType: PlaybackType) {
        event.stopPropagation()
        if (isDisabled(pbType)) return
        if (playbackAudioState == 'playing') {
            playback({ actionType: 'stop' })
        } else {
            debug(`playing sys seq=${sysUuid}`)
            // Create a playback score
            const index = score.systems.findIndex((sysData) => sysData.uuid == sysUuid)
            if (index < 0) {
                console.error(`no playback data found for system ${sysUuid}`)
            }
            playback({
                actionType: 'play',
                playbackType: pbType,
                score: score,
                systemIndex: index,
                intro: 2000,
                outro: 5000
            })
            // playback({ actionType: 'play', playbackType: pbType })
        }
    }

    function buttonColor(pbType: PlaybackType) {
        if (hasCursor) debug(`button-sysidx=${sysUuid} has the cursor`)
        return hasCursor && playbackType == pbType ? 'orange' : 'gray'
    }

    const playIcon = (pbType: PlaybackType, color: string) =>
        pbType == 'single' ? <IoPlay color={color} /> : <IoPlaySkipForward color={color} />

    const playIconOutline = (pbType: PlaybackType, color: string) =>
        pbType == 'single' ? <IoPlayOutline color={color} /> : <IoPlaySkipForwardOutline color={color} />

    const button = (pbType: PlaybackType) => (
        <Button as="div" onClick={(e) => playStopClicked(e, pbType)} disabled={isDisabled(pbType)}>
            {playbackAudioState == 'playing' ? (
                playbackType == pbType ? (
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
