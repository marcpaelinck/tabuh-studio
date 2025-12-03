import { Table } from "rsuite";
import type { JsonSymbol, Score, TextCursorPosition } from "../../models/types";
import { useMemo, type Dispatch, type SVGAttributes } from "react";
import { positionConfigs } from "../../config/config";
import { CellTextContainer } from "./CellTextContainer";

const { Column, HeaderCell, Cell } = Table;

const NotationCell = ({ rowData, dataKey, editable, setCursorPosition, ...props }:{rowData: Record<string, any>, dataKey: string, editable: boolean, setCursorPosition: Dispatch<TextCursorPosition>}) => (
  <Cell {...props} style={{ padding: 0 }}>
      <CellTextContainer
        content={rowData[dataKey]}
        editable
        setCursorPosition={setCursorPosition}
      />
  </Cell>
);

export function ScoreTableView({score, setCursorPosition}:{score: Score, setCursorPosition: Dispatch<TextCursorPosition>}) {


    const tabledata = useMemo(() => {
            const data: {[k: string]: any}[] = []
            score.systems.forEach((system) => {
                const positions = Object.keys(system.sections[0].staves)
                positions.forEach((pos) => {
                    const sysPos: [string, any][] = [["system", `${system.id}`], ["position", positionConfigs[pos].name]]
                    data.push(Object.fromEntries(sysPos.concat(
                        system.sections.map((section, idx) => [`sec-${idx}`, section.staves[pos].notation/*.reduce((aggr, sym) => aggr+sym.s, "")*/]))
                    ))
            })
            })
            return data
        }, [score])

    const sections = []

    for (let section=0; section < 8; section++) {
        sections.push(
            <Column key={section} width={100} align="left" >
                <HeaderCell>{`${section}`}</HeaderCell>
                {/*@ts-ignore missing rowData attribute*/}
                <NotationCell dataKey={`sec-${section}`} editable  setCursorPosition={setCursorPosition} />
            </Column>
        )
      }
    console.log(tabledata)
    console.log(sections)

    return (
        <div className="w-full">
    <Table 
      height={600}
      data={tabledata}
      cellBordered
    //   onRowClick={rowData => {
    //     console.log(rowData)
    //   }}
    >
      <Column width={100} align="center" fixed>
        <HeaderCell>System</HeaderCell>
        <Cell dataKey="system" />
      </Column>
      <Column width={200} align="left" fixed>
        <HeaderCell>Position</HeaderCell>
        <Cell dataKey="position" />
      </Column>

      {sections}

    </Table>
    </div>
  )
}