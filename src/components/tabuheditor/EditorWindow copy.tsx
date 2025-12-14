import { Accordion, Col, Placeholder, Row, Text, VStack } from 'rsuite'
import type { Score, Stave, EditorSystemData, Staffs } from '../../models/types'
import { useEffect, useState, type Dispatch, type HTMLAttributes, type ReactNode } from 'react'
import 'rsuite/Accordion/styles/index.css'
import 'rsuite/Input/styles/index.css'
import 'rsuite/Placeholder/styles/index.css'
import 'rsuite/Divider/styles/index.css'
import 'rsuite/Grid/styles/index.css'
import 'rsuite/Row/styles/index.css'
import 'rsuite/Col/styles/index.css'
import { getTextWidthInPx } from '../../utils/measurements'
import { editorInitialExpandState, editorSortingOrder, positionConfigs } from '../../config/config'
import { NavigationGrid, NavigationInputCell } from '../ControlledGrid/NavigationGrid'
import { getValidSymbols } from '../../utils/alphabet'

var uniqueKeyValue = 0

function uniqueKey(): number {
    uniqueKeyValue += 1
    return uniqueKeyValue
}

function SystemDetails({ systemData }: { systemData: EditorSystemData }): ReactNode {
    // console.log(staffs)
    const staffNodes = Object.entries(systemData.staffs).map(([pos, staves], pidx) => {
        // console.log(staves)
        const staveNodes = staves.map((stave: Stave, sidx: number) => {
            const width: string = getTextWidthInPx('x'.repeat(systemData.colWidths[sidx]), 14) + 15 + 'px'
            const validSymbols: string[] = getValidSymbols(pos, true)
            return (
                <Col id={`COL-${pidx * 100 + sidx}`} key={pidx * 100 + sidx} span="auto">
                    <NavigationInputCell
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

    return <VStack>{staffNodes}</VStack>
}

export default function EditorWindow({
    score,
    expanded,
    setExpanded, // Updates the
    loading,
    ...props
}: {
    score: Score
    expanded: Record<number, boolean>
    loading: boolean
    setExpanded: Dispatch<Record<number, boolean>>
} & HTMLAttributes<HTMLDivElement>) {
    const [data, setData] = useState<EditorSystemData[]>([])
    const [processing, setProcessing] = useState<boolean>(false)

    function flipExpanded(id: number) {
        const newExpanded = {}
        Object.assign(newExpanded, expanded, Object.fromEntries([[id, !expanded[id]]]))
        setExpanded(newExpanded)
    }

    useEffect(() => {
        // Convert new score to data record structure
        setProcessing(true)
        const newData: EditorSystemData[] = []
        score.systems.forEach((system) => {
            const positions = Object.keys(system.sections[0].staves).toSorted(
                (a, b) => editorSortingOrder.indexOf(a) - editorSortingOrder.indexOf(b)
            )
            const colWidths = system.sections.map((section) =>
                Math.max(...Object.values(section.staves).map((stave) => stave.notation.length))
            )
            const staffs: Staffs = Object.fromEntries(
                positions.map((position) => [position, system.sections.map((section) => section.staves[position])])
            )
            const summary: EditorSystemData = {
                id: system.id,
                // Unique key will force to recreate content when new data is loaded
                key: uniqueKey(),
                system: system.id.toString(),
                part: system.part || '-',
                staffs: staffs,
                colWidths: colWidths
            }
            newData.push(summary)
        })
        setData(newData)
        const initExpandState = Object.fromEntries(newData.map((sysInfo) => [sysInfo.id, editorInitialExpandState]))
        setExpanded(initExpandState)
        setProcessing(false)
    }, [score])
    // header={}

    const systems = data.map((systemData) => {
        return (
            <div key={systemData.id} className="relative border-t border-red-100">
                <Accordion.Panel
                    key={systemData.key}
                    header={`${systemData.id} ${systemData.part}`}
                    expanded={expanded[systemData.id]}
                    onSelect={() => {
                        flipExpanded(systemData.id)
                    }}
                    className="justify-between">
                    <NavigationGrid id={`GRID-4(${systemData.id})`} fluid={false} className="ml-0">
                        <SystemDetails systemData={systemData} />
                    </NavigationGrid>
                </Accordion.Panel>
            </div>
        )
    })

    return (
        <div className="w-full">
            {loading || processing ? <Placeholder.Grid rows={12} columns={6} /> : <Accordion>{systems}</Accordion>}
        </div>
    )
}
