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
import type { ReactElement } from 'rsuite/esm/internals/types'
import { v4 as uuidv4 } from 'uuid'
import { editorInitialExpandState, editorSortingOrder, partColorPalette } from '../../config/config'
import { playbackReducer } from '../../hooks/playbackReducer'
import { useInstruments } from '../../hooks/useInstruments'
import type { EditorSystemData, Score, Staffs } from '../../models/types'
import { debug } from '../../utils/debugger'
import { noCursor } from './_constants'
import { AudioFunctions, defaultAudioFunc, type AudioFunctionsType } from './contexts'
import { PlaybackButtons } from './PlaybackButtons'
import { SCol, SummaryItem } from './SummaryItem'
import { SystemNode } from './SystemNode'

export type CMActionType = 'copy' | 'new' | 'modify' | 'delete'

const colorPalette = Object.values(partColorPalette)
// debug(colorPalette)

export default function EditorWindow({
    score,
    expanded,
    setExpanded,
    loading
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
    const audioFunctions: AudioFunctionsType = useMemo(() => ({ ...defaultAudioFunc, playInstrument }), [])
    const [partColors, setPartColors] = useState<Record<string, string>>({})

    //TODO: playbackState was moved from individual SystemNode components to parent
    // This makes playback very unresponsive. Needs to be solved, possibly by using Ref in some way.
    const [playbackState, playback] = useReducer(playbackReducer, {
        cursor: noCursor,
        audioState: 'nodata',
        playbackType: 'none'
    })
    const pbCurrUuid = playbackState.cursor.sysUuid
    debug(`playback state: ${JSON.stringify(playbackState)}`)
    const pbType = playbackState.playbackType
    const pbAudioState = playbackState.audioState

    function flipExpanded(uuid: string) {
        setExpanded({ ...expanded, ...Object.fromEntries([[uuid, !expanded[uuid]]]) })
    }

    function expandIfNotExpanded(uuid: string, expand: boolean) {
        if (expanded[uuid] != expand) flipExpanded(uuid)
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
                uuid: system.uuid,
                part: system.part,
                positions: positions,
                grouped: [],
                staffs: staffs,
                colWidths: colWidths
            }
            newData.push(summary)
        })
        debug(newData)
        setData(newData)
        const initExpandState = Object.fromEntries(newData.map((sysInfo) => [sysInfo.index, editorInitialExpandState]))
        setExpanded(initExpandState)
        setProcessing(false)
    }, [score])

    // Update the list of expanded panels which is maintained in te TabuhEditor.
    // Keys (systems) might have been added or deleted.
    useEffect(() => {
        const allKeys = Object.fromEntries(data.map((sys) => [sys.uuid, false]))
        const existingKeys = _.pick(expanded, Object.keys(allKeys))
        setExpanded({ ...allKeys, ...existingKeys })
        // Set the colors for each part of the score
        const newPartColors: Record<string, string> = {}
        var currPart = ''
        data.forEach((sys) => {
            if (sys.part != currPart && !(sys.part in newPartColors)) {
                debug(`adding ${sys.part} to color collection`)
                const color = colorPalette[Object.keys(newPartColors).length % colorPalette.length]
                newPartColors[sys.part] = color
                currPart = sys.part
            }
            setPartColors(newPartColors)
        })
        debug(`part colors: ${JSON.stringify(newPartColors)}`)
    }, [data])

    function updateSystemData(sysData: EditorSystemData) {
        const sysIdx = sysData.index
        const newData = [...data.slice(0, sysIdx), sysData, ...data.slice(sysIdx + 1)]
        setData(newData)
    }

    function updatePointers(newData: EditorSystemData[]) {
        // Update fields that depend on pointers to another system
        newData.map((systemData) => {
            if (systemData.copyfromkey) {
                const source = newData.find((sysData) => sysData.uuid == systemData.copyfromkey)
                if (source && source.uuid != systemData.uuid)
                    systemData.copyfrom = source.label ? source.label : `#${source.id}`
                else {
                    systemData.copyfrom = undefined
                    systemData.copyfromkey = undefined
                }
            } else systemData.copyfrom = undefined
            if (systemData.gotokey) {
                const destination = newData.find((sysData) => sysData.uuid == systemData.gotokey)
                if (destination) {
                    debug(`found goto destination ${destination.uuid}`)
                    {
                        systemData.goto = destination.label ? destination.label : `#${destination.id}`
                    }
                } else {
                    systemData.goto = undefined
                    systemData.gotokey = undefined
                }
            } else systemData.goto = undefined
        })
    }

    // Handles user actions triggered with buttons in the panel header
    function summaryItemAction(fieldname: string, systemData: EditorSystemData, value?: string) {
        debug(`processing ${fieldname}`)
        // Used for insertion and update
        var newSystemData: EditorSystemData | null = _.cloneDeep(systemData)
        // Reset the edit buffers of the measures.
        Object.values(newSystemData.staffs).forEach((measures) => {
            measures.forEach((measure) => {
                measure.notation_ = undefined
            })
        })
        // Determines where to insert the new system data item. Default is set to replace current.
        var sliceIndex1: number = systemData.index
        var sliceIndex2: number = systemData.index + 1
        switch (fieldname) {
            case 'part':
                // Modify the `part` field of the system
                if (typeof value == 'string') newSystemData.part = value
                break
            case 'label':
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
            case 'new': {
                // Creates an empty system based on the measure settings of the current systemn.
                Object.values(newSystemData.staffs).forEach((measures) => {
                    // clear existing values
                    measures.forEach((measure) => {
                        measure.notation_ = undefined
                        measure.notation = []
                    })
                })
                newSystemData.part = ''
                newSystemData.label = undefined
                newSystemData.gotokey = undefined
                newSystemData.uuid = uuidv4()
                sliceIndex1 = systemData.index + 1 // Insert below current
                break
            }
            case 'copy': {
                const source = data.find((sys) => sys.uuid == value)
                debug(source)
                if (!source) {
                    console.error(`copy system: could not find system ${value}`)
                    return
                }
                newSystemData = _.cloneDeep(source)
                newSystemData.uuid = uuidv4()
                newSystemData.part = ''
                newSystemData.label = undefined
                newSystemData.copyfromkey = source.uuid
                // newSystemData.copyfrom = source.label || `#${source.index}`
                sliceIndex1 = systemData.index + 1 // Copy after the current system
                break
            }
            case 'goto':
                if (!value) {
                    newSystemData.gotokey = undefined
                } else {
                    const destination = data.find((sys) => sys.uuid == value)
                    if (!destination) {
                        console.error(`goto: could not find system ${value}`)
                        return
                    }
                    newSystemData.gotokey = destination.uuid
                }
                break
            case 'delete':
                if (newSystemData.label) {
                    newLabels = { ...labels }
                    delete labels[newSystemData.label]
                    setLabels(newLabels)
                }
                newSystemData = null
                break
            default:
                // Unrecognized action
                return
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
        updatePointers(newData)
        setData(newData)
    }

    // (Re-) number the system index and id values.
    // Should be performed at each render due to possible user actions (insert or delete system).
    const gotoTargets: string[] = []
    data.forEach((systemData, sysIdx) => {
        systemData.index = sysIdx
        systemData.id = systemData.index + 1
        if (systemData.gotokey) gotoTargets.push(systemData.gotokey)
    })

    // Create entries for the system selectors in the SummaryItem InputPickers (dropdown menus)
    // This is a list of systems identified by their label if any, otherwise by their id.
    function systemSelectorOptions(self: EditorSystemData, includeSelf: boolean, includeNone: boolean) {
        // List of labelled systems
        const labelOptions: InputOption<string>[] = Object.entries(labels).map(([label, sysData]) => ({
            label: label,
            value: sysData.uuid
        }))
        const labelledUuid = labelOptions.map((entry) => entry.value)
        //
        // 2. List of non-labelled systems
        const idOptions: InputOption<string>[] = data
            .filter((sysData) => !labelledUuid.includes(sysData.uuid))
            .map((sysData) => ({ label: `#${sysData.id}`, value: sysData.uuid }))
        // Merge both lists
        var options = [...labelOptions, ...idOptions]
        // Remove the systemData item for which the list is being created
        options = options.filter((o) => o.value != self.uuid)
        // Add 'self' to the start of the list if requested.
        if (includeSelf) {
            options = [{ label: '<this system>', value: self.uuid }, ...options]
        }
        if (includeNone) {
            options = [{ label: '<none>', value: undefined }, ...options]
        }
        return options
    }

    // Objects systemHeaderButtons and systemHeaderFields are created separately with useMemo to
    // minimize rendering because it interferes with the audio playback functions.
    // Thesse objects contain the accordeon panel header content for each system (playback and edit buttons + fields)
    const systemIdPrefix = 'system-'
    const systemHeaderButtons: Record<string, ReactElement> = useMemo(
        () =>
            Object.fromEntries(
                data.map((systemData) => {
                    return [
                        systemData.uuid,
                        <Col span={3} className="flex">
                            <PlaybackButtons
                                data={data}
                                sysUuid={systemData.uuid}
                                systemIdPrefix={systemIdPrefix}
                                playback={playback}
                                hasCursor={systemData.uuid == pbCurrUuid}
                                playbackType={pbType}
                                expandIfNotExpanded={expandIfNotExpanded}
                                playbackAudioState={pbAudioState}
                                className="content-start"
                            />
                        </Col>
                    ]
                })
            ),
        [data, pbCurrUuid, pbType, pbAudioState]
    )
    const systemHeaderFields: Record<string, ReactElement> = useMemo(
        () =>
            Object.fromEntries(
                data.map((systemData) => {
                    const execute = (fieldname: string, value?: string) =>
                        summaryItemAction(fieldname, systemData, value)
                    return [
                        systemData.uuid,
                        <>
                            <SCol span={2}>
                                <SummaryItem item="id" sysData={systemData} />
                            </SCol>
                            <SCol span={4}>
                                <SummaryItem item="part" sysData={systemData} execute={execute} />
                            </SCol>
                            <SCol span={4}>
                                <SummaryItem item="label" labels={labels} sysData={systemData} execute={execute} />
                            </SCol>
                            <SCol span={4}>
                                <SummaryItem item="new" sysData={systemData} execute={execute} />
                                <SummaryItem
                                    item="copy"
                                    sysData={systemData}
                                    options={systemSelectorOptions(systemData, true, false)}
                                    execute={execute}
                                />
                                <SummaryItem
                                    item="delete"
                                    gototargets={gotoTargets}
                                    sysData={systemData}
                                    execute={execute}
                                />
                            </SCol>
                            <SCol span={4}>
                                <SummaryItem
                                    item="goto"
                                    sysData={systemData}
                                    options={systemSelectorOptions(systemData, false, true)}
                                    execute={execute}
                                />
                            </SCol>
                        </>
                    ]
                })
            ),
        [data]
    )

    const systems = useMemo(() => {
        var currPartName = ''
        var partName = ''
        return data.map((systemData) => {
            // Update the 'copyfrom' field with the source's label or id.
            // This value can change due to user edits.
            // if (systemData.copyfromkey) {
            //     const source = data.find((sysData) => sysData.uuid == systemData.copyfromkey)
            //     if (source) systemData.copyfrom = source.label ? source.label : `#${source.id}`
            // }
            // Structure:
            // - Panel Header: contains context menu and System summary information
            // - Panel content (visible when panel is expanded): System grid (SystemNode)
            const partColor = systemData.part in partColors ? partColors[systemData.part] : undefined
            if (systemData.part != currPartName) {
                currPartName = systemData.part
                partName = systemData.part
            } else partName = ' '
            return (
                <Grid key={`grid-${systemData.uuid}`} id="grid-1" className="m-0">
                    <Row>
                        <Col span={'auto'} background={partColor} className="box items-center grow-[0.5]">
                            <div
                                className={`m-auto [writing-mode:vertical-rl] overflow-hidden`}
                                style={{ background: partColor }}>
                                {partName}
                            </div>
                        </Col>
                        <Col span={23}>
                            <Accordion.Panel
                                id={`${systemIdPrefix}${systemData.uuid}`}
                                key={systemData.uuid}
                                // Panel Header
                                header={
                                    <Grid id="systemsummary" className="ml-0 pt-0 pb-0">
                                        {/* Displays info about the System */}
                                        <Row id="row">
                                            {systemHeaderButtons[systemData.uuid]}
                                            {systemHeaderFields[systemData.uuid]}
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
                        </Col>
                    </Row>
                </Grid>
            )
        })
    }, [data, expanded, playbackState])

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
