import _ from 'lodash'
import type { ActionDispatch, Dispatch, HTMLAttributes } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Col, Grid, Placeholder, Row, useDialog, VStack } from 'rsuite'
import { usePartManager } from '../../componentlogic/usePartManager'
import type { UUID } from '../../typing/basetypes'
import type {
    EditorCursorParameters,
    PlaybackAction,
    PlaybackCallbackFunctions,
    PlaybackState
} from '../../typing/playback'
import type { Score, System } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { PartIndicator } from './PartIndicator'
import { SystemNode } from './SystemNode'

export type CMActionType = 'copy' | 'new' | 'modify' | 'delete'

export type SystemCursorFunction = (cursor: EditorCursorParameters) => void

interface EditorWindowProps {
    visible: boolean
    loading: boolean
    score: Score
    currentScoreId: UUID
    labels: Record<string, System>
    updateParts: (parts: Record<string, string[]>) => void
    executeItemAction: (fieldname: string, systemData: System, value?: string) => void
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
    playbackState: PlaybackState
    playback: ActionDispatch<[action: PlaybackAction]>
}

export default function EditorWindow({
    visible,
    loading,
    score,
    currentScoreId,
    labels,
    updateParts,
    executeItemAction,
    updatePlaybackFunctions,
    playbackState,
    playback
}: EditorWindowProps & HTMLAttributes<HTMLDivElement>) {
    const { selectionOn, getPartName, getPartColor, toggleSelection, extendSelection } = usePartManager(
        score,
        updateParts
    )
    const [gotoTargets, setGotoTargets] = useState<Set<UUID>>(new Set())
    const visibleRef = useRef<boolean>(visible)

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    const systemId = (uuid: UUID) => 'system-' + uuid

    // In order to minimize re-renders, each SystemNode gets its own cursor update function.
    // const [systemCursorFunctions, setSystemCursorFunctions] = useState<Record<UUID, SystemCursorFunction>>({})
    // const [systemCursorFunctions, setSystemCursorFunctions] = useState<Record<UUID, SystemCursorFunction>>({})

    const systemCursorFunctions = useRef<Record<UUID, SystemCursorFunction>>({})

    // This function is passed to the SystemNode elements, so that they can each add their own cursor function
    // to the systemCursorFunctions record.
    function updateCursorFunction(uuid: UUID, func: SystemCursorFunction) {
        // See https://react.dev/learn/queueing-a-series-of-state-updates
        const newFunctions = { ...systemCursorFunctions.current }
        newFunctions[uuid] = func
        systemCursorFunctions.current = newFunctions
        debug(`new CursorFunctions: ${JSON.stringify(_.keys(newFunctions))}`)
        return newFunctions
    }

    // This is the actual editor cursor function. It calls the corresponding SystemCursorFunction.
    const moveEditorCursor = useCallback((time: number, params: EditorCursorParameters) => {
        if (params.sysuuid in systemCursorFunctions.current) {
            debug(`moving cursor in system ${params.sysuuid}`)
            systemCursorFunctions.current[params.sysuuid](params)
            // Reset cursor animation in the previous system
            if (params.prevsysuuid) systemCursorFunctions.current[params.prevsysuuid](params)
        } else {
            debug(
                `cannot move cursor: function for system ${params.sysuuid} not found in ${JSON.stringify(_.keys(systemCursorFunctions.current))}`
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
        setGotoTargets(newGotoTargets)
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
                <Grid key={`grid-${systemData.uuid}`} id="grid-1" className="m-0">
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
                        <Col span={23}>
                            <SystemNode
                                id={systemId(systemData.uuid)}
                                systemData={systemData}
                                positions={score.positions}
                                playbackType={playbackState.playbackType}
                                audioState={playbackState.audioState}
                                // visible={visible}
                                scoreRef={scoreRef}
                                labels={labels}
                                playback={playback}
                                executeItemAction={executeItemAction}
                                updateCursorFunction={updateCursorFunction}
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
        // <Profiler id="App" onRender={onRender}>
        <VStack id="Editor Window">{loading ? <Placeholder.Grid rows={12} columns={6} /> : <>{systems}</>}</VStack>
        // </Profiler>
    )
}
