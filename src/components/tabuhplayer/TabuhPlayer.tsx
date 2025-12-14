import Player from './Player'
import Menu from './Menu'
import Animation from './Animation'
import { panggulDefaultOption } from './Animation'
import { type HighlightRange, type MenuItemInfo, type SVGInfo } from '../../models/types'
import { type TimeLine } from '../../models/types'
import { useEffect, useMemo, useRef, useState, type Dispatch, type JSX, type RefObject } from 'react'
import { speedDefaultOption } from '../../utils/selectorsUtils/selectorsUtils'
import { positionConfigs } from '../../config/config'
import { useScore } from '../../hooks/useScore'

export default function TabuhPlayer({
    tabuhDict,
    loadingTabuhDict
}: {
    tabuhDict: Record<string, string>
    loadingTabuhDict: boolean
}) {
    const menuDisabled = useRef<Record<string, boolean>>({ tabuh: false, focus: false })
    const setMenuDisabled = (label: string, value: boolean) => {
        menuDisabled.current = Object.assign(menuDisabled.current, Object.fromEntries([[label, value]]))
    }
    const [score, loadScore, loadingScore] = useScore(null)
    const [selectedFocus, setSelectedFocus] = useState<string[]>([])
    const [notationParas, setNotationParas] = useState<JSX.Element[] | null>(null)
    const highlightFunctionRef = useRef<Dispatch<HighlightRange>>(() => {})
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(speedDefaultOption.value as number)
    const [svgInfo, setSvgInfo] = useState<SVGInfo>({ svg: null, panggul: null, x: null, y: null, animation: null })
    const [panggulOption, setPanggulOption] = useState<MenuItemInfo>(panggulDefaultOption)

    var scoreList: string[] = Object.keys(tabuhDict)

    const timelineRef: RefObject<TimeLine | null> = useRef(null)

    // Disable menus when data is loading
    useEffect(() => {
        setMenuDisabled('tabuh', loadingTabuhDict)
        setMenuDisabled('focus', loadingTabuhDict || loadingScore || !score)
    }, [loadingTabuhDict, loadingScore])

    const updateFocus = (focus: string[]): void => {
        if (focus !== selectedFocus) {
            setSelectedFocus(focus)
            //TODO currently only displaying notation for the first focus position
            if (timelineRef.current?.notation && focus && focus[0] in timelineRef.current?.notation)
                setNotationParas(timelineRef.current.notation[focus[0]])
        }
    }

    const updateScore = (value: string) => loadScore(tabuhDict[value])

    const panggulMenuItems: MenuItemInfo[] = useMemo(() => {
        const hideItem: MenuItemInfo = panggulDefaultOption
        const menuItems: MenuItemInfo[] = selectedFocus.map((position) => {
            return { key: position, displayValue: positionConfigs[position].name, value: position }
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
                    scoreList={scoreList}
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
