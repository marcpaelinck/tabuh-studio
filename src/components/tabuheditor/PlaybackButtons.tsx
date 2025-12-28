import type { CursorAction, EditorSystemData } from '../../models/types'
import { noCursor } from './_constants'
import { AudioFunctions, type AudioFunctionsType } from './contexts'
import { useContext } from 'react'
import { debug } from '../../utils/debugger'
import { SystemNode } from './SystemNode'
import type { PlaybackState, PlaybackType } from '../../hooks/playbackReducer'
import type { HTMLAttributes, MouseEvent } from 'react'
import { IoPlay, IoPlayOutline, IoPlaySkipForward, IoPlaySkipForwardOutline, IoStop } from 'react-icons/io5'
import { Button, ButtonGroup } from 'rsuite'

export function PlayBackButtons({
    data,
    systemId,
    // pbType,
    playbackState,
    playback,
    ...props
}: {
    data: EditorSystemData[]
    systemId: number
    // pbType: PlaybackType
    playbackState: PlaybackState
    playback: CallableFunction
} & HTMLAttributes<HTMLDivElement>) {
    const audio: AudioFunctionsType = useContext(AudioFunctions)

    async function stopPlayback(time: number) {
        playback({ actionType: 'stop' })
        playback({ actionType: 'cursor', cursor: noCursor })
    }

    function moveCursor(time: number, cAction: CursorAction) {
        playback({
            actionType: 'cursor',
            cursor: { system: cAction.system, position: cAction.position, measure: cAction.section }
        })
        debug(
            `setting cursor to sys=${cAction.system} pos=${cAction.position} measure=${cAction.section}`,
            SystemNode.name
        )
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
            console.log(`playing sys seq=${systemId}`)
            // Load new data
            const index = data.findIndex((sysData) => sysData.id == systemId)
            if (index < 0) {
                console.error(`no playback data found for system ${systemId}`)
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
        return systemId == playbackState.cursor.system && playbackState.playbackType == pbType ? 'orange' : 'gray'
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
        <ButtonGroup size="sm" className={props.className}>
            {button('single')}
            {button('multiple')}
        </ButtonGroup>
    )
}
