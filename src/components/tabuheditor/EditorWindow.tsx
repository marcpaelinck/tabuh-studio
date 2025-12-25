import { Accordion, Divider, HStack, Placeholder, Popover, Whisper } from 'rsuite'
import type { Score, EditorSystemData, Staffs } from '../../models/types'
import {
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    type Dispatch,
    type HTMLAttributes,
    type RefObject
} from 'react'
import { editorInitialExpandState, editorSortingOrder } from '../../config/config'
import { useInstruments } from '../../hooks/useInstruments'
import { AudioFunctions, defaultAudioFunc, type AudioFunctionsType } from './contexts'
import { SystemNode } from './SystemNode'
import { debug } from '../../utils/debugger'
import { SystemContextMenu } from './SystemContextMenu'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import { playbackReducer } from '../../hooks/playbackReducer'
import { noCursor } from './_constants'
import { PlayBackButtons } from './PlaybackButtons'

var uniqueKeyValue = 0

// TODO use uuid function
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
    const audioFunctions: AudioFunctionsType = useMemo(() => Object.assign(defaultAudioFunc, { playInstrument }), [])
    //TODO: playbackState was moved from individual SystemNode components to parent
    // This makes playback very unresponsive. Needs to be solved, possibly by using Ref in some way.
    const [playbackState, playback] = useReducer(playbackReducer, {
        cursor: noCursor,
        audioState: 'nodata',
        playbackType: 'none'
    })

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

    function updateData(sysData: EditorSystemData, seqId: number) {
        setData([...data.slice(0, seqId), sysData, ...data.slice(seqId + 1)])
    }

    var dummyWhisper: OverlayTriggerHandle = {
        updatePosition: () => {},
        open: () => {},
        close: () => {},
        getState: () => {
            return { open: false }
        }
    }
    const whisperRef = useRef<OverlayTriggerHandle>(dummyWhisper)

    const systems = data.map((systemData, seqId) => {
        return (
            <Accordion.Panel
                key={systemData.key}
                header={
                    // Context menu
                    <Whisper
                        ref={whisperRef}
                        key={`Whisper-${systemData.id}`}
                        placement="autoVertical"
                        trigger="contextMenu"
                        followCursor
                        speaker={
                            <Popover>
                                <SystemContextMenu data={systemData} ref={whisperRef} />
                            </Popover>
                        }>
                        <HStack className="w-full" divider={<Divider vertical h={20} color="blue" />} spacing={20}>
                            <PlayBackButtons
                                data={data}
                                systemId={systemData.id}
                                playback={playback}
                                playbackState={playbackState}
                            />
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
                <Accordion className="w-full">{systems}</Accordion>
            )}
        </AudioFunctions>
    )
}
