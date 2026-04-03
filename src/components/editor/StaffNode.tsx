import { useMemo } from 'react'
import { Col } from 'rsuite'
import type { Measure, Position, System } from '../../typing/types'
import { getValidSymbols } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { getTextWidthInPx } from '../../utils/measurements'
import { MeasureNode } from './MeasureNode'

// Creates a row of cells containing one staff: a line of notation within a system/gongan,
// which corresponds with the notation of a single instrument position.
export function StaffNode({
    sysUuid,
    position,
    rowId,
    measures,
    systemData,
    colWidths
}: {
    sysUuid: string
    position: Position
    rowId: number
    measures: Measure[]
    systemData: System
    colWidths: number[]
}) {
    if (position == 'REYONG_1') debug(`(re-)rendering stave ${sysUuid} ${position}`)

    const measureNodes = useMemo(
        () =>
            measures.map((measure: Measure, sidx: number) => {
                debug(`useMemo: recreating measures of system ${sysUuid} ${position}`)
                const width: string = getTextWidthInPx('x'.repeat(colWidths[sidx]), 14) + 15 + 'px'
                const validSymbols: string[] = getValidSymbols(position, true, true)
                return (
                    <Col id={`COL-${rowId * 100 + sidx}`} key={rowId * 100 + sidx} span="auto">
                        <MeasureNode
                            key={`sys ${sysUuid} ${position} measure ${sidx}`}
                            id={`sys ${sysUuid} ${position} measure ${sidx}`}
                            position={position}
                            rowId={rowId}
                            colId={sidx}
                            validSymbols={validSymbols}
                            measureData={measure}
                            systemData={systemData}
                            defaultValue={measure.notation.join('')}
                            style={{ width: width }}
                            className={`balifont10 h-5 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                            spellCheck="false"
                        />
                    </Col>
                )
            }),
        [systemData]
    )

    return <>{measureNodes}</>
}
