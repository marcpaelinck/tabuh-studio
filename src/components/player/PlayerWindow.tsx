import { useEffect, useMemo, useRef, useState, type ActionDispatch, type Dispatch, type RefObject } from 'react'
import { VStack } from 'rsuite'
import type { ReactElement } from 'rsuite/esm/internals/types'
import { useAnimationEngine } from '../../componentlogic/useAnimation'
import { positionConfigs } from '../../config/config'
import type { UUID } from '../../typing/basetypes'
import { type Position } from '../../typing/instruments'
import { type MenuItemInfo, type ScoreInfo, type ScoreMenuOption } from '../../typing/menus'
import {
    type PlaybackAction,
    type PlaybackCallbackFunctions,
    type PlaybackState,
    type TimeLine
} from '../../typing/playback'
import { type Score, type ScoreFormat } from '../../typing/score'
import Animation, { panggulDefaultOption } from './Animation'
import Menu from './Menu'
import { Player } from './Player'

interface PlayerWindowProps {
    visible: boolean
    scoreMenuOptions: ScoreMenuOption[]
    score: Score | undefined
    currentScoreId: UUID
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    totalDurationMs: number
    timeLine: TimeLine | undefined
    focus: Position[]
    setFocus: Dispatch<Position[]>
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
    currentScoreId,
    loadScore,
    totalDurationMs,
    timeLine,
    focus,
    setFocus,
    updatePlaybackFunctions,
    playbackProgress,
    playbackSpeed,
    setPlaybackSpeed,
    playback,
    playbackState
}: PlayerWindowProps) {
    const menuDisabled = useRef<Record<string, boolean>>({ tabuh: false, focus: false })
    const [notationParas, setNotationParas] = useState<ReactElement[] | null>(null)

    const focusRef: RefObject<Position[]> = useRef<Position[]>(focus)
    const playbackSpeedRef: RefObject<number> = useRef<number>(playbackSpeed)
    const visibleRef = useRef<boolean>(visible)

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        focusRef.current = focus
    }, [focus])
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    // HOOKS
    const { animateInstrument, setSvgInfo, panggulOption, setPanggulOption } = useAnimationEngine(
        focusRef,
        playbackSpeedRef,
        visibleRef
    )
    useEffect(() => updatePlaybackFunctions({ animate: animateInstrument }), [score])

    const updateFocus = (newFocus: Position[]): void => {
        if (newFocus !== focus) {
            setFocus(newFocus)
            //TODO currently only displaying notation for the first focus position
            if (timeLine && timeLine.notation && newFocus && newFocus[0] in timeLine.notation)
                setNotationParas(timeLine.notation[newFocus[0]] || null)
        }
    }

    const panggulMenuItems: MenuItemInfo[] = useMemo(() => {
        const hideItem: MenuItemInfo = panggulDefaultOption
        const menuItems: MenuItemInfo[] = focus.map((position) => {
            return { key: position, displayValue: positionConfigs[position as Position].name, value: position }
        })
        setPanggulOption(menuItems.length > 0 ? menuItems[0] : panggulDefaultOption)
        return [hideItem].concat(menuItems)
    }, [focus])

    return (
        <VStack id="Player Window" className="pt-6 pl-6 pr-18" visibility={visible ? 'visible' : 'collapse'}>
            <Menu
                menuDisabled={menuDisabled}
                scoreMenuOptions={scoreMenuOptions}
                score={score}
                loadScore={loadScore}
                focusUpdater={updateFocus}
                speedUpdater={setPlaybackSpeed}
            />
            {focus.length > 0 && (
                <Animation
                    focus={focus}
                    notationElement={notationParas}
                    panggulMenuItems={panggulMenuItems}
                    panggulOption={panggulOption}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    setPanggulOption={setPanggulOption}
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
