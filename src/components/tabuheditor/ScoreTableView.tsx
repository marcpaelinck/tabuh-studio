import { IconButton, Table } from 'rsuite'
import type { Score, System, TableRowDataType, TextCursorPosition } from '../../models/types'
import { useMemo, useState, type Dispatch, type HTMLAttributes, type ReactNode } from 'react'
import { editorDoNotDisplay, editorFontSize, positionConfigs } from '../../config/config'
import { CellTextContainer } from './CellTextContainer'
import CollapsedOutline from '@rsuite/icons/CollaspedOutline'
import ExpandedOutline from '@rsuite/icons/ExpandOutline'
import 'rsuite/Table/styles/index.css'

const { Column, HeaderCell, Cell } = Table
const rowKey = 'id'
const notationRowHeight = 20

const NotationCell = ({
    rowData,
    dataKey,
    editable,
    setCursorPosition,
    ...props
}: {
    rowData: TableRowDataType
    dataKey: string
    editable: boolean
    setCursorPosition: Dispatch<TextCursorPosition>
} & HTMLAttributes<HTMLDivElement>) => (
    <Cell {...props} style={{ padding: 0 }}>
        <CellTextContainer content={rowData[dataKey]} editable {...props} />
    </Cell>
)

const ExpandToggleCell = ({
    rowData,
    dataKey,
    expandedRowKeys,
    updateExpanded,
    ...props
}: {
    rowData: TableRowDataType
    dataKey: string
    expandedRowKeys: (string | number)[]
    updateExpanded: CallableFunction
}) => {
    const [expanded, setExpanded] = useState<boolean>(false)

    const toggleExpanded = () => {
        updateExpanded(rowData[dataKey], !expanded)
        setExpanded(!expanded)
    }

    return (
        <Cell {...props} style={{ padding: 5 }}>
            <IconButton
                appearance="subtle"
                onClick={() => {
                    toggleExpanded()
                }}
                icon={
                    expandedRowKeys.some((key) => key === rowData[dataKey]) ? <CollapsedOutline /> : <ExpandedOutline />
                }
            />
        </Cell>
    )
}

const ExpandedRow = ({ system }: { system: System }): ReactNode => {
    const positions = Object.keys(system.sections[0].staves)
    const details: TableRowDataType[] = []

    positions.forEach((pos) => {
        if (editorDoNotDisplay.includes(pos)) return
        const sysPos: [string, any][] = [
            ['empty', ''],
            ['position', positionConfigs[pos].name]
        ]
        details.push(
            Object.fromEntries(
                sysPos.concat(system.sections.map((section, idx) => [`sec-${idx}`, section.staves[pos].notation]))
            ) as TableRowDataType[]
        )
    })

    const sections = []
    for (let section = 0; section < system.sections.length; section++) {
        sections.push(
            <Column key={section} width={9.5 * details[0][`sec-${section}`].length + 20} align="left">
                <HeaderCell height={0}>{`${section}`}</HeaderCell>
                {/*@ts-ignore missing rowData attribute*/}
                <NotationCell
                    dataKey={`sec-${section}`}
                    editable
                    className={`text-[${editorFontSize}pt] balifont bg-blue-50`}
                    setCursorPosition={() => {}}
                />
            </Column>
        )
    }

    return (
        <div className="w-full h-max">
            <Table
                data={details}
                autoHeight
                // height = {20*positions.length}
                headerHeight={0}
                rowHeight={notationRowHeight}>
                <Column key={'empty'} width={50} align="left">
                    <HeaderCell height={0}>{'empty'}</HeaderCell>
                    {/*@ts-ignore missing rowData attribute*/}
                    <Cell dataKey={'empty'} />
                </Column>
                <Column key={'position'} width={editorFontSize * 10} align="left">
                    <HeaderCell height={0}>{'position'}</HeaderCell>
                    {/*@ts-ignore missing rowData attribute*/}
                    <NotationCell
                        dataKey={'position'}
                        editable={false}
                        className={`text-[${editorFontSize}px] font-sans`}
                    />
                </Column>
                {sections}
            </Table>
        </div>
    )
}

export function ScoreTableView({ score }: { score: Score }) {
    const [expandedRowKeys, setExpandedRowKeys] = useState<(string | number)[]>([])
    const [tableLoading, setTableLoading] = useState<boolean>(false)

    // const tableData = useMemo<TableRowDataType[]>(() => {

    // }, [score])

    const systemSummary = useMemo<TableRowDataType[]>(() => {
        setExpandedRowKeys([])
        var totPositions = 0
        const summary: TableRowDataType[] = []
        score.systems.forEach((system) => {
            summary.push({ id: system.id.toString(), system: system.id.toString(), part: system.part || '-' })
            totPositions = Math.max(
                totPositions,
                Object.keys(system.sections[0].staves).filter((pos) => !editorDoNotDisplay.includes(pos)).length
            )
        })
        setTableLoading(false)
        return summary
    }, [score])

    // Updates the list containing the ids of the expanded rows
    const updateExpandedRowList = (rowId: string, add: boolean) => {
        if (add == expandedRowKeys.includes(rowId)) {
            console.error(
                `Trying to ${add ? 'expand' : 'collapse'} a row that is already ${add ? 'expanded' : 'collapsed'}.`
            )
            return
        }
        const newList = expandedRowKeys.slice()
        const idx = newList.indexOf(rowId)
        if (add) newList.push(rowId)
        else newList.splice(idx, 1)
        setExpandedRowKeys(newList)
    }

    // Calculates the height of the ExpandedRow item that corresponds with the selected section row
    const expandedHeight = (sectionRowData: TableRowDataType | undefined): number => {
        if (!sectionRowData) return 0
        const posCount = Object.keys(score.systems[sectionRowData[rowKey]].sections[0].staves).length
        return posCount * (notationRowHeight + 1)
    }

    // Renders the exapanded content of the selected row
    const renderRowExpanded = (systemRowData: TableRowDataType | undefined): ReactNode => {
        if (!systemRowData) return
        const system = score.systems.find((system) => system.id == systemRowData[rowKey])
        if (system) return <ExpandedRow system={system} />
        console.error(`Could not expand table row: system with id=${systemRowData[rowKey]} not found.`)
    }

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
                rowExpandedHeight={expandedHeight}
                cellBordered
                renderRowExpanded={renderRowExpanded}>
                <Column width={100} align="center" fixed>
                    <HeaderCell> </HeaderCell>
                    <ExpandToggleCell
                        dataKey={rowKey}
                        rowData={systemSummary}
                        expandedRowKeys={expandedRowKeys}
                        updateExpanded={updateExpandedRowList}
                    />
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
