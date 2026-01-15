import { useEffect, useMemo, useRef, useState, type Dispatch, type JSX, type RefObject } from 'react'
import { positionConfigs } from '../../config/config'
import { useScoreReader } from '../../hooks/useScoreReader'
import {
    type HighlightRange,
    type MenuItemInfo,
    type Position,
    type Score,
    type ScoreInfo,
    type SVGInfo,
    type TimeLine
} from '../../models/types'
import { speedDefaultOption } from '../../utils/selectorsUtils/selectorsUtils'
import Animation, { panggulDefaultOption } from './Animation'
import Menu from './Menu'
import Player from './Player'

export default function TabuhPlayer({
    scoreList,
    loadingScoreList
}: {
    scoreList: ScoreInfo[]
    loadingScoreList: boolean
}) {
    const menuDisabled = useRef<Record<string, boolean>>({ tabuh: false, focus: false })
    const setMenuDisabled = (label: string, value: boolean) => {
        menuDisabled.current = Object.assign(menuDisabled.current, Object.fromEntries([[label, value]]))
    }
    const { score, loadScore, isLoading: loadingScore } = useScoreReader<Score | undefined>('old')
    const [selectedFocus, setSelectedFocus] = useState<Position[]>([])
    const [notationParas, setNotationParas] = useState<JSX.Element[] | null>(null)
    const highlightFunctionRef = useRef<Dispatch<HighlightRange>>(() => {})
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(speedDefaultOption.value as number)
    const [svgInfo, setSvgInfo] = useState<SVGInfo>({ svg: null, panggul: null, x: null, y: null, animation: null })
    const [panggulOption, setPanggulOption] = useState<MenuItemInfo>(panggulDefaultOption)

    // TODO remove filter after adapting player code to new file format
    var titleList: string[] = scoreList.filter((item) => item.format == 'old').map((item) => item.title)

    const timelineRef: RefObject<TimeLine | null> = useRef(null)

    // Disable menus when data is loading
    useEffect(() => {
        setMenuDisabled('tabuh', loadingScoreList)
        setMenuDisabled('focus', loadingScoreList || loadingScore || !score)
    }, [loadingScoreList, loadingScore])

    const updateFocus = (focus: Position[]): void => {
        if (focus !== selectedFocus) {
            setSelectedFocus(focus)
            //TODO currently only displaying notation for the first focus position
            if (timelineRef.current?.notation && focus && focus[0] in timelineRef.current?.notation)
                setNotationParas(timelineRef.current.notation[focus[0]])
        }
    }

    const updateScore = (title: string) => loadScore(scoreList.find((item) => item.title == title))

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
        <div id="TabuhPlayer">
            <div className="pt-6 pl-6 pr-6">
                <Menu
                    menuDisabled={menuDisabled}
                    scoreList={titleList}
                    score={score}
                    scoreUpdater={updateScore}
                    focusUpdater={updateFocus}
                    speedUpdater={setPlaybackSpeed}
                />
            </div>
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
