import { Accordion, HStack, Text, VStack } from 'rsuite'
import type { Score, Stave, TableRowDataType } from '../../models/types'
import { useEffect, useState, type ReactNode } from 'react'
import 'rsuite/Accordion/styles/index.css'

// Temporary workaround to enable Tailwind to create necessary css formats.
const textWidths: Record<number, string> = {
    1: 'w-[1rem]',
    2: 'w-[2rem]',
    3: 'w-[3rem]',
    4: 'w-[4rem]',
    5: 'w-[5rem]',
    6: 'w-[6rem]',
    7: 'w-[7rem]',
    8: 'w-[8rem]',
    9: 'w-[9rem]',
    10: 'w-[10rem]',
    11: 'w-[11rem]',
    12: 'w-[12rem]',
    13: 'w-[13rem]',
    14: 'w-[14rem]',
    15: 'w-[15rem]',
    16: 'w-[16rem]',
    17: 'w-[17rem]',
    18: 'w-[18rem]',
    19: 'w-[19rem]',
    20: 'w-[20rem]',
    21: 'w-[21rem]',
    22: 'w-[22rem]',
    23: 'w-[23rem]',
    24: 'w-[24rem]',
    25: 'w-[25rem]',
    26: 'w-[26rem]',
    27: 'w-[27rem]',
    28: 'w-[28rem]',
    29: 'w-[29rem]',
    30: 'w-[30rem]',
    31: 'w-[31rem]',
    32: 'w-[32rem]',
    33: 'w-[33rem]',
    34: 'w-[34rem]',
    35: 'w-[35rem]',
    36: 'w-[36rem]',
    37: 'w-[37rem]',
    38: 'w-[38rem]',
    39: 'w-[39rem]',
    40: 'w-[40rem]',
    41: 'w-[41rem]',
    42: 'w-[42rem]',
    43: 'w-[43rem]',
    44: 'w-[44rem]',
    45: 'w-[45rem]',
    46: 'w-[46rem]',
    47: 'w-[47rem]',
    48: 'w-[48rem]',
    49: 'w-[49rem]',
    50: 'w-[5r0em]'
}

function SectionDetails({ staffs, colWidths }: { staffs: [string, Stave[]][]; colWidths: number[] }): ReactNode {
    const staffNodes = staffs.map(([pos, staves]: [string, Stave[]]) => {
        const staveNodes = staves.map((stave: Stave, idx: number) => {
            const remsize = Math.ceil(colWidths[idx] * 0.68 + 1)
            return (
                <Text as="div" className={`balifont10 ${textWidths[remsize]} h-5 overflow-clip`}>
                    {stave.notation.map((jSym) => jSym.s).join('')}
                </Text>
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

export function ScoreAccordeonView({ score }: { score: Score }) {
    const [data, setData] = useState<Record<string | number, any>[]>([])

    useEffect(() => {
        const newData: TableRowDataType[] = []
        score.systems.forEach((system) => {
            const positions = Object.keys(system.sections[0].staves)
            const colWidths = system.sections.map((section) =>
                Math.max(...Object.values(section.staves).map((stave) => stave.notation.length))
            )
            const staffs = positions.map((position) => [
                position,
                system.sections.map((section) => section.staves[position]).flat(1)
            ])
            const summary = {
                id: system.id.toString(),
                system: system.id.toString(),
                part: system.part || '-',
                staffs: staffs,
                colWidths: colWidths
            }
            newData.push(summary)
        })
        console.log(newData)
        setData(newData)
    }, [score])

    const sections = data.map((sect) => (
        <Accordion.Panel header={`${sect.id} ${sect.part}`} defaultExpanded>
            <SectionDetails staffs={sect.staffs} colWidths={sect.colWidths} />
        </Accordion.Panel>
    ))

    return (
        <div className="w-full">
            <Accordion>{sections}</Accordion>
        </div>
    )
}
