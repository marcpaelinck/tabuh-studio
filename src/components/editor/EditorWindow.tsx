import type { ActionDispatch, Dispatch, HTMLAttributes } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Col, Grid, Placeholder, Row, useDialog, VStack } from 'rsuite'
import { usePartManager } from '../../componentlogic/usePartManager'
import { editorInitialExpandState } from '../../config/config'
import type { UUID } from '../../typing/basetypes'
import type {
    EditorCursorParameters,
    PlaybackAction,
    PlaybackCallbackFunctions,
    PlaybackState
} from '../../typing/playback'
import type { Score, System } from '../../typing/score'
import { PartIndicator } from './PartIndicator'
import { SystemNode } from './SystemNode'

export type CMActionType = 'copy' | 'new' | 'modify' | 'delete'

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
    const { sysToPartLookup, selectionOn, getPartName, getPartColor, toggleSelection, extendSelection } =
        usePartManager(score, updateParts)
    const [gotoTargets, setGotoTargets] = useState<Set<UUID>>(new Set())
    const visibleRef = useRef<boolean>(visible)

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    const systemId = (uuid: UUID) => 'system-' + uuid

    const moveEditorCursor = useCallback((time: number, params: EditorCursorParameters) => {
        if (!visibleRef.current) return
        // const sys = (uuid: string | undefined): System | undefined => {
        //     return score?.systems.find((sys) => sys.uuid == uuid)
        // }

        // if (params.prevsysuuid && params.prevsysuuid != params.sysuuid) {
        //     debug(`Close panel ${sys(params.prevsysuuid)?.id}, curr=${sys(params.sysuuid)?.id}`)
        //     expandIfNotExpanded(params.prevsysuuid, false)
        // }
        // if (params.prevsysuuid != params.sysuuid) {
        //     debug(`Open panel ${sys(params.sysuuid)?.id} prev=${sys(params.prevsysuuid)?.id}`)
        //     expandIfNotExpanded(params.sysuuid, true)
        // }
        playback({ actionType: 'cursor', cursor: { sysUuid: params.sysuuid, measure: params.section } })
        console.log(`scrolling to system ${params.sysuuid}`)
        const currElement = document.getElementById(systemId(params.sysuuid))

        currElement?.scrollIntoView({ behavior: 'instant', block: 'center' })
    }, [])

    useEffect(() => updatePlaybackFunctions({ editorcursor: moveEditorCursor }), [])

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
        const initExpandState = Object.fromEntries(
            score.systems.map((sysInfo) => [sysInfo.index, editorInitialExpandState])
        )
    }, [currentScoreId])

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
                                playbackState={playbackState}
                                visible
                                scoreRef={scoreRef}
                                labels={labels}
                                playback={playback}
                                executeItemAction={executeItemAction}
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
        <VStack id="Editor Window" visibility={visible ? 'visible' : 'collapse'}>
            {loading ? <Placeholder.Grid rows={12} columns={6} /> : <>{systems}</>}
        </VStack>
        // </Profiler>
    )
}
