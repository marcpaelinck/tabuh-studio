import { Col } from 'rsuite'
import { getTextWidthInPx } from '../../utils/measurements'
import { MeasureNode } from './MeasureNode'
import { getValidSymbols } from '../../utils/alphabet'
import type { EditorSystemData, Measure } from '../../models/types'
import _ from 'lodash'
import { debug } from '../../utils/debugger'

// Creates a row of cells containing one staff: a line of notation within a system/gongan,
// which corresponds with the notation of a single instrument position.
export function StaffNode({
    systemId,
    position,
    rowId,
    measures,
    systemData,
    colWidths
}: {
    systemId: number
    position: string
    rowId: number
    measures: Measure[]
    systemData: EditorSystemData
    colWidths: number[]
}) {
    if (position == 'REYONG_1') debug(`(re-)rendering stave ${systemId} ${position}`, StaffNode.name)

    const measureNodes = //useMemo(
        //     () =>
        measures.map((measure: Measure, sidx: number) => {
            debug(`useMemo: recreating measures of system ${systemId} ${position}`, StaffNode.name)
            const width: string = getTextWidthInPx('x'.repeat(colWidths[sidx]), 14) + 15 + 'px'
            const validSymbols: string[] = getValidSymbols(position, true)
            const currValue = measure.notation_ ? measure.notation_ : measure.notation
            return (
                <Col id={`COL-${rowId * 100 + sidx}`} key={rowId * 100 + sidx} span="auto">
                    <MeasureNode
                        key={`sys ${systemId} ${position} measure ${sidx}`}
                        id={`sys ${systemId} ${position} measure ${sidx}`}
                        position={position}
                        rowId={rowId}
                        colId={sidx}
                        validSymbols={validSymbols}
                        measureData={measure}
                        systemData={systemData}
                        defaultValue={measure.notation.map((jSym) => jSym.s).join('')}
                        style={{ width: width }}
                        className={`balifont10 h-5 border-1 border-solid border-gray-200 resize-none overflow-clip p-0`}
                        spellCheck="false"
                    />
                </Col>
            )
        })
    //         ,
    //     [systemData]
    // )

    return (
        // <Row id={`ROW-${position}`}>
        //     <Col id={`COL-POSITION`} span="auto">
        //         <Text as="div" className="w-40 h-5">
        //             {positionConfigs[position].name}
        //         </Text>
        //     </Col>
        //     <Col id={`COL-POSITION`} span="auto">
        //         <Checkbox defaultChecked={grouped} onChange={(value, checked) => setGrouped(checked)} />
        //     </Col>
        <>{measureNodes}</>
        // </Row>
    )
}
