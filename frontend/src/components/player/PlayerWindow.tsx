import { useEffect, useRef, useState, type ActionDispatch, type Dispatch, type RefObject } from 'react'
import { VStack } from 'rsuite'
import type { ReactElement } from 'rsuite/esm/internals/types'
import { useAnimationEngine } from '../../componentlogic/playback/useAnimation'
import { positionConfigs } from '../../config/config'
import type { Position } from '../../typing/basetypes'
import { type ScoreInfo, type ScoreMenuOption, type SelectOption } from '../../typing/menus'
import {
    type PlaybackAction,
    type PlaybackCallbackFunctions,
    type PlaybackState,
    type TimeLine
} from '../../typing/playback'
import { type Score, type ScoreFormat } from '../../typing/score'
import { debug } from '../../utils/debugger'
import Animation, { panggulDefaultOption } from './Animation'
import Menu from './PlayerMenu'
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
            updateNotationParas(activePanggul || [], newFocus)
        }
    }
    const updatePanggul = (newPanggul: Position[]): void => {
        debug(`request to update panggul to ${JSON.stringify(newPanggul)}`)
        if (newPanggul !== activePanggulRef.current) {
            setActivePanggul(newPanggul)
            updateNotationParas(newPanggul, currFocus || [])
        }
    }

    const [panggulMenuItems, setPanggulMenuItems] = useState<SelectOption<Position[]>[]>([])

    useEffect(() => {
        debug(`new focus: ${JSON.stringify(currFocus)}`)
        const menuItems: SelectOption<Position[]>[] = currFocus.map((position) => {
            return { label: positionConfigs[position as Position].name, value: position, objValue: [position] }
        })
        const hideItem: SelectOption<Position[]> = panggulDefaultOption
        setPanggulMenuItems([hideItem].concat(menuItems))
        setActivePanggul((menuItems.length > 0 ? [menuItems[0].objValue] : hideItem.objValue) as Position[])
    }, [currFocus])

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
            {currFocus.length > 0 && (
                <Animation
                    currFocus={currFocus}
                    notationElement={notationParas}
                    panggulMenuItems={panggulMenuItems}
                    activePanggul={activePanggul}
                    updatePlaybackFunctions={updatePlaybackFunctions}
                    panggulUpdater={updatePanggul}
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
