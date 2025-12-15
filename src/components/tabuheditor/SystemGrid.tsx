import { useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type RefObject } from 'react'
import type { EditorCellCursor, EditorSystemData, PlayBackState, Stave } from '../../models/types'
import { AudioFunctions, NavigationFunctions, type AudioFunctionsType } from './contexts'
import { getTextWidthInPx } from '../../utils/measurements'
import { getValidSymbols } from '../../utils/alphabet'
import { NavigationCell } from './NavigationCell'
import { Col, Grid, HStack, Row, Text, VStack } from 'rsuite'
import { IoPauseCircle, IoPlayCircle, IoPlayCircleOutline } from 'react-icons/io5'
import { positionConfigs, type NavigationAction } from '../../config/config'
import type { GridInfo, NavigationFunctionsType } from './_types'
import { noCursor } from './_constants'
import _ from 'lodash'

// Contains the editable notation of one system (gongan)
export function SystemGrid({
    systemData,
    pbState,
    setPbState,
    cursorMovement,
    ...props
}: {
    systemData: EditorSystemData
    pbState: PlayBackState
    setPbState: Dispatch<PlayBackState>
    cursorMovement: EditorCellCursor
}): ReactNode {
    const audioFunc: AudioFunctionsType = useContext(AudioFunctions)
    const [playbackActive, setPlaybackActive] = useState<boolean>(false)
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const [currCursor, setCurrCursor] = useState<EditorCellCursor>(noCursor)
    const posToRow = Object.fromEntries(Object.keys(systemData.staffs).map((key, idx) => [key, idx]))

    function playPauseClicked() {
        if (!playbackActive) {
            audioFunc.playPause(true, [systemData])
            setPbState('playing')
            setPlaybackActive(true)
        } else {
            audioFunc.playPause(!(pbState == 'playing'))
            setPbState(pbState == 'playing' ? 'paused' : 'playing')
        }
    }

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

    const staffNodes = Object.entries(systemData.staffs).map(([pos, staves], pidx) => {
        const staveNodes = staves.map((stave: Stave, sidx: number) => {
            const width: string = getTextWidthInPx('x'.repeat(systemData.colWidths[sidx]), 14) + 15 + 'px'
            const validSymbols: string[] = getValidSymbols(pos, true)
            return (
                <Col id={`COL-${pidx * 100 + sidx}`} key={pidx * 100 + sidx} span="auto">
                    <NavigationCell
                        key={pidx * 100 + sidx}
                        posId={pidx}
                        secId={sidx}
                        validSymbols={validSymbols}
                        defaultValue={stave.notation.map((jSym) => jSym.s).join('')}
                        style={{ width: width }}
                        className={`balifont10 h-5 resize-none overflow-clip p-0`}
                        spellCheck="false"
                    />
                </Col>
            )
        })

        return (
            <Row id={`ROW-${systemData.id}-${pos}`}>
                <Col id={`COL-${systemData.id}-POS`} span="auto">
                    <Text as="div" className="w-40 h-5">
                        {positionConfigs[pos].name}
                    </Text>
                </Col>
                {staveNodes}
            </Row>
        )
    })

    return (
        <>
            <HStack>
                <button onClick={playPauseClicked}>
                    {pbState == 'playing' ? (
                        <IoPlayCircle color="orange" size="2em" />
                    ) : pbState == 'paused' ? (
                        <IoPauseCircle color="orange" size="2em" />
                    ) : (
                        <IoPlayCircleOutline color="gray" size="2em" />
                    )}
                </button>
            </HStack>

            <NavigationFunctions value={navigationFunctions}>
                <Grid>
                    <VStack>{staffNodes}</VStack>
                </Grid>
            </NavigationFunctions>
        </>
    )
}
