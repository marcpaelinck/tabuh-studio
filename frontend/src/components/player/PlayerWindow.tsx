import { Activity, useEffect, useRef, useState, type Dispatch, type JSX, type RefObject } from 'react'
import { Box, Text, VStack } from 'rsuite'
import type { ReactElement } from 'rsuite/esm/internals/types'
import { useAnimationEngine } from '../../componentlogic/playback/useAnimation'
import { useUserSelectionStore } from '../../stores/usePlaybackStore'
import type { PlaybackCursorStyle } from '../../typing/animation'
import type { Position } from '../../typing/basetypes'
import { type Appearance } from '../../typing/interface'
import { type PlaybackCallbackFunctions, type PlaybackSettings, type TimeLine } from '../../typing/playback'
import { type Score } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { Animation } from './Animation'

interface PlayerWindowProps {
    visible: boolean
    appAppearance: Appearance
    player: JSX.Element
    score: Score | undefined
    timeLine: TimeLine | undefined
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
    playbackSpeed: number
}
export default function PlayerWindow({
    visible,
    appAppearance,
    player,
    score,
    timeLine,
    updatePlaybackFunctions,
    playbackSpeed
}: PlayerWindowProps) {
    const [notationParas, setNotationParas] = useState<ReactElement[] | null>(null)

    const playbackSpeedRef: RefObject<number> = useRef<number>(playbackSpeed)
    const visibleRef = useRef<boolean>(visible)
    const currentFocusRef = useRef<Position[]>([])
    const currentPanggulRef = useRef<Position[]>([])
    const cursorStyleRef = useRef<PlaybackCursorStyle>('Beat')
    const selectedPanggulOption = useUserSelectionStore((state: PlaybackSettings) => state.selectedPanggulOption)
    const selectedCursorStyle = useUserSelectionStore((state: PlaybackSettings) => state.selectedCursorStyle)
    const selectedFocusOption = useUserSelectionStore((state: PlaybackSettings) => state.selectedFocusOption)

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    useEffect(() => {
        currentPanggulRef.current = selectedPanggulOption.objValue
    }, [selectedPanggulOption])
    useEffect(() => {
        cursorStyleRef.current = selectedCursorStyle
    }, [selectedCursorStyle])

    // HOOKS
    const { animateInstrument, setSvgInfo } = useAnimationEngine(
        currentFocusRef,
        currentPanggulRef,
        playbackSpeedRef,
        visibleRef
    )
    useEffect(() => updatePlaybackFunctions({ animate: animateInstrument }), [score])

    useEffect(() => {
        currentFocusRef.current = selectedFocusOption.objValue
    }, [selectedFocusOption])

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
        <VStack
            id="Player Window"
            className={`pt-6 sm:pl-0 sm:pr-0 md:pl-6 md:pr-6 min-h-0 overflow-hidden w-full ${
                appAppearance == 'playerOnly' ? 'h-full' : ''
            }`}
            visibility={visible ? 'visible' : 'collapse'}>
            <Activity mode={selectedFocusOption.objValue.length > 0 ? 'visible' : 'hidden'}>
                <Animation
                    notationElement={notationParas}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    setSVGInfo={setSvgInfo}
                    appAppearance={appAppearance}
                />
            </Activity>
            <Activity mode={score && selectedFocusOption.objValue.length == 0 ? 'visible' : 'hidden'}>
                <Box className="justify-items-center inline-grid w-full">
                    <Text size="lg">Select a Focus value to view animation</Text>
                </Box>
            </Activity>
            {/* On small screens the player sits at the bottom of the screen (mt-auto pushes
                it down in the flex column) with a 2rem inner margin. */}
            <Activity mode={appAppearance == 'playerOnly' ? 'visible' : 'hidden'}>
                <div className="mt-auto w-full p-8">{player}</div>
            </Activity>
        </VStack>
    )
}
