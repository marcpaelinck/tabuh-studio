import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Col, Grid, Row, Textarea, type TextareaProps } from 'rsuite'
import { castNotation } from '../../componentlogic/castingRulesManager'
import { noCursor, positionConfigs } from '../../config/config'
import type { Position } from '../../typing/instruments'
import type { EditorCellCursor, PlaybackState } from '../../typing/playback'
import type { System } from '../../typing/score'
import { notation2text } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { ScoreFunctions, type ScoreFunctionsType } from '../contexts'
import type { GridInfo } from './_types'

interface EditorSystemProps extends TextareaProps {
    systemData: System
    positions: Position[]
    playbackState: PlaybackState
    visible: boolean
}

// Creates a grid containing the notation of one system/gongan.
export function SystemNode({ systemData, positions, playbackState, visible, ...props }: EditorSystemProps): ReactNode {
    const systemUuid = systemData.uuid
    const grid = useRef<GridInfo>({ maxRowId: 0, maxColId: 0, cells: {} })
    const nullpointer = useRef<HTMLTextAreaElement | null>(null)
    const [highlightedMeasure, setHighlightedMeasure] = useState<EditorCellCursor>(noCursor)
    const scoreFunc: ScoreFunctionsType = useContext(ScoreFunctions)

    if (systemData.id == 1 || systemData.id == 13) debug(`(re-)rendering system ${systemUuid}`)

    useEffect(() => debug(playbackState), [playbackState])

    useEffect(() => debug(`recreating system ${systemUuid} due to change of data`), [systemData])

    // Fills the notation of the given measure (colId) for all grouped instruments
    // by casting the given notation for each instrument.
    function applyRules(notation: string[], rowIdx: number, colIdx: number, cached: boolean) {
        // Input should currently come from Pemade polos part
        // TODO add a separate input field for grouped positions
        if (positions[rowIdx] != 'PEMADE_POLOS') return
        const newSystemData = { ...systemData }
        positions.forEach((position) => {
            if (!systemData.editorGroup.includes(position)) return
            const newNotation = castNotation(notation, newSystemData.staffs[position]!, positions, colIdx, rowIdx)
            if (cached) newSystemData.staffs[position]![colIdx].notation_ = newNotation
            else newSystemData.staffs[position]![colIdx].notation = newNotation
            debug(`updated notation of ${position} to ${notation2text(newNotation)}`)
        })
        scoreFunc.updateSystem(newSystemData)
    }

    const posText = Object.keys(systemData.staffs)
        .map((position) => positionConfigs[position as Position].name)
        .join('\n')
    const notationText = Object.values(systemData.staffs)
        .map((measures) => measures.map((measure) => measure.notation.join('')).join(' '))
        .join('\n')

    const notationArea = useMemo(() => {
        return (
            <Grid className="ml-4">
                <Row>
                    <Col span={3}>
                        <Textarea
                            readOnly
                            autosize
                            maxHeight={1000}
                            className={`courierfont10 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                            defaultValue={posText}
                        />
                    </Col>
                    <Col span={20}>
                        {' '}
                        <Textarea
                            id={props.id}
                            autosize
                            className={`balifont10 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                            spellCheck="false"
                            defaultValue={notationText}
                        />
                    </Col>
                </Row>
            </Grid>
        )
    }, [systemData])

    return visible && notationArea
}
