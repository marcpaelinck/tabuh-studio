import { useContext, useEffect, useReducer, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { CursorAction, EditorCellCursor, EditorSystemData } from '../../models/types'
import { AudioFunctions, NavigationFunctions, type AudioFunctionsType } from './contexts'
import { Col, Grid, HStack, Row, Text, VStack } from 'rsuite'
import { IoPauseCircle, IoPlayCircle, IoPlayCircleOutline } from 'react-icons/io5'
import { type NavigationAction } from '../../config/config'
import type { GridInfo, NavigationFunctionsType } from './_types'
import { noCursor } from './_constants'
import _ from 'lodash'
import { debug } from '../../utils/debugger'
import { playBack, type PlaybackState } from '../../hooks/playbackReducer'
import { StaffNode } from './StaffNode'

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
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const posToRow = Object.fromEntries(Object.keys(systemData.staffs).map((key, idx) => [key, idx]))
    // const [playbackState, playback] = useReducer(playBack, { cursor: noCursor, audioState: 'nodata' })

    // if ([1, 13].includes(systemData.id)) debug(`(re-)rendering system ${systemData.id}`, SystemNode.name)

    // async function stopPlayback(time: number) {
    //     playback({ type: 'stop' })
    //     playback({ type: 'cursor', cursor: noCursor })
    // }

    // function moveCursor(time: number, cAction: CursorAction) {
    //     playback({
    //         type: 'cursor',
    //         cursor: { system: cAction.system, position: cAction.position, measure: cAction.section }
    //     })
    //     debug(
    //         `setting cursor to sys=${cAction.system} pos=${cAction.position} measure=${cAction.section}`,
    //         SystemNode.name
    //     )
    // }

    // function playPauseClicked() {
    //     if (playbackState.audioState == 'nodata') {
    //         playback({
    //             type: 'load',
    //             data: [systemData],
    //             audiofunctions: Object.assign(audio, { moveCursor, genericFunction: stopPlayback })
    //         })
    //     }
    //     if (playbackState.audioState == 'playing') playback({ type: 'pause' })
    //     else playback({ type: 'play' })
    // }

    const navigationFunctions: NavigationFunctionsType = {
        register: registerComponent,
        navigate: navigate,
        updateSystemData: (data: EditorSystemData) => {}
    }

    function registerComponent(row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) {
        if (!element) {
            throw new Error('Missing element')
        }
        // debug(`registering ${row}, ${col}`, SystemGrid.name)
        if (!(row in grid.current.cells)) grid.current.cells[row] = {}
        grid.current.cells[row][col] = element
        grid.current.maxRowId = Math.max(row, grid.current.maxRowId)
        grid.current.maxColId = Math.max(col, grid.current.maxColId)
        // debug(`registering cell (${grid.current.rowCount}, ${grid.current.colCount})`, SystemGrid.name)
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

    const staffNodes = Object.entries(systemData.staffs).map(([position, measures], rowId) => {
        return (
            <StaffNode
                systemId={systemData.id}
                position={position}
                rowId={rowId}
                measures={measures}
                colWidths={systemData.colWidths}
                gridRow={grid.current.cells[posToRow[position]]}
                playbackState={playbackState}
            />
        )
    })

    return (
        <>
            {/* <HStack> */}
            {/* <button onClick={playPauseClicked}>
                    {playbackState.audioState == 'playing' ? (
                        <IoPlayCircle color="orange" size="2em" />
                    ) : playbackState.audioState == 'paused' ? (
                        <IoPauseCircle color="orange" size="2em" />
                    ) : (
                        <IoPlayCircleOutline color="gray" size="2em" />
                    )}
                </button> */}
            {/* </HStack> */}

            <NavigationFunctions value={navigationFunctions}>
                <Grid className="ml-4">
                    <VStack>{staffNodes}</VStack>
                </Grid>
            </NavigationFunctions>
        </>
    )
}
