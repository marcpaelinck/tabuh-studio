import type { HTMLAttributes, MouseEvent } from 'react'
import { useContext, useRef } from 'react'
import { IoPlay, IoPlayOutline, IoPlaySkipForward, IoPlaySkipForwardOutline, IoStop } from 'react-icons/io5'
import { Button, ButtonGroup } from 'rsuite'
import type { AudioState, PlaybackAction, PlaybackType } from '../../hooks/playbackReducer'
import type { EditorCursorAction, EditorSystemData } from '../../models/types'
import { debug } from '../../utils/debugger'
import { noCursor } from './_constants'
import { AudioFunctions, type AudioFunctionsType } from './contexts'

export function PlaybackButtons({
    data,
    sysUuid,
    systemIdPrefix,
    hasCursor,
    playbackType,
    playbackAudioState,
    expandIfNotExpanded,
    playback,
    ...props
}: {
    data: EditorSystemData[]
    sysUuid: string
    systemIdPrefix: string
    // playbackState: PlaybackState
    hasCursor: boolean
    playbackType: PlaybackType
    playbackAudioState: AudioState
    expandIfNotExpanded: (uuid: string, expand: boolean) => void
    playback: (action: PlaybackAction) => void
} & HTMLAttributes<HTMLDivElement>) {
    const audio: AudioFunctionsType = useContext(AudioFunctions)
    const buttongroupRef = useRef<HTMLDivElement>(null)

    async function stopPlayback(time: number) {
        playback({ actionType: 'stop' })
        playback({ actionType: 'cursor', cursor: noCursor })
    }

    async function moveEditorCursor(time: number, cAction: EditorCursorAction) {
        if (cAction.prevsysuuid) expandIfNotExpanded(cAction.prevsysuuid, false)
        expandIfNotExpanded(cAction.sysuuid, true)
        playback({ actionType: 'cursor', cursor: { sysUuid: cAction.sysuuid, measure: cAction.section } })
        debug(`setting cursor to sys=${cAction.sysuuid} measure=${cAction.section}`)
        const currElement = document.getElementById(`${systemIdPrefix}${cAction.sysuuid}`)
        debug(`scrolling ${currElement?.id} into view`)
        currElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    function isDisabled(pbType: PlaybackType) {
        return playbackAudioState == 'playing' && playbackType != pbType
    }

    async function playStopClicked(event: MouseEvent<HTMLElement>, pbType: PlaybackType) {
        event.stopPropagation()
        if (isDisabled(pbType)) return
        if (playbackAudioState == 'playing') {
            playback({ actionType: 'stop' })
            playback({ actionType: 'cursor', cursor: noCursor })
        } else {
            debug(`playing sys seq=${sysUuid}`)
            // Load new data
            const index = data.findIndex((sysData) => sysData.uuid == sysUuid)
            if (index < 0) {
                console.error(`no playback data found for system ${sysUuid}`)
            }
            playback({
                actionType: 'load',
                data: pbType == 'single' ? [data[index]] : data.slice(index, data.length),
                audiofunctions: Object.assign(audio, { moveEditorCursor, genericFunction: stopPlayback })
            })
            playback({ actionType: 'play', playbackType: pbType })
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
