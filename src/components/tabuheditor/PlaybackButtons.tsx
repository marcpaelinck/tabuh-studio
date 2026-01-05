import type { HTMLAttributes, MouseEvent } from 'react'
import { useContext, useRef } from 'react'
import { IoPlay, IoPlayOutline, IoPlaySkipForward, IoPlaySkipForwardOutline, IoStop } from 'react-icons/io5'
import { Button, ButtonGroup } from 'rsuite'
import type { PlaybackAction, PlaybackState, PlaybackType } from '../../hooks/playbackReducer'
import type { CursorAction, EditorSystemData } from '../../models/types'
import { debug } from '../../utils/debugger'
import { noCursor } from './_constants'
import { AudioFunctions, type AudioFunctionsType } from './contexts'

export function PlayBackButtons({
    data,
    sysUuid,
    systemIdPrefix,
    playbackState,
    playback,
    ...props
}: {
    data: EditorSystemData[]
    sysUuid: string
    systemIdPrefix: string
    playbackState: PlaybackState
    playback: (action: PlaybackAction) => void
} & HTMLAttributes<HTMLDivElement>) {
    const audio: AudioFunctionsType = useContext(AudioFunctions)
    const buttongroupRef = useRef<HTMLDivElement>(null)

    async function stopPlayback(time: number) {
        playback({ actionType: 'stop' })
        playback({ actionType: 'cursor', cursor: noCursor })
    }

    function moveCursor(time: number, cAction: CursorAction) {
        playback({
            actionType: 'cursor',
            cursor: { sysUuid: cAction.sysuuid, position: cAction.position, measure: cAction.section }
        })
        debug(
            `setting cursor to sys=${cAction.sysuuid} pos=${cAction.position} measure=${cAction.section}`,
            PlayBackButtons.name
        )
        const currElement = document.getElementById(`${systemIdPrefix}${cAction.sysuuid}`)
        debug(`scrolling ${currElement?.id} into view`, PlayBackButtons.name)
        currElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    function isDisabled(pbType: PlaybackType) {
        return playbackState.audioState == 'playing' && playbackState.playbackType != pbType
    }

    function playStopClicked(event: MouseEvent<HTMLElement>, pbType: PlaybackType) {
        event.stopPropagation()
        if (isDisabled(pbType)) return
        if (playbackState.audioState == 'playing') {
            playback({ actionType: 'stop' })
            playback({ actionType: 'cursor', cursor: noCursor })
        } else {
            debug(`playing sys seq=${sysUuid}`, PlayBackButtons.name)
            // Load new data
            const index = data.findIndex((sysData) => sysData.uuid == sysUuid)
            if (index < 0) {
                console.error(`no playback data found for system ${sysUuid}`)
            }
            playback({
                actionType: 'load',
                data: pbType == 'single' ? [data[index]] : data.slice(index, data.length),
                audiofunctions: Object.assign(audio, { moveCursor, genericFunction: stopPlayback })
            })
            playback({ actionType: 'play', playbackType: pbType })
        }
    }

    function buttonColor(pbType: PlaybackType) {
        debug(`button-sysidx=${sysUuid} and cursorSysidx=${playbackState.cursor.sysUuid}`, PlayBackButtons.name)
        return sysUuid == playbackState.cursor.sysUuid && playbackState.playbackType == pbType ? 'orange' : 'gray'
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
