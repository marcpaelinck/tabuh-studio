import { IconButton, Table, type RowDataType } from "rsuite";
import type { JsonSymbol, Score, TextCursorPosition } from "../../models/types";
import { useMemo, useState, type Dispatch, type HTMLAttributes, type ReactNode, type SVGAttributes } from "react";
import { editorDoNotDisplay, editorFontSize, positionConfigs } from "../../config/config";
import { CellTextContainer } from "./CellTextContainer";
import CollapsedOutline  from "@rsuite/icons/CollaspedOutline"
import ExpandedOutline  from "@rsuite/icons/ExpandOutline"
import "rsuite/Table/styles/index.css"

const { Column, HeaderCell, Cell } = Table;
const rowKey = "id"
const notationRowHeight = 20

const NotationCell = ({ rowData, dataKey, editable, setCursorPosition, ...props }:{rowData: Record<string | number, any>, dataKey: string, editable: boolean, setCursorPosition: Dispatch<TextCursorPosition>} & HTMLAttributes<HTMLDivElement>) => (
  <Cell {...props} style={{ padding: 0 }}>
      <CellTextContainer
        content={rowData[dataKey]}
        editable
        setCursorPosition={setCursorPosition}
        {...props}
      />
  </Cell>
);

const ExpandCell = ({ rowData, dataKey, expandedRowKeys, onChange, ...props }:{ rowData: Record<string | number, any>, dataKey: string, expandedRowKeys: string[] | number[], onChange: CallableFunction}) => (
  <Cell {...props} style={{ padding: 5 }}>
    <IconButton
      appearance="subtle"
      onClick={() => {
        onChange(rowData[dataKey]);
      }}
      icon={
        expandedRowKeys.some(key => key === rowData[dataKey]) ? (
          <CollapsedOutline />
        ) : (
          <ExpandedOutline />
        )
      }
    />
  </Cell>
);

const renderRowExpanded = (rowData: Record<string | number, any> | undefined, score: Score): ReactNode => {
    if (!rowData) return

    const system = score.systems[rowData[rowKey]]
    const positions = Object.keys(system.sections[0].staves)
    const details: Record<string | number, any>[] = []

    positions.forEach((pos) => {
        if (editorDoNotDisplay.includes(pos)) return
        const sysPos: [string, any][] = [["empty", ""],["position", positionConfigs[pos].name]]
        details.push(Object.fromEntries(sysPos.concat(
            system.sections.map((section, idx) => [`sec-${idx}`, section.staves[pos].notation]))
        ) as Record<string , any>[])
    })

    const sections = []
    for (let section=0; section < system.sections.length ; section++) {
        sections.push(
            <Column key={section} width={9.5*details[0][`sec-${section}`].length + 20} align="left" >
                <HeaderCell height={0} >{`${section}`}</HeaderCell>
                {/*@ts-ignore missing rowData attribute*/}
                <NotationCell dataKey={`sec-${section}`} editable  className={`text-[${editorFontSize}pt] balifont bg-blue-50`} setCursorPosition={() => {}} />
            </Column>
        )
    }

  return ( <div className="w-full h-max">
            <Table 
                data={details}
                autoHeight
                // height = {20*positions.length}
                headerHeight={0}
                rowHeight={notationRowHeight}
             >
            <Column key={"empty"} width={50} align="left"  >
                <HeaderCell height={0} >{"empty"}</HeaderCell>
                {/*@ts-ignore missing rowData attribute*/}
                <Cell dataKey={"empty"}  />
            </Column>            
            <Column key={"position"} width={editorFontSize * 10} align="left" >
                <HeaderCell height={0} >{"position"}</HeaderCell>
                {/*@ts-ignore missing rowData attribute*/}
                <NotationCell dataKey={"position"} editable={false} className={`text-[${editorFontSize}px] font-sans`} />
            </Column>
            {sections}
           </Table>
           </div>
        )
};


export function ScoreTableView({score}:{score: Score}) {

    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
    const [tableLoading, setTableLoading] = useState<boolean>(false)
    const [nrPositions, setNrPositions] = useState<number>(0)

    const systemSummary  = useMemo<Record<string | number, any>[]>(() => {
       setTableLoading(true)
       setExpandedRowKeys([])
       var totPositions=0
       const summary: Record<string | number, any>[] = []
       score.systems.forEach((system) => {
            summary.push({id: system.id.toString(), system: system.id.toString(), part: system.part || "-"})
            totPositions = Math.max(totPositions, Object.keys(system.sections[0].staves).filter((pos) => !editorDoNotDisplay.includes(pos)).length)
        })
        setNrPositions(totPositions)
        setTableLoading(false)
        return summary
    }, [score])

    const handleExpanded = (rowId: string) => {
        let open = false;
        const nextExpandedRowKeys = [];

        expandedRowKeys.forEach(key => {
            if (key === rowId) {
                open = true;
            } else {
                nextExpandedRowKeys.push(key);
            }
        });

        if (!open) {
        nextExpandedRowKeys.push(rowId);
        }

        setExpandedRowKeys(nextExpandedRowKeys);
    };


    return (
        <div className="w-full">
    <Table 
        shouldUpdateScroll={false} // Prevent the scrollbar from scrolling to the top after the table content area height changes.
        fillHeight
        rowHeight={30}
        loading={tableLoading}
        hover={false}
        // @ts-ignore unexpected typing
        data={systemSummary}
        rowKey={rowKey}
        expandedRowKeys={expandedRowKeys}
        rowExpandedHeight={(notationRowHeight+1)*nrPositions} 
        cellBordered
        renderRowExpanded={(rowData: Record<string | number, any>[] | undefined) => renderRowExpanded(rowData, score)}
    >
      <Column width={100} align="center" fixed>
        <HeaderCell> </HeaderCell>
         <ExpandCell dataKey="id" rowData={systemSummary} expandedRowKeys={expandedRowKeys} onChange={handleExpanded} />
      </Column>
      <Column width={100} align="center" fixed>
        <HeaderCell>System</HeaderCell>
        <Cell dataKey="system" />
      </Column>
      <Column width={200} align="left" fixed>
        <HeaderCell>Part</HeaderCell>
        <Cell dataKey="part" />
      </Column>

      {/* {sections} */}

    </Table>
    </div>
  )
}