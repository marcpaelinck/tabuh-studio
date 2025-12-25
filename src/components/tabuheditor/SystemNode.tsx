import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { EditorCellCursor, EditorSystemData } from '../../models/types'
import { NavigationFunctions } from './contexts'
import { Grid, VStack } from 'rsuite'
import { type NavigationAction } from '../../config/config'
import type { GridInfo, NavigationFunctionsType } from './_types'
import _ from 'lodash'
import { debug } from '../../utils/debugger'
import { type PlaybackState } from '../../hooks/playbackReducer'
import { StaffNode } from './StaffNode'
import { noCursor } from './_constants'

// Creates a grid containing the notation of one system/gongan.
export function SystemNode({
    systemData,
    sequence,
    update,
    playbackState,
    ...props
}: {
    systemData: EditorSystemData
    sequence: number
    update: (sysData: EditorSystemData, seqId: number) => void
    playbackState: PlaybackState
}): ReactNode {
    // const audio: AudioFunctionsType = useContext(AudioFunctions)
    const systemId = systemData.id
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const posToRow = Object.fromEntries(Object.keys(systemData.staffs).map((key, idx) => [key, idx]))
    const [highlightedCell, setHighlightedCell] = useState<EditorCellCursor>(noCursor)

    debug(`(re-)rendering system ${systemId}`, SystemNode.name)

    const navigationFunctions: NavigationFunctionsType = useMemo(() => {
        return { register: registerComponent, navigate: navigate, updateSystemData: (data: EditorSystemData) => {} }
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
        if (
            playbackState.cursor.position != 'KEMPLI' ||
            !grid ||
            (highlightedCell == noCursor && playbackState.cursor.system != systemId)
        ) {
            debug(`nothing to highlight`, StaffNode.name)
            return
        }

        // If the cursor has moved to another system we might need to switch off highlighting in the current system.
        if (_.isEqual(playbackState.cursor, highlightedCell)) {
            // Return if the cell cursor hasn't moved: highlighting actions are on individual note symbol level,
            // but highlighting of symbols within a measure is not implemented (yet).
            return
        }
        // Remove highlight from current cells
        if (!_.isEqual(highlightedCell, noCursor)) {
            for (var row = 0; row <= grid.current.maxRowId; row++)
                highlight(grid.current.cells[row][highlightedCell.measure].current, false)
        }
        if (playbackState.cursor.system == systemId && playbackState.cursor != noCursor /*&& pbOn*/) {
            // Highlight cell
            debug(
                `Highlighting sys=${playbackState.cursor.system} measure=${playbackState.cursor.measure}`,
                SystemNode.name
            )
            for (var row = 0; row <= grid.current.maxRowId; row++)
                highlight(grid.current.cells[row][playbackState.cursor.measure].current, true)
            setHighlightedCell(playbackState.cursor)
        } else {
            setHighlightedCell(noCursor)
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

    const staffNodes = useMemo(
        () =>
            Object.entries(systemData.staffs).map(([position, measures], rowId) => {
                debug(`useMemo: recreating staffnodes of system ${systemId}`, SystemNode.name)
                return (
                    <StaffNode
                        systemId={systemId}
                        position={position}
                        rowId={rowId}
                        measures={measures}
                        colWidths={systemData.colWidths}
                        // gridRow={grid.current.cells[posToRow[position]]}
                    />
                )
            }),
        [systemData]
    )

    return (
        <NavigationFunctions value={navigationFunctions}>
            <Grid className="ml-4">
                <VStack>{staffNodes}</VStack>
            </Grid>
        </NavigationFunctions>
    )
}
