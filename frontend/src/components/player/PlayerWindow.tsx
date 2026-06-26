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
import { Box, Text, VStack } from 'rsuite'
import type { ReactElement } from 'rsuite/esm/internals/types'
import { useAnimationEngine } from '../../componentlogic/playback/useAnimation'
import type { PlaybackCursorStyle } from '../../typing/animation'
import type { Position } from '../../typing/basetypes'
import { type Appearance } from '../../typing/interface'
import {
    type PlaybackAction,
    type PlaybackCallbackFunctions,
    type PlaybackSettings,
    type PlaybackState,
    type TimeLine
} from '../../typing/playback'
import { type Score } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { Animation } from './Animation'

interface PlayerWindowProps {
    visible: boolean
    appAppearance: Appearance
    playerMenu: JSX.Element
    player: JSX.Element
    score: Score | undefined
    totalDurationMs: number
    timeLine: TimeLine | undefined
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
    playbackSettings: PlaybackSettings
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
    updatePlaybackFunctions,
    playbackSettings,
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
    const cursorStyleRef = useRef<PlaybackCursorStyle>('Beat')

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    useEffect(() => {
        currentPanggulRef.current = playbackSettings.selectedPanggulOption.objValue
    }, [playbackSettings.selectedPanggulOption])
    useEffect(() => {
        cursorStyleRef.current = playbackSettings.selectedCursorStyle
    }, [playbackSettings.selectedCursorStyle])

    // HOOKS
    const { animateInstrument, setSvgInfo } = useAnimationEngine(
        currentFocusRef,
        currentPanggulRef,
        playbackSpeedRef,
        visibleRef
    )
    useEffect(() => updatePlaybackFunctions({ animate: animateInstrument }), [score])

    useEffect(() => {
        currentFocusRef.current = playbackSettings.selectedFocusOption.objValue
    }, [playbackSettings.selectedFocusOption])

    useEffect(() => {
        updateNotationParas(
            playbackSettings.selectedPanggulOption.objValue,
            playbackSettings.selectedFocusOption.objValue
        )
    }, [playbackSettings.selectedFocusOption, playbackSettings.selectedPanggulOption])

    const updateNotationParas = (newPanggul: Position[], newFocus: Position[]) => {
        debug(`newPanggul = ${JSON.stringify(newPanggul)}`)
        if (timeLine && timeLine.notation) {
            const position = newPanggul.length > 0 ? newPanggul[0] : newFocus.length > 0 ? newFocus[0] : undefined
            setNotationParas(position ? timeLine.notation[position] || null : null)
        }
    }

    return (
        <VStack
            id="Player Window"
            className="pt-6 sm:pl-0 sm:pr-0 md:pl-6 md:pr-6 min-h-0 overflow-hidden w-full"
            visibility={visible ? 'visible' : 'collapse'}>
            <Activity mode={appAppearance == 'playerOnly' ? 'visible' : 'hidden'}>{playerMenu}</Activity>
            <Activity mode={playbackSettings.selectedFocusOption.objValue.length > 0 ? 'visible' : 'hidden'}>
                <Animation
                    notationElement={notationParas}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    playbackSettings={playbackSettings}
                    setSVGInfo={setSvgInfo}
                />
            </Activity>
            <Activity mode={score && playbackSettings.selectedFocusOption.objValue.length == 0 ? 'visible' : 'hidden'}>
                <Box className="justify-items-center inline-grid w-full">
                    <Text size="lg">Select a Focus value to view animation</Text>
                </Box>
            </Activity>
            <Activity mode={appAppearance == 'playerOnly' ? 'visible' : 'hidden'}>{player}</Activity>
        </VStack>
    )
}
