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
import type { EditorCellCursor, PlaybackAction, PlaybackState } from '../../typing/playback'
import type { Score, System } from '../../typing/score'
import { notation2text } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { ScoreFunctions, type ScoreFunctionsType } from '../contexts'
import type { GridInfo } from './_types'
import { PlaybackButtons } from './PlaybackButtons'
import { SCol, SummaryItem } from './SummaryItem'

interface EditorSystemProps extends TextareaProps {
    systemData: System
    positions: Position[]
    playbackState: PlaybackState
    visible: boolean
    scoreRef: RefObject<Score>
    labels: Record<string, System>
    gotoTargets: Set<UUID>
    playback: ActionDispatch<[action: PlaybackAction]>
    executeItemAction: (fieldname: string, systemData: System, value?: string) => void
}

// Creates a grid containing the notation of one system/gongan.
export function SystemNode({
    systemData,
    positions,
    playbackState,
    visible,
    scoreRef,
    labels,
    gotoTargets,
    playback,
    executeItemAction,
    ...props
}: EditorSystemProps): ReactNode {
    const systemUuid = systemData.uuid
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const [highlightedMeasure, setHighlightedMeasure] = useState<EditorCellCursor>(noCursor)
    const scoreFunc: ScoreFunctionsType = useContext(ScoreFunctions)

    if (systemData.id == 1 || systemData.id == 13) debug(`(re-)rendering system ${systemUuid}`)

    useEffect(() => debug(`recreating system ${systemUuid} due to change of data`), [systemData])

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

    useEffect(() => {
        if (systemUuid == playbackState.cursor.sysUuid) {
            // console.log(`${systemUuid} ${systemUuid == playbackState.cursor.sysUuid ? 'has' : 'lost'} cursor`)
            debug(`${systemUuid} has the cursor`)
        }
    }, [playbackState])

    const systemHeaderButtons: ReactElement | undefined = (
        <Col key={`systemButtons-${systemData.uuid}`} span={3} className="flex">
            <PlaybackButtons
                scoreRef={scoreRef}
                sysUuid={systemUuid}
                playback={playback}
                playbackState={playbackState}
                hasCursor={systemUuid == playbackState.cursor.sysUuid}
                playbackType={playbackState.playbackType}
                playbackAudioState={playbackState.audioState}
                className="content-start"
            />
        </Col>
    )

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
                            readOnly
                            rows={rows}
                            className={`${positionTitlesFont} leading-5.5 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                            defaultValue={positionTitles}
                        />
                    </Col>
                    <Col span={20} id="Notation">
                        <Textarea
                            id={props.id}
                            rows={rows}
                            className={`${notationFont} grid-gong-at-start leading-5.5 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                            style={{ position: 'relative', zIndex: 1, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                            spellCheck="false"
                            defaultValue={notationText}
                        />
                        {/* </div> */}
                    </Col>
                </Row>
            </Grid>
        )
    }, [systemData, playbackState])

    return visible && notationArea
}
