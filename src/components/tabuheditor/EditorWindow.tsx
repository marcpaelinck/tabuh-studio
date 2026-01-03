import _ from 'lodash'
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
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
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
                index: sysIdx,
                id: sysIdx + 1,
                uuid: system.key,
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
        const initExpandState = Object.fromEntries(newData.map((sysInfo) => [sysInfo.index, editorInitialExpandState]))
        setExpanded(initExpandState)
        setProcessing(false)
    }, [score])

    function updateSystemData(sysData: EditorSystemData) {
        const sysIdx = sysData.index
        const newData = [...data.slice(0, sysIdx), sysData, ...data.slice(sysIdx + 1)]
        setData(newData)
    }

    // Handles user actions triggered with buttons in the panel header
    function summaryItemAction(fieldname: string, systemData: EditorSystemData, value?: string) {
        // Used for insertion and update
        var newSystemData: EditorSystemData | null = null
        // Used for insertion and deletion. Default is set to replace current.
        var sliceIndex1: number = systemData.index
        var sliceIndex2: number = systemData.index + 1
        switch (fieldname) {
            case 'part':
                // Modify the `part` field of the system
                newSystemData = _.cloneDeep(systemData)
                if (typeof value == 'string') newSystemData.part = value
                break
            case 'label':
                newSystemData = _.cloneDeep(systemData)
                if (typeof value == 'string') {
                    // New label: add it to the list
                    // First remove any existing label for the current system
                    // Also avoid duplication of the new label to be sure (should not be necessary).
                    var newLabels = _.omitBy(labels, (value) => value.uuid == systemData.uuid)
                    newLabels = _.omit(newLabels, value)
                    // Add the label
                    newSystemData.label = value
                    newLabels[value] = newSystemData
                    setLabels(newLabels)
                }
                break
            case 'copy': {
                const source = data.find((sys) => sys.uuid == value)
                if (!source) {
                    console.error(`copy system: could not find system ${value}`)
                    return
                }
                newSystemData = _.cloneDeep(source)
                newSystemData.uuid = _.uniqueId()
                newSystemData.label = undefined
                newSystemData.copyfromkey = source.uuid
                newSystemData.copyfrom = source.label || `#${source.index}`
                sliceIndex1 = systemData.index + 1 // Copy after the current system
                break
            }
            case 'goto':
                console.log(value)
            default:
        }
        // Replace, remove or insert system
        const newData = newSystemData
            ? [...data.slice(0, sliceIndex1), newSystemData, ...data.slice(sliceIndex2)]
            : [...data.slice(0, sliceIndex1), ...data.slice(sliceIndex2)]
        // Update all system IDs
        newData.forEach((sysData, sysIdx) => {
            sysData.index = sysIdx
            sysData.id = sysIdx + 1
        })
        setData(newData)
    }

    // (Re-) number the system index and id values.
    // Should be performed at each render due to possible user actions (insert or delete system).
    data.forEach((systemData, sysIdx) => {
        systemData.index = sysIdx
        systemData.id = systemData.index + 1
    })

    // Create entries for the system selectors in the SummaryItem InputPickers (dropdown menus)
    // This is a list of systems identified by their label if any, otherwise by their id.
    // 1. List of labelled systems
    const labelOptions: InputOption<string>[] = Object.entries(labels).map(([label, sysData]) => ({
        label: label,
        value: sysData.uuid
    }))
    const labelledUuid = labelOptions.map((entry) => entry.value)
    //
    // 1. List of non-labelled systems
    const idOptions: InputOption<string>[] = data
        .filter((sysData) => !labelledUuid.includes(sysData.uuid))
        .map((sysData) => ({ label: `#${sysData.id}`, value: sysData.uuid }))
    // Merge both lists
    const labelIdOptions = [...labelOptions, ...idOptions]

    const systemIdPrefix = 'system-'
    const systems = data.map((systemData) => {
        // Update the 'copyfrom' field with the source's label or id.
        // This value can change due to user edits.
        if (systemData.copyfromkey) {
            const source = data.find((sysData) => sysData.uuid == systemData.copyfromkey)
            if (source) systemData.copyfrom = source.label ? source.label : `#${source.id}`
        }
        // Structure:
        // - Panel Header: contains context menu and System summary information
        // - Panel content (visible when panel is expanded): System grid (SystemNode)
        const execute = (fieldname: string, value?: string) => summaryItemAction(fieldname, systemData, value)
        return (
            <Accordion.Panel
                id={`${systemIdPrefix}${systemData.id}`}
                key={systemData.uuid}
                // Panel Header
                header={
                    <Grid id="systemsummary" className="ml-0 pt-0 pb-0">
                        {/* Displays info about the System */}
                        <Row id="row">
                            <Col span={3} className="flex">
                                <PlayBackButtons
                                    data={data}
                                    systemIdx={systemData.index}
                                    systemIdPrefix={systemIdPrefix}
                                    playback={playback}
                                    playbackState={playbackState}
                                    className="content-start"
                                />
                            </Col>
                            <SummaryItem span={2} fieldname="id" value={systemData.id} />
                            <SummaryItem span={4} fieldname="part" value={systemData.part} execute={execute} />
                            <SummaryItem span={4} fieldname="label" value={systemData.label} execute={execute} />
                            <SummaryItem
                                span={4}
                                fieldname="copy"
                                value={systemData.copyfrom}
                                labels={labelIdOptions}
                                execute={execute}
                            />
                            <SummaryItem
                                span={4}
                                fieldname="goto"
                                value={systemData.goto}
                                labels={labelIdOptions}
                                execute={execute}
                            />
                        </Row>
                    </Grid>
                }
                expanded={expanded[systemData.uuid]}
                onSelect={() => {
                    flipExpanded(systemData.uuid)
                }}>
                {/* Panel content: visible when panel is expanded */}

                {expanded[systemData.uuid] && (
                    <SystemNode
                        systemData={systemData}
                        updateSystemData={updateSystemData}
                        playbackState={playbackState}
                        visible={expanded[systemData.uuid]}
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
