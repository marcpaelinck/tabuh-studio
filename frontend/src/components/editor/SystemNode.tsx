import { NoteObject } from '@tabuhstudio/shared'
import type { Position, UUID } from '@tabuhstudio/shared/types/basetypes'
import _ from 'lodash'
import {
    memo,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ActionDispatch,
    type ReactElement,
    type ReactNode,
    type RefObject
} from 'react'
import { Col, Grid, Row, type TextareaProps } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { StyleProperties } from 'rsuite/esm/internals/types'
import type { CompactLine } from '../../componentlogic/editor/useCompactSystemEditor'
import { useDebouncedCommit } from '../../componentlogic/editor/useDebouncedCommit'
import type { EditorStaff } from '../../componentlogic/editor/useSystemEditor'
import { expandSystem } from '../../componentlogic/expandNotation'
import { positionOrder } from '../../config/config'
import { useUserSelectionStore } from '../../stores/useUserSettingsStore'
import type { PlaybackCursorStyle } from '../../typing/animation'
import type {
    AudioState,
    EditorCursor,
    EditorCursorParameters,
    PlaybackAction,
    PlaybackType
} from '../../typing/playback'
import type { Score, System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { createGridStyle, gridColorsCompact, gridColorsExpanded } from '../../utils/editor'
import { FeatureUnderDevelopment } from '../Feature'
import { CompactSystemEditor } from './CompactSystemEditor'
import type { SystemCursorFunction } from './EditorWindow'
import { PlaybackButtons } from './PlaybackButtons'
import { SCol, SummaryItem } from './SummaryItem'
import { SystemNotationViewer } from './SystemNotationViewer'

interface EditorSystemProps extends TextareaProps {
    systemData: System
    positions: Position[]
    audioState: AudioState
    playbackType: PlaybackType
    cursorStyleRef: RefObject<PlaybackCursorStyle>
    scoreRef: RefObject<Score>
    labels: Record<string, System>
    gotoTargets: Set<UUID>
    playback: ActionDispatch<[action: PlaybackAction]>
    executeItemAction: (fieldname: string, systemData: System, value?: string) => void
    updateCursorFunction: (uuid: UUID, func: SystemCursorFunction) => void
    updateSystem: (sysData: System) => void
}

// Creates a grid containing the notation of one system/gongan.
// Memoised so that committing an edit to one system does not re-render every other
// system: this only helps if the props from EditorWindow keep a stable identity
// (see updateSystem / executeItemAction / updateCursorFunction / gotoTargets).
export const SystemNode = memo(function SystemNode({
    systemData,
    positions,
    audioState,
    playbackType,
    cursorStyleRef,
    scoreRef,
    labels,
    gotoTargets,
    playback,
    executeItemAction,
    updateCursorFunction,
    updateSystem,
    ...props
}: EditorSystemProps): ReactNode {
    const systemUuid = systemData.uuid

    const [playbackCursor, setPlaybackCursor] = useState<EditorCursor | null>(null)

    const compactNotationRef = useRef<HTMLDivElement>(null)
    const expandedNotationRef = useRef<HTMLDivElement>(null)
    const systemGridRef = useRef<HTMLDivElement>(null)

    // Global editor view (compact = editable grouped view; expanded = read-only per-position).
    const editorView = useUserSelectionStore((state) => state.editorView)
    // SummaryItems are read-only in the expanded view — except for an empty system, which is
    // always shown as the editable compact add-staff surface (see notationArea), so its header
    // stays enabled regardless of the current view.
    const headerDisabled = editorView === 'expanded'
    const playing = ['playing', 'paused'].includes(audioState) // hide the expansion snippet while playing
    const [notationWidth, setNotationWidth] = useState<number>(0)

    function moveEditorCursor(cursorParams: EditorCursorParameters) {
        if (cursorParams.cursor.sysUuid != systemData.uuid) {
            setPlaybackCursor(null)
            return
        }
        debug(`setting playback cursor to ${JSON.stringify(cursorParams.cursor)}`)
        setPlaybackCursor(cursorParams.cursor)
        systemGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start' })
    }

    useEffect(() => {
        debug(`System ${systemData.uuid} updating editorcursor function`)
        updateCursorFunction(systemData.uuid, moveEditorCursor)
    }, [systemData])

    // This will cause the cursor to disappear when playback is stopped
    useEffect(() => {
        if (!['playing', 'paused'].includes(audioState)) {
            setPlaybackCursor(null)
        }
    }, [audioState])

    // Update the number of columns in the notation area
    useEffect(() => {
        const maxColumns = Math.max(0, ...systemData.groups.map((group) => group.notation.length))
        setNotationWidth(maxColumns)
    }, [systemData])

    // Redraw background gridlines
    useEffect(() => {
        const compactStyle = createGridStyle({
            beatColWidths,
            kempliFrequency: systemData.kempli.frequency || null,
            cursor: playbackCursor,
            cursorStyle: playbackCursor?.sysUuid == systemData.uuid ? cursorStyleRef.current : 'None',
            gridColors: gridColorsCompact
        })
        const expandedStyle = createGridStyle({
            beatColWidths,
            kempliFrequency: systemData.kempli.frequency || null,
            cursor: playbackCursor,
            cursorStyle: playbackCursor?.sysUuid == systemData.uuid ? cursorStyleRef.current : 'None',
            gridColors: gridColorsExpanded
        })
        // Need to set the style through a callback function rather than through a state variable
        // in order to move the playback cursor in sync with the audio.
        _.entries(compactStyle).forEach(([key, value]) => {
            if (compactNotationRef.current != null)
                compactNotationRef.current.style[key as keyof StyleProperties] = value
        })
        _.entries(expandedStyle).forEach(([key, value]) => {
            if (expandedNotationRef.current != null)
                expandedNotationRef.current.style[key as keyof StyleProperties] = value
        })
        // editorView so the grid repaints when the expanded textarea (re)mounts on a view switch.
    }, [systemData, playbackCursor, editorView])

    const systemHeaderButtons: ReactElement | undefined = useMemo(() => {
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

        const execute = (fieldname: string, value?: string) => executeItemAction(fieldname, systemData, value)
        return (
            <>
                <SCol span={2}>
                    <SummaryItem item="id" sysData={systemData} disabled={headerDisabled} />
                </SCol>
                <SCol span={4}>
                    <SummaryItem
                        item="label"
                        labels={labels}
                        sysData={systemData}
                        execute={execute}
                        disabled={headerDisabled}
                    />
                </SCol>
                <SCol span={6}>
                    <SummaryItem
                        item="execution"
                        sysData={systemData}
                        options={systemSelectorOptions(systemData, false, false)}
                        execute={execute}
                        disabled={headerDisabled}
                    />
                </SCol>
                <SCol span={4}>
                    <SummaryItem item="new" sysData={systemData} execute={execute} disabled={headerDisabled} />
                    <SummaryItem
                        item="copy"
                        sysData={systemData}
                        options={systemSelectorOptions(systemData, true, false)}
                        execute={execute}
                        disabled={headerDisabled}
                    />
                    <SummaryItem
                        item="delete"
                        gototargets={gotoTargets}
                        sysData={systemData}
                        execute={execute}
                        disabled={headerDisabled}
                    />
                </SCol>
                <SCol span={2}>
                    <SummaryItem
                        item="kempli"
                        sysData={systemData}
                        execute={execute}
                        disabled={headerDisabled}
                        options={Array(16)
                            .fill(0)
                            .map((_, idx) => {
                                return { value: idx + 1, label: `${idx + 1}` } as InputOption<number>
                            })}
                    />
                </SCol>
            </>
        )
    }, [systemData, headerDisabled])

    // Generate the content in a fixed sorting order.
    const sortedStaffEntries = _.entries(systemData.staffs).sort(
        ([p1, _1], [p2, _2]) => (positionOrder.indexOf(p1) || 0) - (positionOrder.indexOf(p2) || 0)
    )

    // Staves handed to the virtual editor, in the same display order as the textarea.
    const editorStaves: EditorStaff[] = sortedStaffEntries.map(([position, staff]) => ({
        position: position as Position,
        symbols: staff.objNotation
    }))

    // The compact (grouped/shorthand) view is the editable surface for systems that
    // have a canonical `groups` store. See CLAUDE.dual-editor.md.
    const hasGroups = !!systemData.groups && systemData.groups.length > 0

    // Per-beat column widths for the compact grid, derived from the system's beat slices.
    const beatColWidths = systemData.beatSlices.map((slice) => slice.end - slice.start) ?? []

    // Universe of positions the system may contain (KEMPLI only when written as notation).
    const availablePositions = positionOrder.filter(
        (p) => p !== 'KEMPLI' || systemData.kempli.state === 'notation'
    ) as Position[]

    // Compact lines seeded from the system's groups (flat notation, position-independent).
    const compactLines: CompactLine[] = (systemData.groups ?? []).map((group) => ({
        id: group.id,
        positions: group.positions,
        notation: group.notation.map((sym) => new NoteObject(sym, undefined))
    }))

    // Committing a compact edit writes the flat notation back into the groups, re-derives
    // the expanded staffs (and kempli) via the shared pipeline, then updates the score.
    // Debounced like the expanded path so typing stays instant.
    const { schedule: handleCompactChange } = useDebouncedCommit((lines: CompactLine[]) => {
        const groups = lines.map((line) => ({
            id: line.id,
            positions: line.positions,
            notation: NoteObject.toNotation(line.notation)
        }))
        const newSystem: System = { ...systemData, groups }
        expandSystem(newSystem)
        updateSystem(newSystem)
    }, 300)

    const notationArea = useMemo(() => {
        debug(`re-rendering notation area of system ${systemData.id}`)
        return (
            <Grid ref={systemGridRef} id={`system ${systemData.uuid}`}>
                <Row id="SystemHeader">
                    {systemHeaderButtons}
                    {systemHeaderFields}
                </Row>
                {/* Display editor mode (compact view) */}
                {editorView === 'compact' ? (
                    <Row id="CompactNotation">
                        <Col span={23}>
                            {/* The compact (grouped/shorthand) view — the EDITABLE surface. */}
                            <FeatureUnderDevelopment>
                                <CompactSystemEditor
                                    ref={compactNotationRef}
                                    key={`compact-${systemData.uuid}`}
                                    initialLines={compactLines}
                                    notationWidth={notationWidth}
                                    kempliFrequency={systemData.kempli.frequency}
                                    availablePositions={availablePositions}
                                    castingInstructions={systemData.castingInstructions}
                                    staffs={systemData.staffs}
                                    playing={playing}
                                    onChange={handleCompactChange}
                                    className="border-1 border-solid border-gray-200 p-1"
                                />
                            </FeatureUnderDevelopment>
                        </Col>
                    </Row>
                ) : (
                    // Display read-only view (expanded view)
                    <Row id="SystemNotation">
                        <Col span={23} id="Notation">
                            {/* The expanded view (separate staff for each position) - READ ONLY. */}
                            <SystemNotationViewer
                                ref={expandedNotationRef}
                                initialStaves={editorStaves}
                                notationWidth={notationWidth}
                                readOnly
                                className="leading-5.5 border-1 border-solid border-transparent p-0"
                            />
                        </Col>
                    </Row>
                )}
            </Grid>
        )
    }, [systemData, playbackCursor, audioState, playbackType, editorView, playing])

    return notationArea
})
