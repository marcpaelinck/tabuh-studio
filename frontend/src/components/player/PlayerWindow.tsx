import {
    Activity,
    useEffect,
    useRef,
    useState,
    type ActionDispatch,
    type Dispatch,
    type JSX,
    type RefObject
} from 'react'
import { VStack } from 'rsuite'
import type { ReactElement } from 'rsuite/esm/internals/types'
import { useAnimationEngine } from '../../componentlogic/playback/useAnimation'
import type { Position } from '../../typing/basetypes'
import { type Appearance, type ExtendedOption, type ScoreInfo } from '../../typing/interface'
import {
    type PlaybackAction,
    type PlaybackCallbackFunctions,
    type PlaybackState,
    type TimeLine
} from '../../typing/playback'
import { type Score } from '../../typing/score'
import { debug } from '../../utils/debugger'
import Animation from './Animation'

interface PlayerWindowProps {
    visible: boolean
    appAppearance: Appearance
    playerMenu: JSX.Element
    player: JSX.Element
    score: Score | undefined
    totalDurationMs: number
    timeLine: TimeLine | undefined
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    selectedFocusOption: ExtendedOption<Position[]>
    selectedPanggulOption: ExtendedOption<Position[]>
    setSelectedPanggulOption: Dispatch<ExtendedOption<Position[]>>
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
    playbackProgress: number
    playbackSpeed: number
    playback: ActionDispatch<[action: PlaybackAction]>
    playbackState: PlaybackState
}
export default function PlayerWindow({
    visible,
    appAppearance,
    playerMenu,
    player,
    score,
    totalDurationMs,
    timeLine,
    scoreMenuOptions,
    selectedFocusOption,
    selectedPanggulOption,
    setSelectedPanggulOption,
    updatePlaybackFunctions,
    playbackProgress,
    playbackSpeed,
    playback,
    playbackState
}: PlayerWindowProps) {
    const [notationParas, setNotationParas] = useState<ReactElement[] | null>(null)

    const playbackSpeedRef: RefObject<number> = useRef<number>(playbackSpeed)
    const visibleRef = useRef<boolean>(visible)
    const currentFocusRef = useRef<Position[]>([])
    const currentPanggulRef = useRef<Position[]>([])

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    useEffect(() => {
        currentPanggulRef.current = selectedPanggulOption.objValue
    }, [selectedPanggulOption])

    // HOOKS
    const { animateInstrument, setSvgInfo } = useAnimationEngine(
        currentFocusRef,
        currentPanggulRef,
        playbackSpeedRef,
        visibleRef
    )
    useEffect(() => updatePlaybackFunctions({ animate: animateInstrument }), [score])

    useEffect(() => {
        updateNotationParas(selectedPanggulOption.objValue, selectedFocusOption.objValue)
    }, [selectedFocusOption, selectedPanggulOption])

    const updateNotationParas = (newPanggul: Position[], newFocus: Position[]) => {
        debug(`newPanggul = ${JSON.stringify(newPanggul)}`)
        if (timeLine && timeLine.notation) {
            const position = newPanggul.length > 0 ? newPanggul[0] : newFocus.length > 0 ? newFocus[0] : undefined
            setNotationParas(position ? timeLine.notation[position] || null : null)
        }
    }

    return (
        <VStack id="Player Window" className="pt-6 pl-6 pr-18" visibility={visible ? 'visible' : 'collapse'}>
            <Activity mode={appAppearance == 'playerOnly' ? 'visible' : 'hidden'}>{playerMenu}</Activity>
            <Activity mode={selectedFocusOption.objValue.length > 0 ? 'visible' : 'hidden'}>
                <Animation
                    notationElement={notationParas}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    selectedFocusOption={selectedFocusOption}
                    selectedPanggulOption={selectedPanggulOption}
                    setSelectedPanggulOption={setSelectedPanggulOption}
                    setSVGInfo={setSvgInfo}
                />
            </Activity>
            <Activity mode={appAppearance == 'playerOnly' ? 'visible' : 'hidden'}>{player}</Activity>
        </VStack>
    )
}
