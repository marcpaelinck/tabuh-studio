import { Accordion, Divider, HStack, Placeholder, Popover, Whisper } from 'rsuite'
import type { Score, EditorSystemData, Staffs } from '../../models/types'
import {
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    type Dispatch,
    type HTMLAttributes,
    type RefObject
} from 'react'
import { editorInitialExpandState, editorSortingOrder } from '../../config/config'
import { useInstruments } from '../../hooks/useInstruments'
import { AudioFunctions, defaultAudioFunc, type AudioFunctionsType } from './contexts'
import { SystemNode } from './SystemNode'
import { debug } from '../../utils/debugger'
import { SystemContextMenu } from './SystemContextMenu'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import { playbackReducer } from '../../hooks/playbackReducer'
import { noCursor } from './_constants'
import { PlayBackButtons } from './PlaybackButtons'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'

export default function EditorWindow({
    score,
    expanded,
    setExpanded,
    loading,
    ...props
}: {
    score: Score
    expanded: Record<string, boolean>
    loading: boolean
    setExpanded: Dispatch<Record<string, boolean>>
} & HTMLAttributes<HTMLDivElement>) {
    const [data, setData] = useState<EditorSystemData[]>([])
    const [processing, setProcessing] = useState<boolean>(false)
    const focusRef: RefObject<string[]> = useRef<string[]>([])
    const { playInstrument } = useInstruments(focusRef, 0)
    const audioFunctions: AudioFunctionsType = useMemo(() => Object.assign(defaultAudioFunc, { playInstrument }), [])
    //TODO: playbackState was moved from individual SystemNode components to parent
    // This makes playback very unresponsive. Needs to be solved, possibly by using Ref in some way.
    const [playbackState, playback] = useReducer(playbackReducer, {
        cursor: noCursor,
        audioState: 'nodata',
        playbackType: 'none'
    })

    function flipExpanded(key: string) {
        setExpanded({ ...expanded, ...Object.fromEntries([[key, !expanded[key]]]) })
    }

    useEffect(() => {
        // Convert new score to data record structure
        setProcessing(true)
        const newData: EditorSystemData[] = []
        score.systems.forEach((system, sysIdx) => {
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
                id: sysIdx,
                key: system.key,
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

    // Updates an existing system data element (sysIdx undefined) or adds a new data element (sysIdx given)
    function updateData(systemData: EditorSystemData, sysIdx?: number) {
        const newSysData = _.cloneDeep(systemData)
        if (sysIdx) {
            // assign a unique id to the copied system data
            newSysData.key = uuidv4()
            newSysData.part += ' ( copy)'
        }
        const index = sysIdx ? sysIdx : data.findIndex((sysData) => sysData.id == systemData.id)
        if (!index) {
            console.error(`system id ${systemData.id} not found.`)
            return
        }
        const nextIdx = sysIdx ? index : index + 1
        const newData = [...data.slice(0, index), newSysData, ...data.slice(nextIdx)]
        newData.forEach((sysData, sysIdx) => (sysData.id = sysIdx))
        setData([...data.slice(0, index), newSysData, ...data.slice(nextIdx)])
    }

    var dummyWhisper: OverlayTriggerHandle = {
        updatePosition: () => {},
        open: () => {},
        close: () => {},
        getState: () => {
            return { open: false }
        }
    }
    const whisperRef = useRef<OverlayTriggerHandle>(dummyWhisper)

    debug(data, EditorWindow.name)

    const systems = data.map((systemData, sysIdx) => {
        return (
            <Accordion.Panel
                key={systemData.key}
                header={
                    // Context menu
                    <Whisper
                        ref={whisperRef}
                        key={`Whisper-${systemData.id}`}
                        placement="autoVertical"
                        trigger="contextMenu"
                        followCursor
                        speaker={
                            <Popover>
                                <SystemContextMenu
                                    data={data}
                                    systemData={systemData}
                                    update={updateData}
                                    ref={whisperRef}
                                />
                            </Popover>
                        }>
                        <HStack className="w-full" divider={<Divider vertical h={20} color="blue" />} spacing={20}>
                            <PlayBackButtons
                                data={data}
                                systemId={systemData.id}
                                playback={playback}
                                playbackState={playbackState}
                            />
                            <span>{`${systemData.id} ${systemData.part}`}</span>
                        </HStack>
                    </Whisper>
                }
                expanded={expanded[systemData.key]}
                onSelect={() => {
                    flipExpanded(systemData.key)
                }}>
                {expanded[systemData.key] && (
                    <SystemNode systemData={systemData} update={updateData} playbackState={playbackState} />
                )}
            </Accordion.Panel>
        )
    })

    return (
        <AudioFunctions value={audioFunctions}>
            {loading || processing ? (
                <Placeholder.Grid rows={12} columns={6} />
            ) : (
                <Accordion className="w-full">{systems}</Accordion>
            )}
        </AudioFunctions>
    )
}
