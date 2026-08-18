import { NoteObject, type Position } from '@tabuhstudio/shared'
import type { UUID } from '@tabuhstudio/shared/types/basetypes'
import _ from 'lodash'
import {
    memo,
    useCallback,
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
import { compileKeyMap } from '../../componentlogic/editor/keyMap'
import type { CompactLine } from '../../componentlogic/editor/useCompactSystemEditor'
import { useDebouncedCommit } from '../../componentlogic/editor/useDebouncedCommit'
import { expandSystem } from '../../componentlogic/expandNotation'
import { getPositionGroups } from '../../config/position-functions'
import { useKeyMapStore } from '../../stores/useKeyMapStore'
import { useScoreStore } from '../../stores/useScoreStore'
import { useUserSelectionStore } from '../../stores/useUserSettingsStore'
import { useTourStore } from '../../tour/useTourStore'
import type { PlaybackCursorStyle } from '../../typing/animation'
import type {
    AudioState,
    EditorCursor,
    EditorCursorParameters,
    PlaybackAction,
    PlaybackType
} from '../../typing/playback'
import type { Score, System, SystemActionValue } from '../../typing/score'
import { compactGroupLabel } from '../../utils/compactGroupLabel'
import { debug } from '../../utils/debugger'
import { createGridStyle, gridColorsCompact, gridColorsExpanded } from '../../utils/editor'
import { CompactSystemEditor } from './CompactSystemEditor'
import type { SystemCursorFunction } from './EditorWindow'
import { PlaybackButtons } from './PlaybackButtons'
import { SCol, SummaryItem } from './SummaryItem'
import { SystemMenu, type SystemGroupTag } from './SystemMenu'
import { SystemNotationViewer, type EditorStaff } from './SystemNotationViewer'

interface EditorSystemProps extends TextareaProps {
    systemData: System
    /** Editor tour: 1-based index of this system; drives its `editor-system-N…` data-tour anchors. */
    tourIndex: number
    positions: Position[]
    audioState: AudioState
    playbackType: PlaybackType
    cursorStyleRef: RefObject<PlaybackCursorStyle>
    scoreRef: RefObject<Score>
    labelDict: Record<string, System>
    gotoTargets: Set<UUID>
    playback: ActionDispatch<[action: PlaybackAction]>
    executeItemAction: (fieldname: string, systemData: System, value?: string | number | SystemActionValue) => void
    updateCursorFunction: (uuid: UUID, func: SystemCursorFunction) => void
    updateSystem: (sysData: System) => void
}

// Creates a grid containing the notation of one system/gongan.
// Memoised so that committing an edit to one system does not re-render every other
// system: this only helps if the props from EditorWindow keep a stable identity
// (see updateSystem / executeItemAction / updateCursorFunction / gotoTargets).
export const SystemNode = memo(function SystemNode({
    systemData,
    tourIndex,
    positions,
    audioState,
    playbackType,
    cursorStyleRef,
    scoreRef,
    labelDict,
    gotoTargets,
    playback,
    executeItemAction,
    updateCursorFunction,
    updateSystem,
    ...props
}: EditorSystemProps): ReactNode {
    const systemUuid = systemData.uuid

    // Editor tour: per-system data-tour prefix (e.g. "editor-system-2"), and a notation-click signal
    // published only while the editor tour is running (stable identity; no cost during normal editing).
    const tourPrefix = `editor-system-${tourIndex}`
    const onTourNotationClick = useCallback(() => {
        if (useTourStore.getState().active === 'editor') useTourStore.getState().bumpEditorNotationClick()
    }, [])

    const [playbackCursor, setPlaybackCursor] = useState<EditorCursor | null>(null)
    const { orchestraPositions, beatPosition, orchestra } = useScoreStore()

    const compactNotationRef = useRef<HTMLDivElement>(null)
    const expandedNotationRef = useRef<HTMLDivElement>(null)
    const systemGridRef = useRef<HTMLDivElement>(null)

    // Global editor view (compact = editable grouped view; expanded = read-only per-position).
    const { editorView } = useUserSelectionStore()
    // Active keyboard mapping: compile the selected (editable) definition into a runnable KeyMap.
    const { selectedKeyMapId } = useUserSelectionStore()
    const { keyMaps } = useKeyMapStore()
    const keyMap = useMemo(() => {
        const def = keyMaps.find((k) => k.id === selectedKeyMapId) ?? keyMaps[0]
        return def ? compileKeyMap(def) : compileKeyMap({ id: 'default', name: 'Default', mappings: [] })
    }, [selectedKeyMapId, keyMaps])
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
    }, [systemData, playbackCursor, editorView, notationWidth])

    const systemHeaderButtons: ReactElement | undefined = useMemo(() => {
        return (
            <SCol
                key={`systemButtons-${systemData.uuid}`}
                span={3}
                className="flex items-center"
                data-tour={`${tourPrefix}-playback`}>
                <PlaybackButtons
                    scoreRef={scoreRef}
                    sysUuid={systemUuid}
                    playback={playback}
                    playbackCursor={playbackCursor}
                    playbackType={playbackType}
                    playbackAudioState={audioState}
                    className="content-start"
                />
            </SCol>
        )
    }, [systemData, playbackCursor, audioState, playbackType, labelDict])

    // Create entries for the system selectors in the SummaryItem InputPickers (dropdown menus)
    // This is a list of systems identified by their label if any, otherwise by their id.
    function systemSelectorOptions(self: System, includeSelf: boolean, includeNone: boolean) {
        if (!scoreRef.current) return []
        // List of labelled systems
        const labelOptions: InputOption<string>[] = Object.entries(labelDict).map(([label, sysData]) => ({
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
        var options: InputOption<string | undefined>[] = [...labelOptions, ...idOptions]
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

    // Resolves a system's notation groups into copy-dialog tags (compact label + positions).
    const sourceGroupTags = (uuid: UUID): SystemGroupTag[] => {
        const groups = scoreRef.current?.systems.find((sys) => sys.uuid === uuid)?.groups ?? []
        return groups.map((g) => ({
            id: g.id,
            label: compactGroupLabel(g.positions, getPositionGroups(orchestra)).label,
            positions: g.positions
        }))
    }

    // Hamburger menu (new / copy / move / delete). Placed at the far left of the header.
    const systemMenu: ReactElement = useMemo(
        () => (
            <SCol span={2} className="flex items-center" data-tour={`${tourPrefix}-menu`}>
                <SystemMenu
                    systemData={systemData}
                    isGotoTarget={gotoTargets.has(systemData.uuid)}
                    copyOptions={systemSelectorOptions(systemData, true, false) as InputOption<string>[]}
                    moveOptions={systemSelectorOptions(systemData, false, false) as InputOption<string>[]}
                    sourceGroupTags={sourceGroupTags}
                    onAction={(fieldname, value) => executeItemAction(fieldname, systemData, value)}
                    disabled={headerDisabled}
                />
            </SCol>
        ),
        [systemData, headerDisabled, gotoTargets, labelDict, orchestra]
    )

    const systemHeaderFields: ReactElement | undefined = useMemo(() => {
        if (!systemData) return

        const execute = (fieldname: string, value?: string) => executeItemAction(fieldname, systemData, value)
        return (
            <>
                <SCol span={2} data-tour={`${tourPrefix}-id`}>
                    <SummaryItem item="id" sysData={systemData} disabled={headerDisabled} />
                </SCol>
                <SCol span={4} data-tour={`${tourPrefix}-label`}>
                    <SummaryItem
                        item="label"
                        labels={labelDict}
                        sysData={systemData}
                        execute={execute}
                        disabled={headerDisabled}
                    />
                </SCol>
                <SCol span={6} data-tour={`${tourPrefix}-execution`}>
                    <SummaryItem
                        item="execution"
                        sysData={systemData}
                        options={systemSelectorOptions(systemData, false, false) as InputOption<string>[]}
                        execute={execute}
                        disabled={headerDisabled}
                    />
                </SCol>
                <SCol span={2} data-tour={`${tourPrefix}-kempli`}>
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
    }, [systemData, headerDisabled, labelDict])

    // Generate the content in a fixed sorting order.
    const sortedStaffEntries = _.entries(systemData.staffs).sort(
        ([p1, _1], [p2, _2]) =>
            (orchestraPositions.indexOf(p1 as Position) || 0) - (orchestraPositions.indexOf(p2 as Position) || 0)
    )

    // Staves handed to the virtual editor, in the same display order as the textarea.
    const editorStaves: EditorStaff[] = sortedStaffEntries.map(([position, staff]) => ({
        position: position as Position,
        symbols: staff.objNotation
    }))

    // Per-beat column widths for the compact grid, derived from the system's beat slices.
    const beatColWidths = systemData.beatSlices.map((slice) => slice.end - slice.start) ?? []

    // Beat start columns for Ctrl+Arrow beat jumps. Empty when there is no kempli beat
    // (kempli 'off'), in which case Ctrl+Arrow falls back to a four-note step.
    const beatStops = systemData.kempli.state === 'off' ? [] : systemData.beatSlices.map((slice) => slice.start)

    // Universe of positions the system may contain (KEMPLI only when written as notation).
    const availablePositions = orchestraPositions.filter(
        (p) => p !== beatPosition || systemData.kempli.state === 'notation'
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
        expandSystem(newSystem, beatPosition)
        updateSystem(newSystem)
    }, 300)

    const notationArea = useMemo(() => {
        debug(`re-rendering notation area of system ${systemData.id}`)
        return (
            <Grid ref={systemGridRef} id={`system ${systemData.uuid}`}>
                <Row id="SystemHeader" data-tour={`${tourPrefix}-controls`}>
                    {systemMenu}
                    {systemHeaderButtons}
                    {systemHeaderFields}
                </Row>
                {/* Display editor mode (compact view) */}
                {editorView === 'compact' ? (
                    <Row id="CompactNotation">
                        <Col span={23}>
                            {/* The compact (grouped/shorthand) view — the EDITABLE surface. */}
                            <CompactSystemEditor
                                ref={compactNotationRef}
                                key={`compact-${systemData.uuid}`}
                                tourSystemPrefix={tourPrefix}
                                onTourNotationClick={onTourNotationClick}
                                systemUuid={systemData.uuid}
                                initialLines={compactLines}
                                beatStops={beatStops}
                                notationWidth={notationWidth}
                                kempliFrequency={systemData.kempli.frequency}
                                availablePositions={availablePositions}
                                castingInstructions={systemData.castingInstructions}
                                staffs={systemData.staffs}
                                playing={playing}
                                keyMap={keyMap}
                                onChange={handleCompactChange}
                                className="border-1 border-solid border-gray-200 p-1"
                            />
                        </Col>
                    </Row>
                ) : (
                    // Display read-only view (expanded view)
                    <Row id="SystemNotation">
                        <Col span={23} id="Notation">
                            {/* The expanded view (separate staff for each position) - READ ONLY. */}
                            <SystemNotationViewer
                                ref={expandedNotationRef}
                                staves={editorStaves}
                                notationWidth={notationWidth}
                                className="leading-5.5 border-1 border-solid border-transparent p-0"
                            />
                        </Col>
                    </Row>
                )}
            </Grid>
        )
    }, [systemData, playbackCursor, audioState, playbackType, editorView, notationWidth, playing, keyMap])

    return notationArea
})
