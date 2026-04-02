import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ActionDispatch,
    type Dispatch,
    type JSX,
    type RefObject
} from 'react'
import { VStack } from 'rsuite'
import type { PlaybackAction, PlaybackState } from '../../componentlogic/playbackReducer'
import { useAnimationEngine } from '../../componentlogic/useAnimation'
import { positionConfigs } from '../../config/config'
import {
    type EditorScore,
    type MenuItemInfo,
    type PlaybackCallbackFunctions,
    type Position,
    type ScoreFormat,
    type ScoreInfo,
    type TimeLine
} from '../../typing/types'
import Animation, { panggulDefaultOption } from './Animation'
import Menu from './Menu'
import { Player } from './Player'

interface PlayerWindowProps {
    visible: boolean
    scoreList: ScoreInfo[]
    score: EditorScore | undefined
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
    scoreList,
    score,
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
    const [notationParas, setNotationParas] = useState<JSX.Element[] | null>(null)

    const focusRef: RefObject<Position[]> = useRef<Position[]>(focus)
    const playbackSpeedRef: RefObject<number> = useRef<number>(playbackSpeed)

    useEffect(() => {
        focusRef.current = focus
    }, [focus])
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    // HOOKS
    const { animateInstrument, setSvgInfo, panggulOption, setPanggulOption } = useAnimationEngine(
        focusRef,
        playbackSpeedRef
    )
    useEffect(() => updatePlaybackFunctions({ animate: animateInstrument }), [score])

    const updateFocus = (newFocus: Position[]): void => {
        if (newFocus !== focus) {
            setFocus(newFocus)
            //TODO currently only displaying notation for the first focus position
            if (timeLine && timeLine.notation && newFocus && newFocus[0] in timeLine.notation)
                setNotationParas(timeLine.notation[newFocus[0]])
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
                scoreList={scoreList.map((info) => info.title)}
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
