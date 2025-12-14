// NavigationGrid and NavigationInputCell enable to navigate horizontally and vertically
// through a table-shaped Grid structure (i.e. with equal number of columns in each row).

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type Context,
    type HTMLProps,
    type ReactElement,
    type RefObject
} from 'react'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import { Grid, HStack, IconButton, type GridProps } from 'rsuite'
import { useKeyboardListener } from '../../hooks/useKeyboard'
import type { NavigationAction } from '../../config/config'
import { useScheduler } from '../../hooks/createSchedule'
import { type EditorSystemData, type TimeLine } from '../../models/types'
import { createTimelineFromEditor } from '../../utils/scoreplayerUtils/score'
import * as Tone from 'tone'

interface NavigationGridProps extends GridProps {
    id?: string
}

interface NavigationCellProps extends HTMLProps<HTMLTextAreaElement> {
    posId: number
    secId: number
    validSymbols: string[]
}

interface NavigationFunctionsType {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => void
    navigate: (action: NavigationAction, row: number, col: number) => RefObject<HTMLTextAreaElement | null>
    setSystemData: (data: EditorSystemData) => void
    play: (data: EditorSystemData[], pbSpeed?: number) => void
}

type OptionsType = { singleSystem: boolean; loop: boolean }

const defaultNavFunc: NavigationFunctionsType = {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => {},
    navigate: (action: NavigationAction, row: number, col: number): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    setSystemData: (data: EditorSystemData) => {},
    play: (data: EditorSystemData[], pbSpeed?: number) => {}
}

const NavigationFunctions: Context<NavigationFunctionsType> = createContext(defaultNavFunc)

type GridRowInfo = Record<number, RefObject<HTMLTextAreaElement | null>>
type GridInfo = { maxRowId: number; maxColId: number; cells: Record<number, GridRowInfo> }

// Extension of the React Suite Grid element with additional facilities to enable keyboard navigation
// Each row in NavigationGrid should contain the same number of columns otherwise an exception is raised.
export function NavigationGrid({ ...props }: NavigationGridProps): ReactElement<GridProps> {
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const [systemData, setSystemData] = useState<EditorSystemData | null>(null)
    const [updateSchedule] = useScheduler()

    function play() {
        if (!systemData) return
        const timeLine = createTimelineFromEditor([systemData])
        updateSchedule(timeLine)
        Tone.getTransport().start()
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

    const navigationFunctions: NavigationFunctionsType = {
        register: registerComponent,
        navigate: navigate,
        setSystemData: setSystemData,
        play: play
    }

    return (
        <>
            <HStack>
                <IconButton icon={<PlayOutlineIcon />} />
            </HStack>
            <NavigationFunctions value={navigationFunctions}>
                <Grid {...props} />
            </NavigationFunctions>
        </>
    )
}

export function NavigationInputCell({ posId, secId, validSymbols, ...props }: NavigationCellProps) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const navFunc: NavigationFunctionsType = useContext(NavigationFunctions)
    const [keyboardListener] = useKeyboardListener(ref, validSymbols, (action: NavigationAction) =>
        navFunc.navigate(action, posId, secId)
    )

    useEffect(() => {
        navFunc.register(posId, secId, ref)
    }, [])

    function onFocus(on: boolean) {
        if (on) ref.current?.addEventListener('keydown', keyboardListener)
        else ref.current?.removeEventListener('keydown', keyboardListener)
    }

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        console.log('changed')
    }

    return (
        <textarea
            ref={ref}
            onChange={(e) => handleChange(e)}
            onFocus={() => onFocus(true)}
            onBlur={() => onFocus(false)}
            {...props}
        />
    )
}
