import { useEffect, useMemo, useRef, useState, type ActionDispatch, type Dispatch, type RefObject } from 'react'
import { VStack } from 'rsuite'
import type { ReactElement } from 'rsuite/esm/internals/types'
import { useAnimationEngine } from '../../componentlogic/playback/useAnimation'
import { positionConfigs } from '../../config/config'
import type { Position } from '../../typing/basetypes'
import { type MenuItemInfo, type ScoreInfo, type ScoreMenuOption } from '../../typing/menus'
import {
    type PlaybackAction,
    type PlaybackCallbackFunctions,
    type PlaybackState,
    type TimeLine
} from '../../typing/playback'
import { type Score, type ScoreFormat } from '../../typing/score'
import { debug } from '../../utils/debugger'
import Animation, { panggulDefaultOption } from './Animation'
import Menu from './Menu'
import { Player } from './Player'

interface PlayerWindowProps {
    visible: boolean
    scoreMenuOptions: ScoreMenuOption[]
    score: Score | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    totalDurationMs: number
    timeLine: TimeLine | undefined
    currFocus: Position[]
    setFocus: Dispatch<Position[]>
    activePanggul: Position[]
    setActivePanggul: Dispatch<Position[]>
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
    activePanggul,
    setActivePanggul,
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
    const activePanggulRef = useRef<Position[]>([])

    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    useEffect(() => {
        focusRef.current = currFocus
    }, [currFocus])

    useEffect(() => {
        activePanggulRef.current = activePanggul
    }, [activePanggul])

    // HOOKS
    const { animateInstrument, setSvgInfo } = useAnimationEngine(
        focusRef,
        activePanggulRef,
        playbackSpeedRef,
        visibleRef
    )
    useEffect(() => updatePlaybackFunctions({ animate: animateInstrument }), [score])

    const updateFocus = (newFocus: Position[]): void => {
        debug(`request to update focus to ${JSON.stringify(newFocus)}`)
        if (newFocus !== currFocus) {
            setFocus(newFocus)
            //TODO currently only displaying notation for the first focus position
            if (timeLine && timeLine.notation && newFocus && newFocus[0] in timeLine.notation)
                setNotationParas(timeLine.notation[newFocus[0]] || null)
        }
    }
    const updatePanggul = (newPanggul: Position[]): void => {
        debug(`request to update panggul to ${JSON.stringify(newPanggul)}`)
        if (newPanggul !== activePanggulRef.current) {
            setActivePanggul(newPanggul)
        }
    }

    const panggulMenuItems: MenuItemInfo[] = useMemo(() => {
        debug(`new focus: ${JSON.stringify(currFocus)}`)
        const hideItem: MenuItemInfo = panggulDefaultOption
        const menuItems: MenuItemInfo[] = currFocus.map((position) => {
            return { key: position, displayValue: positionConfigs[position as Position].name, value: position }
        })
        // setPanggulOption(menuItems.length > 0 ? menuItems[0] : panggulDefaultOption)
        setActivePanggul((menuItems.length > 0 ? [menuItems[0].value] : []) as Position[])
        return [hideItem].concat(menuItems)
    }, [currFocus])

    return (
        <VStack id="Player Window" className="pt-6 pl-6 pr-18" visibility={visible ? 'visible' : 'collapse'}>
            <Menu
                menuDisabled={menuDisabled}
                scoreMenuOptions={scoreMenuOptions}
                score={score}
                loadScore={loadScore}
                focusUpdater={updateFocus}
                panggulUpdater={updatePanggul}
                speedUpdater={setPlaybackSpeed}
            />
            {currFocus.length > 0 && (
                <Animation
                    currFocus={currFocus}
                    notationElement={notationParas}
                    panggulMenuItems={panggulMenuItems}
                    activePanggulRef={activePanggulRef}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    // setPanggulOption={setPanggulOption}
                    setActivePanggul={setActivePanggul}
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
