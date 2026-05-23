import { useEffect, useRef, useState, type ActionDispatch, type Dispatch, type RefObject } from 'react'
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
import { Player } from './Player'
import PlayerMenu from './PlayerMenu'

interface PlayerWindowProps {
    visible: boolean
    appAppearance: Appearance
    score: Score | undefined
    totalDurationMs: number
    timeLine: TimeLine | undefined
    scoreMenuOptions: ExtendedOption<ScoreInfo>[]
    selectedScoreOption: ExtendedOption<ScoreInfo> | null
    selectedFocusOption: ExtendedOption<Position[]>
    selectedPanggulOption: ExtendedOption<Position[]>
    selectedSpeedOption: ExtendedOption<number>
    setSelectedScoreOption: Dispatch<ExtendedOption<ScoreInfo> | null>
    setSelectedFocusOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedPanggulOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedSpeedOption: Dispatch<ExtendedOption<number>>
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
    playbackProgress: number
    playbackSpeed: number
    playback: ActionDispatch<[action: PlaybackAction]>
    playbackState: PlaybackState
}
export default function PlayerWindow({
    visible,
    appAppearance,
    score,
    totalDurationMs,
    timeLine,
    scoreMenuOptions,
    selectedScoreOption,
    selectedFocusOption,
    selectedPanggulOption,
    selectedSpeedOption,
    setSelectedScoreOption,
    setSelectedFocusOption,
    setSelectedPanggulOption,
    setSelectedSpeedOption,
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
        currentFocusRef.current = selectedFocusOption.objValue
    }, [selectedFocusOption])

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
            <PlayerMenu
                appAppearance={appAppearance}
                scoreMenuOptions={scoreMenuOptions}
                score={score}
                selectedScoreOption={selectedScoreOption}
                selectedFocusOption={selectedFocusOption}
                selectedSpeedOption={selectedSpeedOption}
                setSelectedScoreOption={setSelectedScoreOption}
                setSelectedFocusOption={setSelectedFocusOption}
                setSelectedSpeedOption={setSelectedSpeedOption}
            />
            {selectedFocusOption.objValue.length > 0 && (
                <Animation
                    notationElement={notationParas}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    selectedFocusOption={selectedFocusOption}
                    selectedPanggulOption={selectedPanggulOption}
                    setSelectedPanggulOption={setSelectedPanggulOption}
                    setSVGInfo={setSvgInfo}
                />
            )}
            <Player
                score={score}
                totalDurationMs={totalDurationMs}
                playback={playback}
                playbackState={playbackState}
                playbackProgress={playbackProgress}
            />
        </VStack>
    )
}
