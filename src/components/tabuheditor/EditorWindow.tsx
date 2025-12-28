import { Accordion, Col, Grid, Placeholder, Popover, Row, Whisper } from 'rsuite'
import type { Score, EditorSystemData, Staffs } from '../../models/types'
import {
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    type Dispatch,
    type HTMLAttributes,
    type ReactNode,
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
import _ from 'lodash'
import { AiOutlineNumber, AiOutlinePieChart } from 'react-icons/ai'
import { IoMdCopy } from 'react-icons/io'
import { IoPricetagOutline, IoArrowForwardOutline } from 'react-icons/io5'

export type CMActionType = 'copy' | 'new' | 'modify' | 'delete'

function PanelCol({
    span,
    text,
    icon,
    color,
    ...props
}: { span: number; text: string; icon: ReactNode; color?: string } & HTMLAttributes<HTMLDivElement>) {
    return (
        <Col
            as="div"
            span={span}
            className="flex bg-gray-100 border-2 border-white divide-solid "
            style={{ color: color }}>
            {text.length > 0 && icon}
            <span>{text}</span>
        </Col>
    )
}

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

    var dummyWhisper: OverlayTriggerHandle = {
        updatePosition: () => {},
        open: () => {},
        close: () => {},
        getState: () => {
            return { open: false }
        }
    }
    const whisperRef = useRef<OverlayTriggerHandle>(dummyWhisper)

    const systems = data.map((systemData, sysIdx) => {
        systemData.id = sysIdx
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
                        {/* <HStack className="w-full" divider={<Divider vertical h={20} color="blue" />} spacing={20}> */}
                        <Grid id="grid" className="ml-0">
                            <Row id="row">
                                <Col span={4} className="flex">
                                    <PlayBackButtons
                                        data={data}
                                        systemId={systemData.id}
                                        playback={playback}
                                        playbackState={playbackState}
                                        className="content-start"
                                    />
                                </Col>
                                <PanelCol span={2} text={`${systemData.id}`} icon={<AiOutlineNumber />} />
                                <PanelCol span={4} text={`${systemData.part || ''}`} icon={<AiOutlinePieChart />} />
                                <PanelCol
                                    span={4}
                                    text={`${systemData.label || ''}`}
                                    icon={<IoPricetagOutline />}
                                    color="orange"
                                />
                                <PanelCol
                                    span={4}
                                    text={`${systemData.copyfrom || ''}`}
                                    icon={<IoMdCopy />}
                                    color="blue"
                                />
                                <PanelCol
                                    span={4}
                                    text={`${systemData.goto || ''}`}
                                    icon={<IoArrowForwardOutline />}
                                    color="green"
                                />
                            </Row>
                        </Grid>
                        {/* </HStack> */}
                    </Whisper>
                }
                expanded={expanded[systemData.key]}
                onSelect={() => {
                    flipExpanded(systemData.key)
                }}>
                {expanded[systemData.key] && <SystemNode systemData={systemData} playbackState={playbackState} />}
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
