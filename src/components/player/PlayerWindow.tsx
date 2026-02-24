import { useEffect, useMemo, useRef, useState, type Dispatch, type JSX, type RefObject } from 'react'
import type { SchedulePlaybackParams } from '../../componentlogic/playbackManager'
import { positionConfigs } from '../../config/config'
import {
    type EditorScore,
    type HighlightRange,
    type MenuItemInfo,
    type PlaybackCallbackFunctions,
    type Position,
    type ScoreInfo,
    type SVGInfo,
    type TimeLine
} from '../../typing/types'
import Animation, { panggulDefaultOption } from './Animation'
import Menu from './Menu'
import { Player } from './Player'

interface PlayerWindowProps {
    scoreList: ScoreInfo[]
    score: EditorScore | undefined
    totalDurationMs: number
    dataSource: 'database' | 'file'
    schedulePlayback: (params: SchedulePlaybackParams) => void
    selectedFocus: Position[]
    setSelectedFocus: Dispatch<Position[]>
    playbackFunctions: PlaybackCallbackFunctions
    setPlaybackFunctions: Dispatch<PlaybackCallbackFunctions>
    playbackSpeed: number
    setPlaybackSpeed: Dispatch<number>
}
export default function PlayerWindow({
    scoreList,
    score,
    totalDurationMs,
    dataSource,
    schedulePlayback,
    selectedFocus,
    setSelectedFocus,
    playbackSpeed,
    setPlaybackSpeed
}: PlayerWindowProps) {
    const menuDisabled = useRef<Record<string, boolean>>({ tabuh: false, focus: false })
    const setMenuDisabled = (label: string, value: boolean) => {
        menuDisabled.current = Object.assign(menuDisabled.current, Object.fromEntries([[label, value]]))
    }
    // const { scoreList, score, loadScore, isLoading: loadingScore } = useScoreReader<Score | undefined>('old', 'file')
    const [notationParas, setNotationParas] = useState<JSX.Element[] | null>(null)
    const highlightFunctionRef = useRef<Dispatch<HighlightRange>>(() => {})
    const [svgInfo, setSvgInfo] = useState<SVGInfo>({ svg: null, panggul: null, x: null, y: null, animation: null })
    const [panggulOption, setPanggulOption] = useState<MenuItemInfo>(panggulDefaultOption)

    // HOOKS
    // const { animateInstrument, animateNotation } = useAnimationEngine(
    //     svgInfoRef,
    //     highlightFunctionRef,
    //     panggulOptionRef,
    //     focusRef,
    //     pbSpeedRef
    // )

    const timelineRef: RefObject<TimeLine | null> = useRef(null)

    useEffect(
        () =>
            schedulePlayback({
                pbAction: { actionType: 'load', playbackType: 'multiple', systemIndex: 0, score: score }
            }),
        [score]
    )

    // Disable menus when data is loading
    // useEffect(() => {
    //     setMenuDisabled('tabuh', loadingScore)
    //     setMenuDisabled('focus', loadingScore || loadingScore || !score)
    // }, [loadingScore])

    const updateFocus = (focus: Position[]): void => {
        if (focus !== selectedFocus) {
            setSelectedFocus(focus)
            //TODO currently only displaying notation for the first focus position
            if (timelineRef.current?.notation && focus && focus[0] in timelineRef.current?.notation)
                setNotationParas(timelineRef.current.notation[focus[0]])
        }
    }

    // const updateScore = (title: string) => loadScore(scoreList.find((item) => item.title == title))

    const panggulMenuItems: MenuItemInfo[] = useMemo(() => {
        const hideItem: MenuItemInfo = panggulDefaultOption
        const menuItems: MenuItemInfo[] = selectedFocus.map((position) => {
            return { key: position, displayValue: positionConfigs[position as Position].name, value: position }
        })
        setPanggulOption(menuItems.length > 0 ? menuItems[0] : panggulDefaultOption)
        return [hideItem].concat(menuItems)
    }, [selectedFocus])

    const updateTimeline = (timeline: TimeLine): void => {
        timelineRef.current = timeline
    }

    return (
        <div id="TabuhPlayer" className="pt-6 pl-6 pr-6">
            <Menu
                menuDisabled={menuDisabled}
                scoreList={scoreList.map((info) => info.title)}
                score={score}
                // scoreUpdater={updateScore}
                focusUpdater={updateFocus}
                speedUpdater={setPlaybackSpeed}
            />
            {selectedFocus.length > 0 && (
                <Animation
                    focus={selectedFocus}
                    notationElement={notationParas}
                    panggulMenuItems={panggulMenuItems}
                    panggulOption={panggulOption}
                    highlightFunctionRef={highlightFunctionRef}
                    setPanggulOption={setPanggulOption}
                    setSVGInfo={setSvgInfo}
                />
            )}
            <Player
                score={score}
                totalDurationMs={totalDurationMs}
                focus={selectedFocus}
                pbSpeed={playbackSpeed}
                svgInfo={svgInfo}
                panggulOption={panggulOption}
                highlightFunctionRef={highlightFunctionRef}
                timelineUpdater={updateTimeline}
            />
        </div>
    )
}
