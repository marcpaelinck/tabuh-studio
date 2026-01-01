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
import { Accordion, Placeholder, Popover, Whisper } from 'rsuite'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import { editorInitialExpandState, editorSortingOrder } from '../../config/config'
import { playbackReducer } from '../../hooks/playbackReducer'
import { useInstruments } from '../../hooks/useInstruments'
import type { EditorSystemData, Score, Staffs } from '../../models/types'
import { debug } from '../../utils/debugger'
import { noCursor } from './_constants'
import { AudioFunctions, defaultAudioFunc, type AudioFunctionsType } from './contexts'
import { SystemContextMenu } from './SystemContextMenu'
import { SystemNode } from './SystemNode'
import { SystemSummary } from './SystemSummary'

export type CMActionType = 'copy' | 'new' | 'modify' | 'delete'

export default function EditorWindow({
    score,
    expanded,
    setExpanded,
    loading,
    ...props
}: {
    score: Score
    expanded: Record<string, boolean>
    loading: boolean
    setExpanded: Dispatch<Record<string, boolean>>
} & HTMLAttributes<HTMLDivElement>) {
    const [data, setData] = useState<EditorSystemData[]>([])
    const [labels, setLabels] = useState<Record<string, EditorSystemData>>({})
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

    function flipExpanded(key: string) {
        setExpanded({ ...expanded, ...Object.fromEntries([[key, !expanded[key]]]) })
    }

    useEffect(() => {
        // Convert new score to data record structure
        setProcessing(true)
        const newData: EditorSystemData[] = []
        score.systems.forEach((system, sysIdx) => {
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
                id: sysIdx,
                key: system.key,
                part: system.part,
                positions: positions,
                grouped: [],
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

    function updateSystemData(sysData: EditorSystemData) {
        const sysId = sysData.id
        const newData = [...data.slice(0, sysId), sysData, ...data.slice(sysId + 1)]
        setData(newData)
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

    // (Re-)number the systems: numbering can change when systems are inserted.
    // Need to do this separately before updating systemData.copyfromkey.
    data.forEach((systemData, sysIdx) => (systemData.id = sysIdx))

    const systems = data.map((systemData) => {
        // Update the 'copyfrom' field with the source's label or id.
        // This value can change due to user edits.
        if (systemData.copyfromkey) {
            const source = data.find((sysData) => sysData.key == systemData.copyfromkey)
            if (source) systemData.copyfrom = source.label ? source.label : `#${source.id}`
        }
        // Structure:
        // - Panel Header: contains context menu and System summary information
        // - Panel content (visible when panel is expanded): System grid (SystemNode)
        debug(`recreating all systems`, EditorWindow.name)
        return (
            <Accordion.Panel
                key={systemData.key}
                // Panel Header
                header={
                    <Whisper
                        ref={whisperRef}
                        key={`Whisper-${systemData.id}`}
                        placement="autoVertical"
                        trigger="contextMenu"
                        followCursor
                        speaker={
                            <Popover>
                                <SystemContextMenu
                                    data={data}
                                    systemData={systemData}
                                    setData={setData}
                                    labels={labels}
                                    setLabels={setLabels}
                                    whisperRef={whisperRef}
                                />
                            </Popover>
                        }>
                        <SystemSummary
                            data={data}
                            systemData={systemData}
                            updateSysData={updateSystemData}
                            playback={playback}
                            playbackState={playbackState}
                        />
                    </Whisper>
                }
                expanded={expanded[systemData.key]}
                onSelect={() => {
                    flipExpanded(systemData.key)
                }}>
                {/* Panel content: visible when panel is expanded */}

                {expanded[systemData.key] && (
                    <SystemNode
                        systemData={systemData}
                        updateSystemData={updateSystemData}
                        playbackState={playbackState}
                        visible={expanded[systemData.key]}
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
