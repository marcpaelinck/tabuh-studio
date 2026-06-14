import { NoteObject } from '@tabuhstudio/shared'
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
import { Col, Grid, Row, Textarea, type TextareaProps } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { useDebouncedCommit } from '../../componentlogic/editor/useDebouncedCommit'
import type { EditorStaff } from '../../componentlogic/editor/useSystemEditor'
import { defaultBeatFrequency, editorFontSize, positionConfigs, positionOrder } from '../../config/config'
import type { PlaybackCursorStyle } from '../../typing/animation'
import type { Position, UUID } from '../../typing/basetypes'
import type {
    AudioState,
    EditorCursor,
    EditorCursorParameters,
    PlaybackAction,
    PlaybackType
} from '../../typing/playback'
import type { Score, Staffs, System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import type { SystemCursorFunction } from './EditorWindow'
import { PlaybackButtons } from './PlaybackButtons'
import { SCol, SummaryItem } from './SummaryItem'
import { SystemNotationEditor } from './SystemNotationEditor'

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

    const notationAreaRef = useRef<HTMLTextAreaElement>(null)
    const systemGridRef = useRef<HTMLDivElement>(null)

    const gridColors = {
        cursor: 'rgba(255, 255, 0, 0.5)',
        kempli: 'rgba(0, 255, 0, 0.8)',
        grid: 'rgba(0, 0, 0, 0.2)',
        background: 'rgba(255, 255, 255, 0.9)'
    }

    function moveEditorCursor(cursorParams: EditorCursorParameters) {
        if (cursorParams.cursor.sysUuid != systemData.uuid) {
            setPlaybackCursor(null)
            return
        }
        debug(`setting playback cursor to ${JSON.stringify(cursorParams.cursor)}`)
        setPlaybackCursor(cursorParams.cursor)
        systemGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start' })
    }

    // Sets the background grid and cursor highlighting
    function setGrid(systemData: System, cursor: EditorCursor | null) {
        // Generates a gradient function for the kempli lines
        function kempliGrid(systemData: System): string {
            switch (systemData.kempli.state) {
                case 'on': {
                    return `repeating-linear-gradient(
                        to right,
                        ${gridColors.kempli} 0px 2px,
                        transparent 2px ${systemData.kempli.frequency || defaultBeatFrequency}ch
                        ),`
                }
                case 'notation': {
                    // Get the kempli notation for the entire system
                    const objNotation: NoteObject[] = systemData.staffs['KEMPLI']?.objNotation || []
                    // Determine the positions of the kempli characters
                    const indices = objNotation.reduce(
                        (aggr: number[], note, idx) => (note.canonicalSymbol == 'x?' ? aggr.concat([idx]) : aggr),
                        []
                    )
                    if (indices.length == 0) return ''
                    // Generate the gradient functions
                    const gradients = indices
                        .map((index, idx, arr) => {
                            const transpEnd = idx < arr.length - 1 ? `calc(${arr[idx + 1]}ch)` : '100%'
                            const css =
                                `${gridColors.kempli} ${index}ch calc(${index}ch + 2px),
                                transparent calc(${index}ch + 2px) ` + transpEnd
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

        function cursorHighlight(cursor: EditorCursor | null): string {
            if (!cursor || cursor.sysUuid != systemData.uuid) return ''
            var start = cursor.beatSlice.start
            var end = cursor.beatSlice.end
            // If user cursor setting is system, highlight the entire system.
            // Do nothing if end==0: this is the 'cursor off' message.
            if (cursorStyleRef.current == 'System' && end != 0) {
                start = 0
                end = cursor.lastColumn
            }

            const highlight = `linear-gradient(
                to right,
                transparent 0 calc(${start}ch - 2px),
                ${gridColors.cursor} calc(${start}ch - 2px) calc(${end}ch - 2px),
                transparent calc(${end}ch) 100%),`
            return highlight
        }

        if (!notationAreaRef.current) return
        const firstStaff = Object.values(systemData.staffs)[0]
        const totalWidth = firstStaff?.objNotation.length ?? 0

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
        debug(`System ${systemData.uuid} updating editorcursor function`)
        updateCursorFunction(systemData.uuid, moveEditorCursor)
    }, [systemData])

    // This will cause the cursor to disappear when playback is stopped
    useEffect(() => {
        if (!['playing', 'paused'].includes(audioState)) {
            setPlaybackCursor(null)
        }
    }, [audioState])

    useEffect(() => {
        setGrid(systemData, playbackCursor)
    }, [systemData, playbackCursor])

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
                    <SummaryItem
                        item="kempli"
                        sysData={systemData}
                        execute={execute}
                        options={Array(16)
                            .fill(0)
                            .map((_, idx) => {
                                return { value: idx + 1, label: `${idx + 1}` } as InputOption<number>
                            })}
                    />
                </SCol>
            </>
        )
    }, [systemData])

    // Generate the content in a fixed sorting order.
    const sortedStaffEntries = _.entries(systemData.staffs).sort(
        ([p1, _1], [p2, _2]) => (positionOrder.indexOf(p1) || 0) - (positionOrder.indexOf(p2) || 0)
    )
    const positionTitles = sortedStaffEntries
        .map(([position, _]) => positionConfigs[position as Position].name)
        .join('\n')
    const notationText = sortedStaffEntries
        .map(([_, staff]) => staff.objNotation.map((note) => note.toString()).join(''))
        .join('\n')

    // Staves handed to the virtual editor, in the same display order as the textarea.
    const editorStaves: EditorStaff[] = sortedStaffEntries.map(([position, staff]) => ({
        position: position as Position,
        symbols: staff.objNotation
    }))

    // Committing an edit re-renders the whole score and rewrites the local cache,
    // so it is debounced: the editor shows changes instantly (it owns its state);
    // the score only catches up once typing pauses. The pending edit is flushed on
    // unmount so nothing is lost when navigating away. The commit closure always
    // sees the current systemData (useDebouncedCommit keeps the latest version).
    const { schedule: handleStavesChange } = useDebouncedCommit((staves: EditorStaff[]) => {
        const newStaffs: Staffs = { ...systemData.staffs }
        staves.forEach(({ position, symbols }) => {
            const prev = newStaffs[position]
            if (!prev) return
            newStaffs[position] = { ...prev, objNotation: symbols, notation: NoteObject.toNotation(symbols) }
        })
        updateSystem({ ...systemData, staffs: newStaffs })
    }, 300)

    const notationArea = useMemo(() => {
        debug(`re-rendering notation area of system ${systemData.id}`)
        const positionTitlesFont = `courierfont${10}`
        const notationFont = `balifontspaced${editorFontSize}`
        const rows = _.keys(systemData.staffs).length
        return (
            <Grid ref={systemGridRef} id={`system ${systemData.uuid}`}>
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
                        {/* The textarea stays as the playback animation surface (background
                            highlight + grid). Its text is transparent so only the highlight
                            shows; the SystemNotationEditor on top supplies the glyphs, the
                            cursor and editing, aligned by matching font / line metrics. */}
                        <div style={{ position: 'relative' }}>
                            <Textarea
                                disabled
                                ref={notationAreaRef}
                                id={props.id}
                                rows={rows}
                                className={`${notationFont}  leading-5.5 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    backgroundColor: gridColors.background,
                                    color: 'transparent'
                                }}
                                spellCheck="false"
                                defaultValue={notationText}
                            />
                            <SystemNotationEditor
                                initialStaves={editorStaves}
                                onChange={handleStavesChange}
                                className="leading-5.5 border-1 border-solid border-transparent p-0"
                                style={{ position: 'absolute', inset: 0, zIndex: 2 }}
                            />
                        </div>
                    </Col>
                </Row>
            </Grid>
        )
    }, [systemData, playbackCursor, audioState, playbackType])

    return notationArea
})
