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
import { Accordion, Col, Grid, Placeholder, Row } from 'rsuite'
import { editorInitialExpandState, editorSortingOrder } from '../../config/config'
import { playbackReducer } from '../../hooks/playbackReducer'
import { useInstruments } from '../../hooks/useInstruments'
import type { EditorSystemData, Score, Staffs } from '../../models/types'
import { debug } from '../../utils/debugger'
import { noCursor } from './_constants'
import { AudioFunctions, defaultAudioFunc, type AudioFunctionsType } from './contexts'
import { PlayBackButtons } from './PlaybackButtons'
import { SummaryItem } from './SummaryItem'
import { SystemNode } from './SystemNode'

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

    function summaryItemAction(fieldname: string, systemData: EditorSystemData, value?: string) {
        const newSystemData = { ...systemData }
        switch (fieldname) {
            case 'part':
                if (typeof value == 'string') newSystemData.part = value
                break
            case 'label':
                if (typeof value == 'string') newSystemData.label = value
                break
            case 'copy':
            case 'goto':
            default:
        }
        updateSystemData(newSystemData)
    }

    // (Re-)number the systems: numbering can change when systems are inserted.
    // Need to do this separately before updating systemData.copyfromkey.
    data.forEach((systemData, sysIdx) => (systemData.id = sysIdx))

    const systemIdPrefix = 'system-'

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
        const execute = (fieldname: string, value?: string) => summaryItemAction(fieldname, systemData, value)
        return (
            <Accordion.Panel
                id={`${systemIdPrefix}${systemData.id}`}
                key={systemData.key}
                // Panel Header
                header={
                    <Grid id="systemsummary" className="ml-0 pt-0 pb-0">
                        {/* Displays info about the System */}
                        <Row id="row">
                            <Col span={3} className="flex">
                                <PlayBackButtons
                                    data={data}
                                    systemId={systemData.id}
                                    systemIdPrefix={systemIdPrefix}
                                    playback={playback}
                                    playbackState={playbackState}
                                    className="content-start"
                                />
                            </Col>
                            <SummaryItem span={2} fieldname="id" value={systemData.id + 1} />
                            <SummaryItem span={4} fieldname="part" value={systemData.part} execute={execute} />
                            <SummaryItem span={4} fieldname="label" value={systemData.label} execute={execute} />
                            <SummaryItem span={4} fieldname="copy" value={systemData.copyfrom} execute={execute} />
                            <SummaryItem span={4} fieldname="goto" value={systemData.goto} execute={execute} />
                        </Row>
                    </Grid>
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
