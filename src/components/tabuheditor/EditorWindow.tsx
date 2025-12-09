import { Accordion, Col, Grid, Placeholder, Row, Text, VStack, type InputProps } from 'rsuite'
import type { Score, Stave, TableRowDataType } from '../../models/types'
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type Dispatch,
    type HTMLAttributes,
    type ReactNode
} from 'react'
import 'rsuite/Accordion/styles/index.css'
import 'rsuite/Input/styles/index.css'
import 'rsuite/Placeholder/styles/index.css'
import 'rsuite/Divider/styles/index.css'
import 'rsuite/Grid/styles/index.css'
import 'rsuite/Row/styles/index.css'
import 'rsuite/Col/styles/index.css'
import { getTextWidthInPx } from '../../utils/measurements'
import { editorInitialExpandState, editorSortingOrder, positionConfigs } from '../../config/config'
import { useKeyboardListener } from '../../hooks/useKeyboard'

var uniqueKeyValue = 0

function uniqueKey() {
    uniqueKeyValue += 1
    return uniqueKeyValue
}

function ControlledInput({
    posId,
    secId,
    validSymbols,
    getUp,
    getDown,
    ...props
}: {
    posId: number
    secId: number
    validSymbols: string[]
    getUp: CallableFunction
    getDown: CallableFunction
} & HTMLAttributes<HTMLTextAreaElement> &
    InputProps) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const [keyboardListener] = useKeyboardListener(
        ref,
        validSymbols,
        () => getUp(posId, secId),
        () => getDown(posId, secId)
    )

    useEffect(() => {
        // Remove event listener if cell is being re-rendered
        ref.current?.removeEventListener('keydown', keyboardListener)
        ref.current?.addEventListener('keydown', keyboardListener)
    }, [])

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        console.log('changed')
    }

    return <textarea ref={ref} onChange={(e) => handleChange(e)} {...props} />
}

function SystemDetails({ staffs, colWidths }: { staffs: [string, Stave[]][]; colWidths: number[] }): ReactNode {
    const staffNodes = staffs.map(([pos, staves]: [string, Stave[]], pidx) => {
        const staveNodes = staves.map((stave: Stave, sidx: number) => {
            const width: string = getTextWidthInPx('x'.repeat(colWidths[sidx]), 14) + 15 + 'px'
            const validSymbols: string[] = Object.keys(positionConfigs[pos].symbolToNoteNames)
            return (
                <Col key={pidx * 100 + sidx} span="auto">
                    <ControlledInput
                        key={pidx * 100 + sidx}
                        posId={pidx}
                        secId={sidx}
                        getUp={getUp}
                        getDown={getDown}
                        validSymbols={validSymbols}
                        defaultValue={stave.notation.map((jSym) => jSym.s).join('')}
                        style={{ width: width }}
                        className={`balifont10 h-5 resize-none overflow-clip p-0`}
                        spellCheck="false"
                        readOnly={true}
                    />
                </Col>
            )
        })

        return (
            <Row>
                <Col span="auto">
                    <Text as="div" className="w-40 h-5">
                        {positionConfigs[pos].name}
                    </Text>
                </Col>
                {staveNodes}
            </Row>
        )
    })

    function getUp(posId: number, secId: number) {
        return staffNodes.find((n) => n.props.posId == posId - 1 && n.props.secId == secId) || null
    }
    function getDown(posId: number, secId: number) {
        return staffNodes.find((n) => n.props.posId == posId + 1 && n.props.secId == secId) || null
    }

    return <VStack>{staffNodes}</VStack>
}

export default function EditorWindow({
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
        // Convert new score to data record structure
        setProcessing(true)
        const newData: TableRowDataType[] = []
        score.systems.forEach((system) => {
            const positions = Object.keys(system.sections[0].staves).toSorted(
                (a, b) => editorSortingOrder.indexOf(a) - editorSortingOrder.indexOf(b)
            )
            const colWidths = system.sections.map((section) =>
                Math.max(...Object.values(section.staves).map((stave) => stave.notation.length))
            )
            const staffs = positions.map((position) => [
                position,
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
                <Grid fluid={false} className="ml-0">
                    <SystemDetails staffs={sys.staffs} colWidths={sys.colWidths} />
                </Grid>
            </Accordion.Panel>
        )
    })

    return (
        <div className="w-full">
            {loading || processing ? <Placeholder.Grid rows={12} columns={6} /> : <Accordion>{systems}</Accordion>}
        </div>
    )
}
