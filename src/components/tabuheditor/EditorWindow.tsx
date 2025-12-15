import { Accordion, Placeholder } from 'rsuite'
import 'rsuite/Accordion/styles/index.css'
import 'rsuite/Placeholder/styles/index.css'
import 'rsuite/Grid/styles/index.css'
import type { Score, EditorSystemData, Staffs, PlayBackState, CursorAction, EditorCellCursor } from '../../models/types'
import { useEffect, useRef, useState, type Dispatch, type HTMLAttributes, type RefObject } from 'react'
import { editorInitialExpandState, editorSortingOrder } from '../../config/config'
import { useInstruments } from '../../hooks/useInstruments'
import { createTimelineFromEditor, scheduleTransport } from '../../hooks/createSchedule'
import * as Tone from 'tone'
import { AudioFunctions, type AudioFunctionsType } from './contexts'
import { SystemGrid } from './SystemGrid'
import { noCursor } from './_constants'

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
    const [playbackState, setPlaybackState] = useState<PlayBackState>('stopped')
    const audioFunctions: AudioFunctionsType = { playPause: playPause }
    const [cursor, setCursor] = useState<EditorCellCursor>(noCursor)

    function flipExpanded(id: number) {
        const newExpanded = {}
        Object.assign(newExpanded, expanded, Object.fromEntries([[id, !expanded[id]]]))
        setExpanded(newExpanded)
    }

    function onEndOfPlayback(time: number) {
        Tone.getTransport().stop()
        Tone.getTransport().seconds = 0
        setPlaybackState('stopped')
        setCursor(noCursor)
    }

    function moveCursor(time: number, cAction: CursorAction) {
        setCursor({ system: cAction.system, position: cAction.position, measure: cAction.section })
        console.log(`setting cursor to sys=${cAction.system} pos=${cAction.position} measure=${cAction.section}`)
    }

    async function playPause(doPlay: boolean, data?: EditorSystemData[]) {
        if (Tone.getContext().state == 'suspended') {
            Tone.start()
            await Tone.loaded()
        }
        if (data) {
            const timeLine = createTimelineFromEditor(data, {
                play: playInstrument,
                animate: null,
                // cursor: moveCursor,
                cursor: moveCursor,
                generic: onEndOfPlayback
            })
            scheduleTransport(timeLine)
        }
        // Tone.getTransport().start()
        if (doPlay) {
            if (Tone.getTransport().state !== 'started') Tone.getTransport().start()
        } else {
            Tone.getTransport().pause()
        }
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
        console.log(newData)
        setData(newData)
        const initExpandState = Object.fromEntries(newData.map((sysInfo) => [sysInfo.id, editorInitialExpandState]))
        setExpanded(initExpandState)
        setProcessing(false)
    }, [score])

    const systems = data.map((systemData) => {
        return (
            <Accordion.Panel
                key={systemData.key}
                header={`${systemData.id} ${systemData.part}`}
                expanded={expanded[systemData.id]}
                onSelect={() => {
                    flipExpanded(systemData.id)
                }}>
                <SystemGrid
                    systemData={systemData}
                    pbState={playbackState}
                    setPbState={setPlaybackState}
                    cursorMovement={cursor}
                />
            </Accordion.Panel>
        )
    })

    return (
        <div className="w-full">
            <AudioFunctions value={audioFunctions}>
                {loading || processing ? <Placeholder.Grid rows={12} columns={6} /> : <Accordion>{systems}</Accordion>}
            </AudioFunctions>
        </div>
    )
}
