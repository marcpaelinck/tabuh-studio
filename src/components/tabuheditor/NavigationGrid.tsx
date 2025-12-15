// NavigationGrid and NavigationInputCell enable to navigate horizontally and vertically
// through a table-shaped Grid structure (i.e. with equal number of columns in each row).

import { useEffect, useRef, useState, type ReactElement, type RefObject } from 'react'
import { Grid, type GridProps } from 'rsuite'
import type { NavigationAction } from '../../config/config'
import type { EditorCellCursor, EditorSystemData, SamplerAction } from '../../models/types'
import _ from 'lodash'
import { noCursor } from './_constants'
import { NavigationFunctions } from './contexts'
import type { GridInfo, NavigationFunctionsType, NavigationGridProps } from './_types'

// Extension of the React Suite Grid element with additional facilities to enable keyboard navigation
// Each row in NavigationGrid should contain the same number of columns otherwise an exception is raised.
export function NavigationGrid({
    systemData,
    playInstrument,
    cursorMovement,
    ...props
}: {
    systemData: EditorSystemData
    playInstrument: (time: number, action: SamplerAction) => void
    cursorMovement: EditorCellCursor
} & NavigationGridProps): ReactElement<GridProps> {
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const [currCursor, setCurrCursor] = useState<EditorCellCursor>(noCursor)
    const posToRow = Object.fromEntries(Object.keys(systemData.staffs).map((key, idx) => [key, idx]))

    function highlight(cell: HTMLTextAreaElement, on: boolean) {
        const props = ['border-1', 'border-solid', 'border-red-500']
        props.forEach((prop) => {
            if (on && !cell.classList.contains(prop)) cell.classList.add(prop)
            if (!on && cell.classList.contains(prop)) cell.classList.remove(prop)
        })
    }
    const logging: boolean = false

    useEffect(() => {
        if (cursorMovement.system != systemData.id) return
        if (_.isEqual(cursorMovement, currCursor)) {
            if (logging) console.log(`no change from ${currCursor.position}-${currCursor.measure}`)
            return
        }
        if (logging)
            console.log(
                `yes change from ${currCursor.position}-${currCursor.measure} to ${cursorMovement.position}-${cursorMovement.measure}`
            )
        const currTextArea = _.isEqual(currCursor, noCursor)
            ? null
            : grid.current.cells[posToRow[currCursor.position]][currCursor.measure].current
        if (currTextArea) highlight(currTextArea, false)
        const textArea = grid.current.cells[posToRow[cursorMovement.position]][cursorMovement.measure].current
        if (textArea) highlight(textArea, true)
        setCurrCursor(cursorMovement)
    }, [cursorMovement])

    const navigationFunctions: NavigationFunctionsType = {
        register: registerComponent,
        navigate: navigate,
        updateSystemData: (data: EditorSystemData) => {}
    }

    function registerComponent(row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) {
        if (!element) {
            throw new Error('Missing element')
        }
        // console.log(`registering ${row}, ${col}`)
        if (!(row in grid.current.cells)) grid.current.cells[row] = {}
        grid.current.cells[row][col] = element
        grid.current.maxRowId = Math.max(row, grid.current.maxRowId)
        grid.current.maxColId = Math.max(col, grid.current.maxColId)
        // console.log(`registering cell (${grid.current.rowCount}, ${grid.current.colCount})`)
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

    return (
        <>
            <NavigationFunctions value={navigationFunctions}>
                <Grid {...props} />
            </NavigationFunctions>
        </>
    )
}
