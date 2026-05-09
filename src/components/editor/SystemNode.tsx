import _ from 'lodash'
import {
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ActionDispatch,
    type ReactElement,
    type ReactNode,
    type RefObject
} from 'react'
import { Col, Grid, Row, Textarea, type TextareaProps } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { castNotation } from '../../componentlogic/castingRulesManager'
import { editorFontSize, noCursor, positionConfigs } from '../../config/config'
import type { UUID } from '../../typing/basetypes'
import type { Position } from '../../typing/instruments'
import type {
    AudioState,
    EditorCellCursor,
    EditorCursorParameters,
    PlaybackAction,
    PlaybackType
} from '../../typing/playback'
import type { Score, System } from '../../typing/score'
import { notation2text } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { ScoreFunctions, type ScoreFunctionsType } from '../contexts'
import type { GridInfo } from './_types'
import type { SystemCursorFunction } from './EditorWindow'
import { PlaybackButtons } from './PlaybackButtons'
import { SCol, SummaryItem } from './SummaryItem'

interface EditorSystemProps extends TextareaProps {
    systemData: System
    positions: Position[]
    audioState: AudioState
    playbackType: PlaybackType
    visible: boolean
    scoreRef: RefObject<Score>
    labels: Record<string, System>
    gotoTargets: Set<UUID>
    playback: ActionDispatch<[action: PlaybackAction]>
    executeItemAction: (fieldname: string, systemData: System, value?: string) => void
    updateCursorFunction: (uuid: UUID, func: SystemCursorFunction) => void
}

// Creates a grid containing the notation of one system/gongan.
export function SystemNode({
    systemData,
    positions,
    audioState,
    playbackType,
    visible,
    scoreRef,
    labels,
    gotoTargets,
    playback,
    executeItemAction,
    updateCursorFunction,
    ...props
}: EditorSystemProps): ReactNode {
    const systemUuid = systemData.uuid
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const [highlightedMeasure, setHighlightedMeasure] = useState<EditorCellCursor>(noCursor)
    const scoreFunc: ScoreFunctionsType = useContext(ScoreFunctions)

    const [playbackCursor, setPlaybackCursor] = useState<EditorCellCursor | null>(null)

    const notationAreaRef = useRef<HTMLTextAreaElement>(null)

    const gridColors = {
        cursor: 'rgba(255, 255, 0, 0.5)',
        kempli: 'rgba(0, 255, 0, 0.8)',
        grid: 'rgba(0, 0, 0, 0.2)',
        background: 'rgba(255, 255, 255, 0.9)'
    }

    // Fills the notation of the given measure (colId) for all grouped instruments
    // by casting the given notation for each instrument.
    function applyRules(notation: string[], rowIdx: number, colIdx: number, cached: boolean) {
        // Input should currently come from Pemade polos part
        // TODO add a separate input field for grouped positions
        if (positions[rowIdx] != 'PEMADE_POLOS') return
        const newSystemData = { ...systemData }
        positions.forEach((position) => {
            if (!systemData.editorGroup.includes(position)) return
            const newNotation = castNotation(notation, newSystemData.staffs[position]!, positions, colIdx, rowIdx)
            if (cached) newSystemData.staffs[position]![colIdx].notation_ = newNotation
            else newSystemData.staffs[position]![colIdx].notation = newNotation
            debug(`updated notation of ${position} to ${notation2text(newNotation)}`)
        })
        scoreFunc.updateSystem(newSystemData)
    }

    function moveEditorCursor(cursor: EditorCursorParameters) {
        console.log(`moveEditorCursor(${JSON.stringify(cursor)}), currsysuuid=${systemData.uuid}`)
        if (cursor.sysuuid != systemData.uuid) {
            setPlaybackCursor(null)
            return
        }
        console.log(
            `setting playback cursor to ${JSON.stringify({ sysUuid: cursor.sysuuid, measure: cursor.section })}`
        )
        setPlaybackCursor({ sysUuid: cursor.sysuuid, measure: cursor.section })
        notationAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Sets the background grid and cursor highlighting
    function setGrid(systemData: System, cursor: EditorCellCursor | null) {
        // Generates a gradient function for the kempli lines
        function kempliGrid(systemData: System): string {
            switch (systemData.kempli.state) {
                case 'on': {
                    return `repeating-linear-gradient(
                        to right, 
                        ${gridColors.kempli} 0px 2px, 
                        transparent 2px ${systemData.kempli.frequency || 4}ch
                        ),`
                }
                case 'notation': {
                    const gradients = systemData.colWidths
                        .map((width, idx) => {
                            const offset = _.sum(systemData.colWidths.slice(0, idx))
                            const css = `
                                ${gridColors.kempli} ${offset}ch calc(${offset}ch + 2px),
                                transparent calc(${offset}ch + 2px) calc(${offset + width}ch)`
                            return css
                        })
                        .join(', ')
                    return `linear-gradient(to right, ` + gradients + '),'
                }
                case 'off':
                default:
                    return ''
            }
        }

        function cursorHighlight(cursor: EditorCellCursor | null): string {
            if (!cursor) return ''
            const cursorMeasureSize = systemData.colWidths[cursor.measure]
            const cursorOffset = _.sum(systemData.colWidths.slice(0, cursor.measure))
            const highlight = `linear-gradient(
                to right,
                transparent 0 calc(${cursorOffset}ch - 2px),
                ${gridColors.cursor} calc(${cursorOffset}ch - 2px) calc(${cursorOffset + cursorMeasureSize}ch - 2px),
                transparent calc(${cursorOffset + cursorMeasureSize}ch) 100%),`
            return highlight
        }

        if (!notationAreaRef.current) return
        const totalWidth = _.sum(systemData.colWidths)

        const highlight = cursorHighlight(cursor)
        const kempliLines = kempliGrid(systemData)
        // Hides the superfluous gridlines which are generated with a recurring pattern
        const gridlineHider = `linear-gradient(to right, transparent 0 calc(${totalWidth}ch - 1px), ${gridColors.background} ${totalWidth}ch 100%),`
        const gridlines = `repeating-linear-gradient(
            to right, 
            ${gridColors.grid} 0px 1px, 
            transparent 1px 1ch
        )`
        notationAreaRef.current.style.setProperty('background', highlight + gridlineHider + kempliLines + gridlines)
        /* Centers lines on characters */
        notationAreaRef.current.style.setProperty(
            'background-position',
            `
            left,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0
`
        )
        notationAreaRef.current.style.setProperty('background-repeat', 'repeat-x')
    }

    useEffect(() => {
        // console.log('setting update editorcursor function')
        updateCursorFunction(systemData.uuid, moveEditorCursor)
    }, [])

    useEffect(() => {
        // console.log('setting update editorcursor function')
        setGrid(systemData, playbackCursor)
    }, [systemData, playbackCursor])

    const systemHeaderButtons: ReactElement | undefined = useMemo(() => {
        debug(`re-rendering buttons of system ${systemData.id}`)
        return (
            <Col key={`systemButtons-${systemData.uuid}`} span={3} className="flex">
                <PlaybackButtons
                    scoreRef={scoreRef}
                    sysUuid={systemUuid}
                    playback={playback}
                    playbackCursor={playbackCursor}
                    playbackType={playbackType}
                    playbackAudioState={audioState}
                    className="content-start"
                />
            </Col>
        )
    }, [systemData, playbackCursor, audioState, playbackType])

    // Create entries for the system selectors in the SummaryItem InputPickers (dropdown menus)
    // This is a list of systems identified by their label if any, otherwise by their id.
    function systemSelectorOptions(self: System, includeSelf: boolean, includeNone: boolean) {
        if (!scoreRef.current) return []
        // List of labelled systems
        const labelOptions: InputOption<string>[] = Object.entries(labels).map(([label, sysData]) => ({
            label: label,
            value: sysData.uuid
        }))
        const labelledUuid = labelOptions.map((entry) => entry.value)
        //
        // 2. List of non-labelled systems
        const idOptions: InputOption<string>[] = scoreRef.current.systems
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

    const systemHeaderFields: ReactElement | undefined = useMemo(() => {
        if (!systemData) return
        debug(`re-rendering header fields of system ${systemData.id}`)

        const execute = (fieldname: string, value?: string) => executeItemAction(fieldname, systemData, value)
        return (
            <>
                <SCol span={2}>
                    <SummaryItem item="id" sysData={systemData} />
                </SCol>
                <SCol span={4}>
                    <SummaryItem item="label" labels={labels} sysData={systemData} execute={execute} />
                </SCol>
                <SCol span={6}>
                    <SummaryItem
                        item="execution"
                        sysData={systemData}
                        options={systemSelectorOptions(systemData, false, false)}
                        execute={execute}
                    />
                </SCol>
                <SCol span={4}>
                    <SummaryItem item="new" sysData={systemData} execute={execute} />
                    <SummaryItem
                        item="copy"
                        sysData={systemData}
                        options={systemSelectorOptions(systemData, true, false)}
                        execute={execute}
                    />
                    <SummaryItem item="delete" gototargets={gotoTargets} sysData={systemData} execute={execute} />
                </SCol>
                <SCol span={2}>
                    <SummaryItem item="kempli" sysData={systemData} execute={execute} />
                </SCol>
            </>
        )
    }, [systemData])

    const positionTitles = Object.keys(systemData.staffs)
        .map((position) => positionConfigs[position as Position].name)
        .join('\n')
    const notationText = Object.values(systemData.staffs)
        .map((measures) => measures.map((measure) => measure.notation.join('')).join(''))
        .join('\n')

    const notationArea = useMemo(() => {
        debug(`re-rendering notation area of system ${systemData.id}`)
        const positionTitlesFont = `courierfont${10}`
        const notationFont = `balifontspaced${editorFontSize}`
        const rows = _.keys(systemData.staffs).length
        return (
            <Grid id={`system ${systemData.uuid}`} className="ml-4">
                <Row id="SystemHeader">
                    {systemHeaderButtons}
                    {systemHeaderFields}
                </Row>
                <Row id="SystemNotation">
                    <Col span={3} id="Positions">
                        <Textarea
                            disabled
                            rows={rows}
                            className={`${positionTitlesFont} leading-5.5 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                            defaultValue={positionTitles}
                        />
                    </Col>
                    <Col span={20} id="Notation">
                        <Textarea
                            ref={notationAreaRef}
                            id={props.id}
                            rows={rows}
                            className={`${notationFont}  leading-5.5 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                            style={{ position: 'relative', zIndex: 1, backgroundColor: gridColors.background }}
                            spellCheck="false"
                            defaultValue={notationText}
                        />
                    </Col>
                </Row>
            </Grid>
        )
    }, [systemData, playbackCursor, audioState, playbackType])

    return visible && notationArea
}
