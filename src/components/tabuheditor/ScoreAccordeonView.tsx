import { Accordion, HStack, Input, Placeholder, Text, VStack } from 'rsuite'
import type { Score, Stave, TableRowDataType } from '../../models/types'
import { useEffect, useState, type Dispatch, type HTMLAttributes, type ReactNode } from 'react'
import 'rsuite/Accordion/styles/index.css'
import 'rsuite/Input/styles/index.css'
import 'rsuite/Placeholder/styles/index.css'
import 'rsuite/Divider/styles/index.css'
import { getTextWidthInPx } from '../../utils/measurements'
import { editorInitialExpandState, positionConfigs } from '../../config/config'

var uniqueKeyValue = 0

function uniqueKey() {
    uniqueKeyValue += 1
    return uniqueKeyValue
}

function SystemDetails({ staffs, colWidths }: { staffs: [string, Stave[]][]; colWidths: number[] }): ReactNode {
    const staffNodes = staffs.map(([pos, staves]: [string, Stave[]]) => {
        const staveNodes = staves.map((stave: Stave, idx: number) => {
            const width: string = getTextWidthInPx('x'.repeat(colWidths[idx]), 14) + 15 + 'px'
            return (
                <>
                    <Input
                        key={idx}
                        defaultValue={stave.notation.map((jSym) => jSym.s).join('')}
                        // as="div"
                        style={{ width: width }}
                        className={`balifont10 h-5 overflow-clip p-0`}
                    />
                </>
            )
        })
        return (
            <HStack className="w-full">
                <Text as="div" className="w-50 h-5">
                    {pos}
                </Text>
                {staveNodes}
            </HStack>
        )
    })
    return <VStack>{staffNodes}</VStack>
}

export function ScoreAccordeonView({
    score,
    expanded,
    setExpanded,
    loading,
    ...props
}: {
    score: Score
    expanded: Record<number, boolean>
    loading: boolean
    setExpanded: Dispatch<Record<number, boolean>>
} & HTMLAttributes<HTMLDivElement>) {
    const [data, setData] = useState<Record<string | number, any>[]>([])
    const [processing, setProcessing] = useState<boolean>(false)

    function flipExpanded(id: number) {
        const newExpanded = {}
        Object.assign(newExpanded, expanded, Object.fromEntries([[id, !expanded[id]]]))
        setExpanded(newExpanded)
    }

    useEffect(() => {
        setProcessing(true)
        const newData: TableRowDataType[] = []
        score.systems.forEach((system) => {
            const positions = Object.keys(system.sections[0].staves)
            const colWidths = system.sections.map((section) =>
                Math.max(...Object.values(section.staves).map((stave) => stave.notation.length))
            )
            const staffs = positions.map((position) => [
                positionConfigs[position].name,
                system.sections.map((section) => section.staves[position]).flat(1)
            ])
            const summary = {
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
        console.log(newData)
        setData(newData)
        const initExpandState = Object.fromEntries(newData.map((sysInfo) => [sysInfo.id, editorInitialExpandState]))
        setExpanded(initExpandState)
        setProcessing(false)
    }, [score])

    const systems = data.map((sys) => {
        return (
            <Accordion.Panel
                key={sys.key}
                header={`${sys.id} ${sys.part}`}
                expanded={expanded[sys.id]}
                onSelect={() => {
                    flipExpanded(sys.id)
                }}>
                <SystemDetails staffs={sys.staffs} colWidths={sys.colWidths} />
            </Accordion.Panel>
        )
    })

    return (
        <div className="w-full">
            {loading || processing ? <Placeholder.Grid rows={12} columns={6} /> : <Accordion>{systems}</Accordion>}
        </div>
    )
}
