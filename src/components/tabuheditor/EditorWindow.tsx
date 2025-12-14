import { Accordion, Col, HStack, Placeholder, Row, Text, VStack } from 'rsuite'
import { IoPlayCircleOutline, IoPlayCircle, IoPauseCircle } from 'react-icons/io5'
import type { Score, Stave, EditorSystemData, Staffs, PlayBackState } from '../../models/types'
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type Context,
    type Dispatch,
    type HTMLAttributes,
    type ReactNode,
    type RefObject
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
import { NavigationGrid, NavigationInputCell } from '../ControlledGrid/NavigationGrid'
import { getValidSymbols } from '../../utils/alphabet'
import { useInstruments } from '../../hooks/useInstruments'
import { createTimelineFromEditor, scheduleTransport } from '../../hooks/createSchedule'
import * as Tone from 'tone'
import { FaPause, FaPlay } from 'react-icons/fa'

var uniqueKeyValue = 0

export interface AudioFunctionsType {
    playPause: (doPlay: boolean, data?: EditorSystemData[]) => void
}

const defaultAudioFunc: AudioFunctionsType = { playPause: (doPlay: boolean, data?: EditorSystemData[]) => {} }

function uniqueKey(): number {
    uniqueKeyValue += 1
    return uniqueKeyValue
}

const AudioFunctions: Context<AudioFunctionsType> = createContext(defaultAudioFunc)

// Contains the editable notation of one system (gongan)
function SystemDetails({
    systemData,
    pbState,
    setPbState
}: {
    systemData: EditorSystemData
    pbState: PlayBackState
    setPbState: Dispatch<PlayBackState>
}): ReactNode {
    const audioFunc: AudioFunctionsType = useContext(AudioFunctions)
    const [playbackActive, setPlaybackActive] = useState<boolean>(false)

    function playPauseClicked() {
        if (!playbackActive) {
            audioFunc.playPause(true, [systemData])
            setPbState('playing')
            setPlaybackActive(true)
        } else {
            audioFunc.playPause(!(pbState == 'playing'))
            setPbState(pbState == 'playing' ? 'paused' : 'playing')
        }
    }

    const staffNodes = Object.entries(systemData.staffs).map(([pos, staves], pidx) => {
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

    return (
        <>
            <HStack>
                <button onClick={playPauseClicked}>
                    {pbState == 'playing' ? (
                        <IoPlayCircle color="orange" size="2em" />
                    ) : pbState == 'paused' ? (
                        <IoPauseCircle color="orange" size="2em" />
                    ) : (
                        <IoPlayCircleOutline color="gray" size="2em" />
                    )}
                </button>
            </HStack>

            <VStack>{staffNodes}</VStack>
        </>
    )
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

    function flipExpanded(id: number) {
        const newExpanded = {}
        Object.assign(newExpanded, expanded, Object.fromEntries([[id, !expanded[id]]]))
        setExpanded(newExpanded)
    }

    function onEndOfPlayback(time: number) {
        Tone.getTransport().stop()
        Tone.getTransport().seconds = 0
        setPlaybackState('stopped')
    }

    async function playPause(doPlay: boolean, data?: EditorSystemData[]) {
        if (Tone.getContext().state == 'suspended') {
            Tone.start()
            await Tone.loaded()
        }
        if (data) {
            const timeLine = createTimelineFromEditor(data)
            scheduleTransport(timeLine, playInstrument, null, null, onEndOfPlayback)
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
                <NavigationGrid
                    playInstrument={playInstrument}
                    id={`GRID-4(${systemData.id})`}
                    fluid={false}
                    className="ml-0">
                    <SystemDetails systemData={systemData} pbState={playbackState} setPbState={setPlaybackState} />
                </NavigationGrid>
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
