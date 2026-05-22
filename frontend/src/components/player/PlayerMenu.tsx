import type { Dispatch, JSX, RefObject } from 'react'
import { useEffect, useState } from 'react'
import { HStack } from 'rsuite'
import { speedList } from '../../config/config'
import type { Position } from '../../typing/basetypes'
import type { MenuItemInfo, ScoreInfo, ScoreMenuOption } from '../../typing/menus'
import type { Score, ScoreFormat } from '../../typing/score'
import { debug } from '../../utils/debugger'
import {
    createFocusMenuItems,
    createSpeedMenuItems,
    focusDefaultOption,
    scoreDefaultOption,
    speedDefaultOption
} from '../../utils/selectorsUtils'
import Selector from './Selector'

export default function PlayerMenu({
    menuDisabled,
    scoreMenuOptions,
    score,
    loadScore,
    focusUpdater,
    speedUpdater
}: {
    menuDisabled: RefObject<Record<string, boolean>>
    scoreMenuOptions: ScoreMenuOption[]
    score: Score | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    focusUpdater: Dispatch<Position[]>
    speedUpdater: Dispatch<number>
}): JSX.Element {
    const [focusMenuItems, setFocusMenuItems] = useState<MenuItemInfo<Position[]>[]>([])
    const [speedMenuItems, setSpeedMenuItems] = useState<MenuItemInfo<number>[]>([])
    const [scoreMenuItems, setScoreMenuItems] = useState<MenuItemInfo<ScoreInfo>[]>([])
    const [selectedScore, setSelectedScore] = useState<MenuItemInfo<ScoreInfo | null>>(scoreDefaultOption)
    const [selectedFocus, setSelectedFocus] = useState<MenuItemInfo<Position[]>>(focusDefaultOption)
    const [selectedSpeed, setSelectedSpeed] = useState<MenuItemInfo<number>>(speedDefaultOption)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
    }, [])

    // Temporary fix: player Menu uses a different menu option type than MainMenu.
    // TODO Need to streamline both menu item types.
    useEffect(() => {
        const menuItems = scoreMenuOptions.map((option) => {
            return { key: option.label, displayValue: option.label, value: option.value } as MenuItemInfo<ScoreInfo>
        })
        setScoreMenuItems(menuItems)
    }, [scoreMenuOptions])

    useEffect(() => {
        const updateFocusMenu = async () => {
            if (score) {
                setFocusMenuItems(createFocusMenuItems(score))
            }
        }
        updateFocusMenu()
    }, [score])

    function debugLog(item: MenuItemInfo<any>, menu: string) {
        const strValue = Array.isArray(item.value)
            ? item.value.reduce((aggr, val) => aggr + (aggr == '[' ? '' : ', ') + val, '[') + ']'
            : item.value
        debug(`${menu}: ${item.key} ${item.displayValue} ${strValue}`)
    }

    const onChangeScoreSelector = async (item: MenuItemInfo<ScoreInfo>) => {
        debugLog(item, 'TABUH')
        setSelectedScore(item)
        loadScore('JSON', item.value as ScoreInfo)
        onChangeFocusSelector(focusDefaultOption)
    }

    const onChangeFocusSelector = async (item: MenuItemInfo<Position[]>) => {
        debugLog(item, 'FOCUS')
        setSelectedFocus(item)
        focusUpdater(item.value as Position[])
    }

    const onChangeSpeedSelector = async (item: MenuItemInfo<number>) => {
        debugLog(item, 'SPEED')
        setSelectedSpeed(item)
        speedUpdater(item.value as number)
    }

    return (
        <div className="selectors flex flex-wrap">
            <HStack>
                {/* Score selector is only visible on small screens where only the player is displayed. */}
                <Selector
                    id="tabuhselector"
                    scrollable
                    disabled={menuDisabled.current.tabuh}
                    title={selectedScore.displayValue || scoreDefaultOption.displayValue}
                    className="tabuhselector lg:hidden"
                    width="3/10"
                    valueList={scoreMenuItems}
                    onChange={onChangeScoreSelector}
                />
                <Selector
                    id="focusselector"
                    scrollable
                    disabled={menuDisabled.current.focus}
                    title={selectedFocus.displayValue || focusDefaultOption.displayValue}
                    width="3/10"
                    valueList={focusMenuItems}
                    onChange={onChangeFocusSelector}
                />
                <Selector
                    id="speedselector"
                    scrollable
                    title={`speed: ${selectedSpeed.displayValue}`}
                    width="2/10"
                    valueList={speedMenuItems}
                    onChange={onChangeSpeedSelector}
                />
            </HStack>
        </div>
    )
}
