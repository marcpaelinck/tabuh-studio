import _ from 'lodash'
import type { ActionDispatch, Dispatch, HTMLAttributes } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Accordion, Col, Grid, Placeholder, Row, useDialog } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { ReactElement } from 'rsuite/esm/internals/types'
import type { PlaybackAction, PlaybackState } from '../../componentlogic/playbackReducer'
import { usePartManager } from '../../componentlogic/usePartManager'
import { editorInitialExpandState } from '../../config/config'
import type { ActionFunctions, EditorCursorAction, EditorScore, EditorSystem } from '../../typing/types'
import { debug } from '../../utils/debugger'
import { PartIndicator } from './PartIndicator'
import { PlaybackButtons } from './PlaybackButtons'
import { SCol, SummaryItem } from './SummaryItem'
import { SystemNode } from './SystemNode'

export type CMActionType = 'copy' | 'new' | 'modify' | 'delete'

interface EditorWindowProps {
    expanded: Record<string, boolean>
    loading: boolean
    setExpanded: Dispatch<Record<string, boolean>>
    editorScore: EditorScore | undefined
    labels: Record<string, EditorSystem>
    updateSystem: (sysData: EditorSystem) => void
    updateParts: (parts: Record<string, string[]>) => void
    executeItemAction: (fieldname: string, systemData: EditorSystem, value?: string) => void
    scheduleFunctions: ActionFunctions
    setScheduleFunctions: Dispatch<ActionFunctions>
    playbackState: PlaybackState
    playback: ActionDispatch<[action: PlaybackAction]>
}

export default function EditorWindow({
    expanded,
    setExpanded,
    loading,
    editorScore,
    labels,
    updateSystem,
    updateParts,
    executeItemAction,
    scheduleFunctions,
    setScheduleFunctions,
    playbackState,
    playback
}: EditorWindowProps & HTMLAttributes<HTMLDivElement>) {
    const { sysToPartLookup, selectionOn, getPartName, getPartColor, toggleSelection, extendSelection } =
        usePartManager(editorScore, updateParts)
    const [gotoTargets, setGotoTargets] = useState<Set<string>>(new Set())

    function moveEditorCursor(time: number, cAction: EditorCursorAction) {
        const sys = (uuid: string | undefined): EditorSystem | undefined => {
            return editorScore?.systems.find((sys) => sys.uuid == uuid)
        }

        if (cAction.prevsysuuid && cAction.prevsysuuid != cAction.sysuuid) {
            debug(`Close panel ${sys(cAction.prevsysuuid)?.id}, curr=${sys(cAction.sysuuid)?.id}`)
            expandIfNotExpanded(cAction.prevsysuuid, false)
        }
        if (cAction.prevsysuuid != cAction.sysuuid) {
            debug(`Open panel ${sys(cAction.sysuuid)?.id} prev=${sys(cAction.prevsysuuid)?.id}`)
            expandIfNotExpanded(cAction.sysuuid, true)
        }
        playback({ actionType: 'cursor', cursor: { sysUuid: cAction.sysuuid, measure: cAction.section } })
        // debug(`setting cursor to sys=${cAction.sysuuid} measure=${cAction.section}`)
        const currElement = document.getElementById(`${systemIdPrefix}${cAction.sysuuid}`)
        // debug(`scrolling ${currElement?.id} into view`)
        currElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    useEffect(() => setScheduleFunctions({ ...scheduleFunctions, editorcursor: moveEditorCursor }), [])

    const pbCurrUuid = playbackState.cursor.sysUuid
    const pbType = playbackState.playbackType
    const pbAudioState = playbackState.audioState

    const dialog = useDialog()

    useEffect(() => {
        if (playbackState.audioState == 'error') {
            dialog.alert(playbackState.message || 'Playback is not possible, reason unknown.', { title: 'Warning' })
            playback({ actionType: 'reseterror' })
        }
    }, [playbackState])

    function flipExpanded(uuid: string) {
        setExpanded({ ...expanded, ...Object.fromEntries([[uuid, !expanded[uuid]]]) })
    }

    function expandIfNotExpanded(uuid: string, expand: boolean) {
        if (expanded[uuid] != expand) flipExpanded(uuid)
    }

    useEffect(() => {
        if (!editorScore) return
        // TODO this code should only run when a new score is loaded. It currently runs after each
        // update of editorScore.
        const initExpandState = Object.fromEntries(
            editorScore.systems.map((sysInfo) => [sysInfo.index, editorInitialExpandState])
        )
        setExpanded(initExpandState)
        // setScore(editorScore)
    }, [editorScore])

    // Update the list of expanded panels which is maintained in te TabuhEditor.
    // Keys (systems) might have been added or deleted.
    useEffect(() => {
        if (!editorScore) return
        const allKeys = Object.fromEntries(editorScore.systems.map((sys) => [sys.uuid, false]))
        const existingKeys = _.pick(expanded, Object.keys(allKeys))
        setExpanded({ ...allKeys, ...existingKeys })
        // gotoTargets will be used by the 'delete' SummaryItem button for validation.
        var newGotoTargets: Set<string> = new Set()
        editorScore.systems.forEach((sys) => {
            if (sys.execution)
                sys.execution
                    .filter((item) => item.type == 'goto')
                    .forEach((goto) => newGotoTargets.add(goto.targetuuid))
        })
        setGotoTargets(newGotoTargets)
    }, [editorScore])

    // // gotoTargets will be used by the 'delete' SummaryItem button for validation.
    // var gotoTargets: Set<string> = new Set()
    // editorScore.systems.forEach((sys) => {
    //     if (sys.execution)
    //         sys.execution.filter((item) => item.type == 'goto').forEach((goto) => gotoTargets.add(goto.targetuuid))
    // })

    // Create entries for the system selectors in the SummaryItem InputPickers (dropdown menus)
    // This is a list of systems identified by their label if any, otherwise by their id.
    function systemSelectorOptions(self: EditorSystem, includeSelf: boolean, includeNone: boolean) {
        if (!editorScore) return []
        // List of labelled systems
        const labelOptions: InputOption<string>[] = Object.entries(labels).map(([label, sysData]) => ({
            label: label,
            value: sysData.uuid
        }))
        const labelledUuid = labelOptions.map((entry) => entry.value)
        //
        // 2. List of non-labelled systems
        const idOptions: InputOption<string>[] = editorScore.systems
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

    debug(`Current score is title=${editorScore?.title} with ${editorScore?.systems.length} systems`)

    // Objects systemHeaderButtons and systemHeaderFields are created separately with useMemo to
    // minimize rendering because it interferes with the audio playback functions.
    // Thesse objects contain the accordeon panel header content for each system (playback and edit buttons + fields)
    const systemIdPrefix = 'system-'
    const systemHeaderButtons: Record<string, ReactElement> | undefined = useMemo(() => {
        if (!editorScore) return
        return Object.fromEntries(
            editorScore.systems.map((systemData) => {
                debug('updating editor window')

                return [
                    systemData.uuid,
                    <Col key={`sysheader-${systemData.uuid}`} span={3} className="flex">
                        <PlaybackButtons
                            score={editorScore}
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
        )
    }, [editorScore, pbCurrUuid, pbType, pbAudioState])
    const systemHeaderFields: Record<string, ReactElement> | undefined = useMemo(() => {
        if (!editorScore) return

        return Object.fromEntries(
            editorScore.systems.map((systemData) => {
                const execute = (fieldname: string, value?: string) => executeItemAction(fieldname, systemData, value)
                return [
                    systemData.uuid,
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
                            <SummaryItem
                                item="delete"
                                gototargets={gotoTargets}
                                sysData={systemData}
                                execute={execute}
                            />
                        </SCol>
                    </>
                ]
            })
        )
    }, [editorScore])

    const systems = useMemo(() => {
        if (!editorScore || !systemHeaderButtons || !systemHeaderFields) return
        // currPartName is used to determine the first system of the part so that the part name only appears once.
        var rangePartName: string = ''
        return editorScore.systems.map((systemData) => {
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
                        {/* Left margin containing the part name */}
                        <PartIndicator
                            uuid={systemData.uuid}
                            partName={partName}
                            partColor={partColor}
                            firstOfRange={firstOfRange}
                            selectionOn={selectionOn}
                            toggleSelection={toggleSelection}
                            extendSelection={extendSelection}
                        />
                        {/* Expandable panel containing a system */}
                        <Col span={23}>
                            <Accordion.Panel
                                id={`${systemIdPrefix}${systemData.uuid}`}
                                key={systemData.uuid}
                                // Panel Header
                                header={
                                    <Grid
                                        id="systemsummary"
                                        className="ml-0 pt-0 pb-0"
                                        // Avoid expanding the panel when the user clicks on a header item.
                                        onClick={(e) => e.stopPropagation()}>
                                        {/* Displays playback buttons and info about the System */}
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
                                        positions={editorScore.positions}
                                        playbackState={playbackState}
                                        visible={expanded[systemData.uuid]}
                                    />
                                )}
                            </Accordion.Panel>
                        </Col>
                    </Row>
                </Grid>
                // </Profiler>
            )
        })
    }, [editorScore, expanded, playbackState, selectionOn, sysToPartLookup])

    // function onRender(id: string, phase: string, actualDuration: number, baseDuration: number) {
    //     // console.log(`re-rendering id=${id} phase=${phase} duration(ms)=${actualDuration}`)
    // }

    return (
        // <Profiler id="App" onRender={onRender}>
        <>
            {loading ? <Placeholder.Grid rows={12} columns={6} /> : <Accordion className="w-full">{systems}</Accordion>}
        </>
        // </Profiler>
    )
}
