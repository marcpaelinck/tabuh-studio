import { Accordion, Button, ButtonGroup, Divider, HStack, Placeholder, Popover, Whisper } from 'rsuite'
import type { Score, EditorSystemData, Staffs, CursorAction } from '../../models/types'
import {
    useContext,
    useEffect,
    useReducer,
    useRef,
    useState,
    type Dispatch,
    type HTMLAttributes,
    type MouseEvent,
    type RefObject
} from 'react'
import { editorInitialExpandState, editorSortingOrder } from '../../config/config'
import { useInstruments } from '../../hooks/useInstruments'
import { AudioFunctions, defaultAudioFunc, type AudioFunctionsType } from './contexts'
import { SystemNode } from './SystemNode'
import { debug } from '../../utils/debugger'
import { SystemContextMenu } from './SystemContextMenu'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import { playBack, type PlaybackState } from '../../hooks/playbackReducer'
import { noCursor } from './_constants'
import { IoPause, IoPlay, IoPlayOutline, IoPlaySkipForward, IoPlaySkipForwardOutline } from 'react-icons/io5'

var uniqueKeyValue = 0

function uniqueKey(): number {
    uniqueKeyValue += 1
    return uniqueKeyValue
}

export default function EditorWindow({
    score,
    expanded,
    setExpanded,
    loading,
    ...props
}: {
    score: Score
    expanded: Record<number, boolean>
    loading: boolean
    setExpanded: Dispatch<Record<number, boolean>>
} & HTMLAttributes<HTMLDivElement>) {
    const [data, setData] = useState<EditorSystemData[]>([])
    const [processing, setProcessing] = useState<boolean>(false)
    const focusRef: RefObject<string[]> = useRef<string[]>([])
    const { playInstrument } = useInstruments(focusRef, 0)
    const audioFunctions: AudioFunctionsType = Object.assign(defaultAudioFunc, { playInstrument })

    function flipExpanded(id: number) {
        setExpanded({ ...expanded, ...Object.fromEntries([[id, !expanded[id]]]) })
    }

    useEffect(() => {
        // Convert new score to data record structure
        setProcessing(true)
        const newData: EditorSystemData[] = []
        score.systems.forEach((system) => {
            const positions = Object.keys(system.sections[0].staves).toSorted(
                (a, b) => editorSortingOrder.indexOf(a) - editorSortingOrder.indexOf(b)
            )
            const colWidths = system.sections.map((section) =>
                Math.max(...Object.values(section.staves).map((measure) => measure.notation.length))
            )
            const staffs: Staffs = Object.fromEntries(
                positions.map((position) => [position, system.sections.map((section) => section.staves[position])])
            )
            const summary: EditorSystemData = {
                id: system.id,
                // Unique key will force to recreate content when new data is loaded
                key: uniqueKey(),
                system: system.id.toString(),
                part: system.part || '-',
                staffs: staffs,
                colWidths: colWidths
            }
            newData.push(summary)
        })
        debug(newData, EditorWindow.name)
        setData(newData)
        const initExpandState = Object.fromEntries(newData.map((sysInfo) => [sysInfo.id, editorInitialExpandState]))
        setExpanded(initExpandState)
        setProcessing(false)
    }, [score])

    // AUDIO AND CURSOR PLAYBACK FUNCTIONS

    const audio: AudioFunctionsType = useContext(AudioFunctions)
    const [playbackState, playback] = useReducer(playBack, { cursor: noCursor, audioState: 'nodata' })

    async function stopPlayback(time: number) {
        playback({ type: 'stop' })
        playback({ type: 'cursor', cursor: noCursor })
    }

    function moveCursor(time: number, cAction: CursorAction) {
        playback({
            type: 'cursor',
            cursor: { system: cAction.system, position: cAction.position, measure: cAction.section }
        })
        debug(
            `setting cursor to sys=${cAction.system} pos=${cAction.position} measure=${cAction.section}`,
            SystemNode.name
        )
    }

    function playPauseClicked(event: MouseEvent<HTMLElement>, sysDataId: number, singleSystem: boolean) {
        console.log(`playing sys seq=${sysDataId}`)
        event.stopPropagation()
        // if (playbackState.audioState == 'nodata') {
        if (playbackState.cursor.system != data[sysDataId].id) {
            playback({
                type: 'load',
                data: singleSystem ? [data[sysDataId]] : data.slice(sysDataId, data.length),
                audiofunctions: Object.assign(audio, { moveCursor, genericFunction: stopPlayback })
            })
        }
        if (playbackState.audioState == 'playing') playback({ type: 'pause' })
        else playback({ type: 'play' })
    }

    var dummy: OverlayTriggerHandle = {
        updatePosition: () => {},
        open: () => {},
        close: () => {},
        getState: () => {
            return { open: false }
        }
    }

    function updateData(sysData: EditorSystemData, seqId: number) {
        setData([...data.slice(0, seqId), sysData, ...data.slice(seqId + 1)])
    }

    function buttonColor(seqId: number, playbackState: PlaybackState) {
        return seqId == playbackState.cursor.system ? 'orange' : 'gray'
    }

    const whisperRef = useRef<OverlayTriggerHandle>(dummy)
    const systems = data.map((systemData, seqId) => {
        return (
            <Accordion.Panel
                key={systemData.key}
                header={
                    <Whisper
                        ref={whisperRef}
                        key={`Whisper-${systemData.id}`}
                        placement="autoVertical"
                        trigger="contextMenu"
                        speaker={
                            <Popover>
                                <SystemContextMenu data={systemData} ref={whisperRef} />
                            </Popover>
                        }>
                        <HStack className="w-full" divider={<Divider vertical h={20} color="blue" />} spacing={20}>
                            <ButtonGroup size="sm">
                                <Button as="div" onClick={(e) => playPauseClicked(e, seqId, true)}>
                                    {playbackState.audioState == 'playing' ? (
                                        <IoPause color={buttonColor(systemData.id, playbackState)} />
                                    ) : playbackState.audioState == 'paused' ? (
                                        <IoPlay color={buttonColor(systemData.id, playbackState)} />
                                    ) : (
                                        <IoPlayOutline color="gray" />
                                    )}
                                </Button>
                                <Button as="div" onClick={(e) => playPauseClicked(e, seqId, false)}>
                                    {playbackState.audioState == 'playing' ? (
                                        <IoPause color={buttonColor(systemData.id, playbackState)} />
                                    ) : playbackState.audioState == 'paused' ? (
                                        <IoPlaySkipForward color={buttonColor(systemData.id, playbackState)} />
                                    ) : (
                                        <IoPlaySkipForwardOutline color="gray" />
                                    )}
                                </Button>
                            </ButtonGroup>
                            <span>{`${systemData.id} ${systemData.part}`}</span>
                        </HStack>
                    </Whisper>
                }
                expanded={expanded[systemData.id]}
                onSelect={() => {
                    flipExpanded(systemData.id)
                }}>
                {expanded[systemData.id] && (
                    <SystemNode
                        playbackState={playbackState}
                        systemData={systemData}
                        sequence={seqId}
                        update={updateData}
                    />
                )}
            </Accordion.Panel>
        )
    })

    return (
        <AudioFunctions value={audioFunctions}>
            {loading || processing ? (
                <Placeholder.Grid rows={12} columns={6} />
            ) : (
                <Accordion className="w-full overflow-scroll">{systems}</Accordion>
            )}
        </AudioFunctions>
    )
}
