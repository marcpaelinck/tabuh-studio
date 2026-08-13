import type { UUID } from '@tabuhstudio/shared/types/basetypes'
import _ from 'lodash'
import type { ActionDispatch, HTMLAttributes } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Col, Grid, HStack, Placeholder, Row, SegmentedControl, Text, Toggle, useDialog, VStack } from 'rsuite'
import { useEditorStateStore } from '../../stores/useEditorStateStore'
import { usePlaybackFunctionStore } from '../../stores/usePlaybackFunctionStore'
import { useScoreStore } from '../../stores/useScoreStore'
import { useUserSelectionStore, type EditorView } from '../../stores/useUserSettingsStore'
import type { PlaybackCursorStyle } from '../../typing/animation'
import type { EditorCursorParameters, PlaybackAction, PlaybackState } from '../../typing/playback'
import type { Score, System, SystemActionValue } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { Tip } from '../Tooltipped'
import { ExecutionFormContext } from './executionFormContext'
import { SystemNode } from './SystemNode'

export type SystemCursorFunction = (cursor: EditorCursorParameters) => void

interface EditorWindowProps {
    visible: boolean
    loading: boolean
    score: Score
    executeItemAction: (fieldname: string, systemData: System, value?: string | number | SystemActionValue) => void
    playbackState: PlaybackState
    playback: ActionDispatch<[action: PlaybackAction]>
    updateSystem: (sysData: System) => void
}

export default function EditorWindow({
    visible,
    loading,
    score,
    executeItemAction,
    playbackState,
    playback,
    updateSystem
}: EditorWindowProps & HTMLAttributes<HTMLDivElement>) {
    const [gotoTargets, setGotoTargets] = useState<Set<UUID>>(new Set())
    const visibleRef = useRef<boolean>(visible)
    const cursorStyleRef = useRef<PlaybackCursorStyle>('Beat')
    const { selectedCursorStyle, editorView, setEditorView } = useUserSelectionStore()
    const { labelDict } = useScoreStore()
    // Insert/overwrite typing mode (global editor state). Selector-scoped so the toolbar
    // doesn't re-render on unrelated editor-state changes (e.g. selection updates).
    const { overwriteMode, setOverwriteMode } = useEditorStateStore()
    // Show/hide the read-only expanded-notation preview under the cursor line.
    const { showExpansion, setShowExpansion } = useEditorStateStore()
    const { setEditorCursorFunction } = usePlaybackFunctionStore()

    // Number of open (non-modal) execution forms. While > 0 the editor content is
    // made inert so it can't be edited, yet remains scrollable behind the Drawer.
    const [openFormCount, setOpenFormCount] = useState(0)
    const setExecutionFormOpen = useCallback(
        (open: boolean) => setOpenFormCount((count) => Math.max(0, count + (open ? 1 : -1))),
        []
    )

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        cursorStyleRef.current = selectedCursorStyle
    }, [selectedCursorStyle])

    const systemId = (uuid: UUID) => 'system-' + uuid

    // In order to minimize re-renders, each SystemNode gets its own cursor update function.
    // const [systemCursorFunctions, setSystemCursorFunctions] = useState<Record<UUID, SystemCursorFunction>>({})

    const systemCursorFunctions = useRef<Record<UUID, SystemCursorFunction>>({})

    // This function is passed to the SystemNode elements, so that they can each add their own cursor function
    // to the systemCursorFunctions record. Stable identity (empty deps) so it does not
    // defeat React.memo on SystemNode.
    const updateCursorFunction = useCallback((uuid: UUID, func: SystemCursorFunction) => {
        // See https://react.dev/learn/queueing-a-series-of-state-updates
        const newFunctions = { ...systemCursorFunctions.current }
        newFunctions[uuid] = func
        systemCursorFunctions.current = newFunctions
        debug(`new CursorFunctions: ${JSON.stringify(_.keys(newFunctions))}`)
        return newFunctions
    }, [])

    // This is the actual editor cursor function. It calls the corresponding SystemCursorFunction.
    const moveEditorCursor = useCallback((time: number, params: EditorCursorParameters) => {
        if (params.cursor.sysUuid in systemCursorFunctions.current) {
            debug(`moving cursor in system ${params.cursor.sysUuid}`)
            // The cursor function is defined in each system node and passed back to the EditorWindow.
            // See updateCursorFunction.
            systemCursorFunctions.current[params.cursor.sysUuid](params)
            // Reset cursor animation in the previous system
            if (params.prevSysUuid) systemCursorFunctions.current[params.prevSysUuid](params)
        } else {
            debug(
                `cannot move cursor: function for system ${params.cursor.sysUuid} not found in ${JSON.stringify(_.keys(systemCursorFunctions.current))}`
            )
        }
    }, [])

    // Pass the editorcursor function to the playbackManager.
    useEffect(() => {
        debug(`passing cursorFunction to pbManager`)
        setEditorCursorFunction(moveEditorCursor)
    }, [])

    const dialog = useDialog()

    useEffect(() => {
        if (playbackState.audioState == 'error') {
            dialog.alert(playbackState.message || 'Playback is not possible, the score contains an error.', {
                title: 'Warning'
            })
            playback({ actionType: 'reseterror' })
        }
    }, [playbackState])

    useEffect(() => {
        if (!score) return
        // gotoTargets will be used by the 'delete' SummaryItem button for validation.
        var newGotoTargets: Set<UUID> = new Set()
        score.systems.forEach((sys) => {
            if (sys.execution)
                sys.execution
                    .filter((item) => item.type == 'goto')
                    .forEach((goto) => newGotoTargets.add(goto.targetuuid))
        })
        // Keep the same Set reference when the contents are unchanged, so this does
        // not change the gotoTargets prop identity on every score edit (defeats memo).
        setGotoTargets((prev) => {
            if (prev.size === newGotoTargets.size && [...newGotoTargets].every((t) => prev.has(t))) return prev
            return newGotoTargets
        })
    }, [score])

    const scoreRef = useRef<Score>(score)
    useEffect(() => {
        scoreRef.current = score
    }, [score])

    const systems = useMemo(() => {
        if (!score) return
        return score.systems.map((systemData) => {
            // Structure:
            // - Panel Header: contains context menu and System summary information
            // - Panel content (visible when panel is expanded): System grid (SystemNode)
            return (
                // <Profiler key={`profiler-${systemData.uuid}`} id={`sys ${systemData.id}`} onRender={onRender}>
                <Grid key={`grid-${systemData.uuid}`} id="grid-1" className="m-0 flex">
                    <Row>
                        <Col span={23} className="flex">
                            <SystemNode
                                className="flex"
                                id={systemId(systemData.uuid)}
                                systemData={systemData}
                                positions={score.positions}
                                playbackType={playbackState.playbackType}
                                audioState={playbackState.audioState}
                                cursorStyleRef={cursorStyleRef}
                                scoreRef={scoreRef}
                                labelDict={labelDict}
                                playback={playback}
                                executeItemAction={executeItemAction}
                                updateCursorFunction={updateCursorFunction}
                                updateSystem={updateSystem}
                                gotoTargets={gotoTargets}
                            />
                        </Col>
                    </Row>
                </Grid>
                // </Profiler>
            )
        })
        // `visible` is included so the systems (and their grid-paint effect) refresh when the
        // editor is revealed from the player view.
    }, [score, playbackState, visible])

    return (
        // While an execution form is open, mark the editor content inert (no editing)
        // but keep it scrollable: inert content is skipped in hit-testing, so wheel
        // events reach the scrollable ancestor; the Drawer is portaled to <body>.
        <ExecutionFormContext.Provider value={setExecutionFormOpen}>
            <div className="contents" inert={openFormCount > 0 ? true : undefined}>
                <VStack id="Editor Window">
                    {/* View toggle: editable compact (grouped) view vs read-only expanded view.
                        Sticky so it stays pinned at the top while the systems scroll beneath it.
                        z-30 keeps this bar above the compact editor's content layer (StaffGrid's
                        `relative z-10`), so clicks on the toggle win over overlapping position labels. */}
                    <div className="sticky top-0 z-30 w-full bg-white pb-1">
                        <HStack>
                            <Tip tip="Compact = editable grouped view; Expanded = read-only per-position view">
                                <SegmentedControl
                                    size="sm"
                                    data-tour="editor-view"
                                    value={editorView}
                                    onChange={(value) => setEditorView(value as EditorView)}
                                    data={[
                                        { label: 'Compact (edit)', value: 'compact' },
                                        { label: 'Expanded (view)', value: 'expanded' }
                                    ]}
                                />
                            </Tip>
                            <Text size="md" color="blue">{`${editorView == 'expanded' ? '(read only)' : ''}`}</Text>
                            {editorView === 'compact' && (
                                <Tip tip="Show/hide the expanded-notation preview under the cursor line">
                                    <div className="flex items-center gap-2">
                                        <Text size="sm">Expand:</Text>
                                        <Toggle
                                            size="sm"
                                            checked={showExpansion}
                                            onChange={(checked) => setShowExpansion(checked)}
                                            checkedChildren="ON"
                                            unCheckedChildren="OFF"
                                        />
                                    </div>
                                </Tip>
                            )}
                            {editorView === 'compact' && (
                                <Tip tip="Toggle insert / overwrite typing  (Insert, or Ctrl/⌘ + Shift + O)">
                                    <div className="flex items-center gap-2">
                                        <Text size="sm">Typing:</Text>
                                        <Toggle
                                            size="sm"
                                            checked={overwriteMode}
                                            onChange={(checked) => setOverwriteMode(checked)}
                                            checkedChildren="OVR"
                                            unCheckedChildren="INS"
                                        />
                                    </div>
                                </Tip>
                            )}
                        </HStack>
                    </div>
                    {loading ? <Placeholder.Grid rows={12} columns={6} /> : <>{systems}</>}
                </VStack>
            </div>
        </ExecutionFormContext.Provider>
    )
}
