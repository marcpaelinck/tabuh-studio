import type { Dispatch } from "react";
import type { Score, Section, System, TextCursorPosition } from "../../models/types";
import { TextContainer } from "./TextContainer";
import { editorSortingOrder, positionConfigs } from "../../config/config";

const doNotDisplay = ["KEMPLI"]
const colsBetweenSections = 1
const rowsBetweenSystems = 2

export function SectionText({ id, section, row, col, setCursorPosition}: { id: string, section: Section, row: number, col: number, setCursorPosition: Dispatch<TextCursorPosition>}) {
    return (
    <g id= {`section-${id}`} >
        <g id={`tags-${id}`}></g>
        <g id={`staves-${id}`}>
            {Object.entries(section.staves).toSorted(([p1, _1], [p2, _2])=>editorSortingOrder.indexOf(p1) - editorSortingOrder.indexOf(p2)).map(([position, stave], idx) => {
                    const show =!doNotDisplay.includes(position)
                    return (
                    <>
                     {(section.id==1 && show) && <TextContainer key={`pos-${id}-${idx}`} id={`pos-${id}-${idx}`} x={0} y={row+idx} content={[positionConfigs[position].name]} editable={false} setCursorPosition={setCursorPosition}/>}
                      {show && <TextContainer key={`${id}-${idx}`} id={`stave-${id}-${idx}`} x={col} y={(row+idx)} content={stave.notation} editable setCursorPosition={setCursorPosition}/>}
                    </>
                )
                })}
        </g>
    </g>)
}

export function SystemText({ id, system, row, setCursorPosition }: { id: string, system: System, row: number, setCursorPosition: Dispatch<TextCursorPosition>}) {
    var currCol = 12 // x value in char positions for the first section

    return (
    <g id= {`system-${id}`} >
        {system.sections.map((section, idx) => {
                const col = currCol
                currCol += Math.max(...Object.values(section.staves).map((stave) => stave.notation.length)) + colsBetweenSections
                return <SectionText key={idx+100} id={`${id}-${idx}`} section={section} row={row} col={col} setCursorPosition={setCursorPosition}/>
            })}
    </g>)
}

export function ScoreText({ score, setCursorPosition }: { score: Score, setCursorPosition: Dispatch<TextCursorPosition>}) {
    var curRow = 1

    return (
    <g id= {`te-score}`} className="flex display-scroll">
        {score.systems.map((system, idx) => {
                const row = curRow
                curRow += Math.max(...system.sections.map((section) => Object.entries(section.staves).length)) + rowsBetweenSystems
                return <SystemText key={idx} id={`${idx}`} system={system} row={row} setCursorPosition={setCursorPosition}/>
            })
        }
    </g>)
}