import { useEffect, useRef, useState, type ActionDispatch, type Dispatch, type RefObject } from 'react'
import { VStack } from 'rsuite'
import type { ReactElement } from 'rsuite/esm/internals/types'
import { useAnimationEngine } from '../../componentlogic/playback/useAnimation'
import type { Position } from '../../typing/basetypes'
import { type ExtendedOption, type ScoreInfo, type ScoreMenuOption } from '../../typing/menus'
import {
    type PlaybackAction,
    type PlaybackCallbackFunctions,
    type PlaybackState,
    type TimeLine
} from '../../typing/playback'
import { type Score, type ScoreFormat } from '../../typing/score'
import { debug } from '../../utils/debugger'
import Animation from './Animation'
import { Player } from './Player'
import PlayerMenu from './PlayerMenu'

interface PlayerWindowProps {
    visible: boolean
    scoreMenuOptions: ScoreMenuOption[]
    score: Score | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    totalDurationMs: number
    timeLine: TimeLine | undefined
    currFocus: Position[]
    setFocus: Dispatch<Position[]>
    activePanggulRef: RefObject<Position[]>
    setSelectedPanggulOption: Dispatch<ExtendedOption<Position[]>>
    updatePlaybackFunctions: Dispatch<Partial<PlaybackCallbackFunctions>>
    playbackProgress: number
    playbackSpeed: number
    setPlaybackSpeed: Dispatch<number>
    playback: ActionDispatch<[action: PlaybackAction]>
    playbackState: PlaybackState
}
export default function PlayerWindow({
    visible,
    scoreMenuOptions,
    score,
    loadScore,
    totalDurationMs,
    timeLine,
    currFocus,
    setFocus,
    activePanggulRef,
    setSelectedPanggulOption,
    updatePlaybackFunctions,
    playbackProgress,
    playbackSpeed,
    setPlaybackSpeed,
    playback,
    playbackState
}: PlayerWindowProps) {
    const menuDisabled = useRef<Record<string, boolean>>({ tabuh: false, focus: false })
    const [notationParas, setNotationParas] = useState<ReactElement[] | null>(null)

    const playbackSpeedRef: RefObject<number> = useRef<number>(playbackSpeed)
    const visibleRef = useRef<boolean>(visible)
    const focusRef = useRef<Position[]>([])

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    useEffect(() => {
        focusRef.current = currFocus
    }, [currFocus])

    // HOOKS
    const { animateInstrument, setSvgInfo } = useAnimationEngine(
        focusRef,
        activePanggulRef,
        playbackSpeedRef,
        visibleRef
    )
    useEffect(() => updatePlaybackFunctions({ animate: animateInstrument }), [score])

    const updateNotationParas = (newPanggul: Position[], newFocus: Position[]) => {
        if (timeLine && timeLine.notation) {
            const position = newPanggul.length > 0 ? newPanggul[0] : newFocus.length > 0 ? newFocus[0] : undefined
            setNotationParas(position ? timeLine.notation[position] || null : null)
        }
    }

    const updateFocus = (newFocus: Position[]): void => {
        debug(`request to update focus to ${JSON.stringify(newFocus)}`)
        if (newFocus !== currFocus) {
            setFocus(newFocus)
            updateNotationParas(activePanggulRef.current || [], newFocus)
        }
    }

    const updatePanggulOption = (newOption: ExtendedOption<Position[]>): void => {
        debug(`request to update panggulOption to ${JSON.stringify(newOption)}`)
        if (newOption.objValue !== activePanggulRef.current) {
            setSelectedPanggulOption(newOption)
            updateNotationParas(newOption.objValue, currFocus || [])
        }
    }

    return (
        <VStack id="Player Window" className="pt-6 pl-6 pr-18" visibility={visible ? 'visible' : 'collapse'}>
            <PlayerMenu
                menuDisabled={menuDisabled}
                scoreMenuOptions={scoreMenuOptions}
                score={score}
                loadScore={loadScore}
                focusUpdater={updateFocus}
                speedUpdater={setPlaybackSpeed}
            />
            {currFocus.length > 0 && (
                <Animation
                    currFocus={currFocus}
                    notationElement={notationParas}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    panggulUpdater={updatePanggulOption}
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
