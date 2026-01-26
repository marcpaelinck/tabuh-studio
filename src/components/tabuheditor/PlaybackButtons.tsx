import type { HTMLAttributes, MouseEvent } from 'react'
import { useContext, useRef } from 'react'
import { IoPlay, IoPlayOutline, IoPlaySkipForward, IoPlaySkipForwardOutline, IoStop } from 'react-icons/io5'
import { Button, ButtonGroup } from 'rsuite'
import type { AudioState, PlaybackAction, PlaybackType } from '../../hooksandmanagers/playbackReducer'
import type { EditorCursorAction, EditorScore, EditorSystem } from '../../models/types'
import { debug } from '../../utils/debugger'
import { noCursor } from './_constants'
import { AudioFunctions, type AudioFunctionsType } from './contexts'

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
    const audio: AudioFunctionsType = useContext(AudioFunctions)
    const buttongroupRef = useRef<HTMLDivElement>(null)

    async function stopPlayback(time: number) {
        playback({ actionType: 'stop' })
        playback({ actionType: 'cursor', cursor: noCursor })
    }

    function sys(uuid: string | undefined): EditorSystem | undefined {
        return score.systems.find((sys) => sys.uuid == uuid)
    }

    function moveEditorCursor(time: number, cAction: EditorCursorAction) {
        if (cAction.prevsysuuid && cAction.prevsysuuid != cAction.sysuuid) {
            debug(`Close panel ${sys(cAction.prevsysuuid)?.id}, curr=${sys(cAction.sysuuid)?.id}`)
            expandIfNotExpanded(cAction.prevsysuuid, false)
        }
        if (cAction.prevsysuuid != cAction.sysuuid) {
            debug(`Open panel ${sys(cAction.sysuuid)?.id} prev=${sys(cAction.prevsysuuid)?.id}`)
            expandIfNotExpanded(cAction.sysuuid, true)
        }
        playback({ actionType: 'cursor', cursor: { sysUuid: cAction.sysuuid, measure: cAction.section } })
        // debug(`setting cursor to sys=${cAction.sysuuid} measure=${cAction.section}`)
        const currElement = document.getElementById(`${systemIdPrefix}${cAction.sysuuid}`)
        // debug(`scrolling ${currElement?.id} into view`)
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
            // Create a playback score
            const index = score.systems.findIndex((sysData) => sysData.uuid == sysUuid)
            if (index < 0) {
                console.error(`no playback data found for system ${sysUuid}`)
            }
            playback({
                actionType: 'load',
                playbackType: pbType,
                data: score,
                systemIndex: index,
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
