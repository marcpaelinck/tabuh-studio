import { useMemo } from 'react'
import { Col } from 'rsuite'
import type { Position } from '../../typing/instruments'
import type { Measure, System } from '../../typing/score'
import { getValidSymbols } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { getTextWidthInPx } from '../../utils/measurements'
import { MeasureNode } from './MeasureNode'

// Creates a row of cells containing one staff: a line of notation within a system/gongan,
// which corresponds with the notation of a single instrument position.
export function StaffNode({
    sysUuid,
    position,
    rowIdx,
    measures,
    systemData,
    colWidths
}: {
    sysUuid: string
    position: Position
    rowIdx: number
    measures: Measure[]
    systemData: System
    colWidths: number[]
}) {
    if (position == 'REYONG_1') debug(`(re-)rendering stave ${sysUuid} ${position}`)

    const measureNodes = useMemo(
        () =>
            measures.map((measure: Measure, sectIdx: number) => {
                debug(`useMemo: recreating measures of system ${sysUuid} ${position}`)
                const width: string = getTextWidthInPx('x'.repeat(colWidths[sectIdx]), 14) + 15 + 'px'
                const validSymbols: string[] = getValidSymbols(position, true, true)
                return (
                    <Col id={`COL-${rowIdx * 100 + sectIdx}`} key={rowIdx * 100 + sectIdx} span="auto">
                        <MeasureNode
                            key={`sys ${sysUuid} ${position} measure ${sectIdx}`}
                            id={`sys ${sysUuid} ${position} measure ${sectIdx}`}
                            position={position}
                            rowIdx={rowIdx}
                            colIdx={sectIdx}
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
