import { Checkbox, Col, Row, Text } from 'rsuite'
import { getTextWidthInPx } from '../../utils/measurements'
import { MeasureNode } from './MeasureNode'
import { getValidSymbols } from '../../utils/alphabet'
import { positionConfigs } from '../../config/config'
import type { EditorCellCursor, Measure } from '../../models/types'
import { noCursor } from './_constants'
import { useEffect, useState } from 'react'
import type { GridRowInfo } from './_types'
import _ from 'lodash'
import type { PlaybackState } from '../../hooks/playbackReducer'

// Creates a row of cells containing one staff: a line of notation within a system/gongan,
// which corresponds with the notation of a single instrument position.
export function StaffNode({
    systemId,
    position,
    rowId,
    measures,
    colWidths,
    gridRow,
    playbackState
}: {
    systemId: number
    position: string
    rowId: number
    measures: Measure[]
    colWidths: number[]
    gridRow: GridRowInfo
    playbackState: PlaybackState
}) {
    const [highlightedCell, setHighlightedCell] = useState<EditorCellCursor>(noCursor)
    const [pbOn, setPbOn] = useState<boolean>(true)

    function highlight(cell: HTMLTextAreaElement, on: boolean) {
        const classes = ['border-1', 'border-solid', 'border-red-500']
        classes.forEach((value) => {
            if (on && !cell.classList.contains(value)) cell.classList.add(value)
            if (!on && cell.classList.contains(value)) cell.classList.remove(value)
        })
    }

    // Update the cell highlight during playback
    useEffect(() => {
        if (highlightedCell == noCursor && playbackState.cursor.system != systemId) return
        // If the cursor has moved to another system we might need to switch off highlighting in the current system.
        if (_.isEqual(playbackState.cursor, highlightedCell)) {
            // Return if the cell cursor hasn't moved: highlighting actions are on individual note symbol level,
            // but highlighting of symbols within a measure is not implemented (yet).
            return
        }
        const currTextArea = _.isEqual(highlightedCell, noCursor) ? null : gridRow[highlightedCell.measure].current
        if (currTextArea) highlight(currTextArea, false)
        if (playbackState.cursor != noCursor && pbOn) {
            const textArea = gridRow[playbackState.cursor.measure].current
            if (textArea) highlight(textArea, true)
            setHighlightedCell(playbackState.cursor)
        }
    }, [playbackState])

    const measureNodes = measures.map((measure: Measure, sidx: number) => {
        const width: string = getTextWidthInPx('x'.repeat(colWidths[sidx]), 14) + 15 + 'px'
        const validSymbols: string[] = getValidSymbols(position, true)
        return (
            <Col id={`COL-${rowId * 100 + sidx}`} key={rowId * 100 + sidx} span="auto">
                <MeasureNode
                    key={rowId * 100 + sidx}
                    rowId={rowId}
                    colId={sidx}
                    validSymbols={validSymbols}
                    defaultValue={measure.notation.map((jSym) => jSym.s).join('')}
                    style={{ width: width }}
                    className={`balifont10 h-5 resize-none overflow-clip p-0`}
                    spellCheck="false"
                />
            </Col>
        )
    })

    return (
        <Row id={`ROW-${position}`}>
            <Col id={`COL-POSITION`} span="auto">
                <Text as="div" className="w-40 h-5">
                    {positionConfigs[position].name}
                </Text>
            </Col>
            <Col id={`COL-POSITION`} span="auto">
                <Checkbox checked={pbOn} defaultChecked onChange={() => setPbOn(!pbOn)} />
            </Col>
            {measureNodes}
        </Row>
    )
}
