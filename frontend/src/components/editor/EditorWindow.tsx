import _ from 'lodash'
import type { ActionDispatch, Dispatch, HTMLAttributes } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Col, Grid, Placeholder, Row, useDialog, VStack } from 'rsuite'
import { usePartManager } from '../../componentlogic/usePartManager'
import type { PlaybackCursorStyle } from '../../typing/animation'
import type { UUID } from '../../typing/basetypes'
import type {
    EditorCursorParameters,
    PlaybackAction,
    PlaybackCallbackFunctions,
    PlaybackSettings,
    PlaybackState
} from '../../typing/playback'
import type { Score, System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { ExecutionFormContext } from './executionFormContext'
import { PartIndicator } from './PartIndicator'
import { SystemNode } from './SystemNode'

export type CMActionType = 'copy' | 'new' | 'modify' | 'delete'

export type SystemCursorFunction = (cursor: EditorCursorParameters) => void

interface EditorWindowProps {
    visible: boolean
    loading: boolean
    score: Score
    labels: Record<string, System>
    updateParts: (parts: Record<string, string[]>) => void
    executeItemAction: (fieldname: string, systemData: System, value?: string) => void
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
    playbackSettings: PlaybackSettings
    playbackState: PlaybackState
    playback: ActionDispatch<[action: PlaybackAction]>
    updateSystem: (sysData: System) => void
}

export default function EditorWindow({
    visible,
    loading,
    score,
    labels,
    updateParts,
    executeItemAction,
    updatePlaybackFunctions,
    playbackSettings,
    playbackState,
    playback,
    updateSystem
}: EditorWindowProps & HTMLAttributes<HTMLDivElement>) {
    const { selectionOn, getPartName, getPartColor, toggleSelection, extendSelection } = usePartManager(
        score,
        updateParts
    )
    const [gotoTargets, setGotoTargets] = useState<Set<UUID>>(new Set())
    const visibleRef = useRef<boolean>(visible)
    const cursorStyleRef = useRef<PlaybackCursorStyle>('Beat')

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
        cursorStyleRef.current = playbackSettings.selectedCursorStyle
    }, [playbackSettings.selectedCursorStyle])

    const systemId = (uuid: UUID) => 'system-' + uuid

    // In order to minimize re-renders, each SystemNode gets its own cursor update function.
    // const [systemCursorFunctions, setSystemCursorFunctions] = useState<Record<UUID, SystemCursorFunction>>({})
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
        updatePlaybackFunctions({ editorcursor: moveEditorCursor })
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
        // currPartName is used to determine the first system of the part so that the part name only appears once.
        var rangePartName: string = ''
        return score.systems.map((systemData) => {
            // Structure:
            // - Panel Header: contains context menu and System summary information
            // - Panel content (visible when panel is expanded): System grid (SystemNode)
            const partName = getPartName(systemData.uuid)
            const partColor = getPartColor(partName)
            const firstOfRange = partName != rangePartName
            if (firstOfRange) rangePartName = partName
            return (
                // <Profiler key={`profiler-${systemData.uuid}`} id={`sys ${systemData.id}`} onRender={onRender}>
                <Grid key={`grid-${systemData.uuid}`} id="grid-1" className="m-0 flex">
                    <Row>
                        <PartIndicator
                            key={`key-${systemData.uuid}`}
                            uuid={systemData.uuid}
                            partName={partName}
                            partColor={partColor}
                            firstOfRange={firstOfRange}
                            selectionOn={selectionOn}
                            toggleSelection={toggleSelection}
                            extendSelection={extendSelection}
                        />
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
                                labels={labels}
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
    }, [score, playbackState, selectionOn])

    return (
        // While an execution form is open, mark the editor content inert (no editing)
        // but keep it scrollable: inert content is skipped in hit-testing, so wheel
        // events reach the scrollable ancestor; the Drawer is portaled to <body>.
        <ExecutionFormContext.Provider value={setExecutionFormOpen}>
            <div className="contents" inert={openFormCount > 0 ? true : undefined}>
                <VStack id="Editor Window">
                    {loading ? <Placeholder.Grid rows={12} columns={6} /> : <>{systems}</>}
                </VStack>
            </div>
        </ExecutionFormContext.Provider>
    )
}
