import { Accordion, Menu, Placeholder, Popover, Whisper } from 'rsuite'
import type { Score, EditorSystemData, Staffs } from '../../models/types'
import { useEffect, useRef, useState, type Dispatch, type HTMLAttributes, type RefObject } from 'react'
import { editorInitialExpandState, editorSortingOrder } from '../../config/config'
import { useInstruments } from '../../hooks/useInstruments'
import { AudioFunctions, defaultAudioFunc, type AudioFunctionsType } from './contexts'
import { SystemNode } from './SystemNode'
import { debug } from '../../utils/debugger'
import { SystemContextMenu } from './SystemContextMenu'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'

var uniqueKeyValue = 0

function uniqueKey(): number {
    uniqueKeyValue += 1
    return uniqueKeyValue
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
    const [data, setData] = useState<EditorSystemData[]>([])
    const [processing, setProcessing] = useState<boolean>(false)
    const focusRef: RefObject<string[]> = useRef<string[]>([])
    const { playInstrument, muteAll } = useInstruments(focusRef, 0)
    const audioFunctions: AudioFunctionsType = Object.assign(defaultAudioFunc, { playInstrument })

    function flipExpanded(id: number) {
        setExpanded({ ...expanded, ...Object.fromEntries([[id, !expanded[id]]]) })
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
                Math.max(...Object.values(section.staves).map((measure) => measure.notation.length))
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
        debug(newData, EditorWindow.name)
        setData(newData)
        const initExpandState = Object.fromEntries(newData.map((sysInfo) => [sysInfo.id, editorInitialExpandState]))
        setExpanded(initExpandState)
        setProcessing(false)
    }, [score])

    var dummy: OverlayTriggerHandle = {
        updatePosition: () => {},
        open: () => {},
        close: () => {},
        getState: () => {
            return { open: false }
        }
    }

    function updateData(sysData: EditorSystemData, seqId: number) {
        setData([...data.slice(0, seqId), sysData, ...data.slice(seqId + 1)])
    }

    const whisperRef = useRef<OverlayTriggerHandle>(dummy)
    const systems = data.map((systemData, seqId) => {
        return (
            <Whisper
                ref={whisperRef}
                key={`Whisper-${systemData.id}`}
                placement="top"
                trigger="contextMenu"
                speaker={
                    <Popover>
                        <SystemContextMenu data={systemData} ref={whisperRef} />
                    </Popover>
                }>
                <Accordion.Panel
                    key={systemData.key}
                    header={`${systemData.id} ${systemData.part}`}
                    expanded={expanded[systemData.id]}
                    onSelect={() => {
                        flipExpanded(systemData.id)
                    }}>
                    {expanded[systemData.id] && (
                        <SystemNode systemData={systemData} sequence={seqId} update={updateData} />
                    )}
                </Accordion.Panel>
            </Whisper>
        )
    })

    return (
        <AudioFunctions value={audioFunctions}>
            {loading || processing ? (
                <Placeholder.Grid rows={12} columns={6} />
            ) : (
                <Accordion className="w-full overflow-scroll">{systems}</Accordion>
            )}
        </AudioFunctions>
    )
}
