import _ from 'lodash'
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Checkbox, Col, Grid, Row, Text, VStack } from 'rsuite'
import { positionConfigs, type NavigationAction } from '../../config/config'
import { type PlaybackState } from '../../hooks/playbackReducer'
import { useRules } from '../../hooks/useRules'
import type { EditorCellCursor, EditorSystem } from '../../models/types'
import { notation2text } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { StaffNode } from './StaffNode'
import { noCursor } from './_constants'
import type { GridInfo } from './_types'
import { NavigationFunctions, type NavigationFunctionsType } from './contexts'

interface EditorSystemProps {
    systemData: EditorSystem
    positions: string[]
    playbackState: PlaybackState
    updateSystemData: (data: EditorSystem) => void
    visible: boolean
}

// Creates a grid containing the notation of one system/gongan.
export function SystemNode({
    systemData,
    positions,
    playbackState,
    updateSystemData,
    visible,
    ...props
}: EditorSystemProps): ReactNode {
    // const audio: AudioFunctionsType = useContext(AudioFunctions)
    const systemUuid = systemData.uuid
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const [highlightedMeasure, setHighlightedMeasure] = useState<EditorCellCursor>(noCursor)
    const { castNotation } = useRules()

    if (systemData.id == 1 || systemData.id == 13) debug(`(re-)rendering system ${systemUuid}`)

    useEffect(() => debug(playbackState), [playbackState])

    useEffect(() => debug(`recreating system ${systemUuid} due to change of data`), [systemData])

    const navigationFunctions: NavigationFunctionsType = useMemo(() => {
        return {
            register: registerComponent,
            navigate: navigate,
            updateSystemData: updateSystemData,
            applyRules: applyRules
        }
    }, [])

    function highlight(cell: HTMLTextAreaElement | null, on: boolean) {
        if (!cell) return
        const classes = ['border-1', 'border-solid', 'border-red-500']
        classes.forEach((value) => {
            if (on && !cell.classList.contains(value)) cell.classList.add(value)
            if (!on && cell.classList.contains(value)) cell.classList.remove(value)
        })
    }

    // Update the cell highlight during playback. All measures for the current beat are
    // highlighted here at once. This is why we ignore all cursor changes except for the KEMPLI.
    useEffect(() => {
        debug(`new playbackState for sys=${playbackState.cursor.sysUuid}, this is sys ${systemUuid}`)
        // If the cursor has moved to another system we might need to switch off highlighting in the current system.
        if (
            !grid.current ||
            _.isEmpty(grid.current.cells) ||
            (highlightedMeasure == noCursor && playbackState.cursor.sysUuid != systemUuid)
        ) {
            debug(`nothing to highlight (panel closed)`)
            return
        }
        if (_.isEqual(playbackState.cursor, highlightedMeasure)) {
            // Return if the cell cursor hasn't moved: highlighting actions are on individual note symbol level,
            // but highlighting of symbols within a measure is not implemented (yet).
            return
        }
        // Remove highlight from current cells
        if (!_.isEqual(highlightedMeasure, noCursor)) {
            for (var row = 0; row <= grid.current.maxRowId; row++)
                highlight(grid.current.cells[row][highlightedMeasure.measure].current, false)
        }
        if (playbackState.cursor.sysUuid == systemUuid && playbackState.cursor != noCursor) {
            // Highlight cell
            debug(`Highlighting sys=${playbackState.cursor.sysUuid} measure=${playbackState.cursor.measure}`)
            for (var row = 0; row <= grid.current.maxRowId; row++) {
                highlight(grid.current.cells[row][playbackState.cursor.measure].current, true)
            }
            setHighlightedMeasure(playbackState.cursor)
        } else {
            setHighlightedMeasure(noCursor)
        }
    }, [playbackState])

    function registerComponent(row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) {
        if (!element) {
            throw new Error('Missing element')
        }
        if (!(row in grid.current.cells)) grid.current.cells[row] = {}
        grid.current.cells[row][col] = element
        grid.current.maxRowId = Math.max(row, grid.current.maxRowId)
        grid.current.maxColId = Math.max(col, grid.current.maxColId)
    }

    // Returns neighbouring cell (above, below, left, right, row start, row end)
    function navigate(action: NavigationAction, row: number, col: number) {
        switch (action) {
            case 'cellup':
                if (row > 0) return grid.current.cells[row - 1][col]
                return nullpointer
            case 'celldown':
                if (row + 1 in grid.current.cells) return grid.current.cells[row + 1][col]
                return nullpointer
            case 'cellleft':
                if (col > 0) return grid.current.cells[row][col - 1]
                return nullpointer
            case 'cellright':
                if (col + 1 in grid.current.cells[row]) return grid.current.cells[row][col + 1]
                return nullpointer
            case 'rowstart':
                return grid.current.cells[row][0]
            case 'rowend':
                return grid.current.cells[row][grid.current.maxColId]
            case 'firstrow':
                return grid.current.cells[0][col]
            case 'lastrow':
                return grid.current.cells[grid.current.maxRowId][col]
        }
    }

    // Fills the notation of the given measure (colId) for all grouped instruments
    // by casting the given notation for each instrument.
    function applyRules(notation: string[], rowId: number, colId: number, cached: boolean) {
        // Input should currently come from Pemade polos part
        // TODO add a separate input field for grouped positions
        if (positions[rowId] != 'PEMADE_POLOS') return
        const newSystemData = { ...systemData }
        positions.forEach((position) => {
            if (!systemData.grouped.includes(position)) return
            const newNotation = castNotation(notation, position, colId)
            if (cached) newSystemData.staffs[position][colId].notation_ = newNotation
            else newSystemData.staffs[position][colId].notation = newNotation
            debug(`updated notation of ${position} to ${notation2text(newNotation)}`)
        })
        updateSystemData(newSystemData)
    }

    function updateGrouped(position: string, isGrouped: boolean) {
        const newSysData = { ...systemData }
        if (isGrouped && !newSysData.grouped.includes(position)) newSysData.grouped.push(position)
        else {
            const idx = newSysData.grouped.indexOf(position)
            if (idx > -1) newSysData.grouped.splice(idx, 1)
        }
        updateSystemData(newSysData)
    }

    const staffNodes = useMemo(
        () =>
            Object.entries(systemData.staffs).map(([position, measures], rowId) => {
                if (systemData.index == 0) debug(`useMemo: recreating staffnodes of system ${systemUuid}`)
                return (
                    <Row id={`ROW-${position}`}>
                        <Col id={`COL-POSITION`} span="auto">
                            <Text as="div" className="w-40 h-5">
                                {positionConfigs[position].name}
                            </Text>
                        </Col>
                        <Col id={`COL-POSITION`} span="auto">
                            <Checkbox
                                defaultChecked={systemData.grouped.includes(position)}
                                onChange={(_, checked) => updateGrouped(position, checked)}
                            />
                        </Col>
                        <StaffNode
                            sysUuid={systemUuid}
                            position={position}
                            rowId={rowId}
                            measures={measures}
                            systemData={systemData}
                            colWidths={systemData.colWidths}
                        />
                    </Row>
                )
            }),
        [systemData, visible]
    )

    return (
        visible && (
            <NavigationFunctions value={navigationFunctions}>
                <Grid className="ml-4">
                    <VStack>{staffNodes}</VStack>
                </Grid>
            </NavigationFunctions>
        )
    )
}
