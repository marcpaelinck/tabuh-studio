import type { JSX, RefObject } from 'react'
import { useEffect, useState } from 'react'
import { ButtonToolbar } from 'rsuite'
// import 'rsuite/ButtonToolbar/styles/index.css';
import { speedList } from '../../config/config'
import type { MenuItemInfo, ScoreInfo, ScoreMenuOption } from '../../typing/menus'
import type { Score, ScoreFormat } from '../../typing/score'
import { debug } from '../../utils/debugger'
import {
    createFocusMenuItems,
    createSpeedMenuItems,
    focusDefaultOption,
    tabuhDefaultOption as scoreDefaultOption,
    speedDefaultOption
} from '../../utils/selectorsUtils'
import Selector from './Selector'

export default function Menu({
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
    focusUpdater: Function
    speedUpdater: Function
}): JSX.Element {
    const [focusMenuItems, setFocusMenuItems] = useState<MenuItemInfo[]>([])
    const [speedMenuItems, setSpeedMenuItems] = useState<MenuItemInfo[]>([])
    const [scoreMenuItems, setScoreMenuItems] = useState<MenuItemInfo[]>([])
    const [selectedScore, setSelectedScore] = useState<MenuItemInfo>(scoreDefaultOption)
    const [selectedFocus, setSelectedFocus] = useState<MenuItemInfo>(focusDefaultOption)
    const [selectedSpeed, setSelectedSpeed] = useState<MenuItemInfo>(speedDefaultOption)

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
            return { key: option.label, displayValue: option.label, value: option.value } as MenuItemInfo
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

    function debugLog(item: MenuItemInfo, menu: string) {
        const strValue = Array.isArray(item.value)
            ? item.value.reduce((aggr, val) => aggr + (aggr == '[' ? '' : ', ') + val, '[') + ']'
            : item.value
        debug(`${menu}: ${item.key} ${item.displayValue} ${strValue}`)
    }

    const onChangeScoreSelector = async (item: MenuItemInfo) => {
        debugLog(item, 'TABUH')
        setSelectedScore(item)
        loadScore('JSON', item.value as ScoreInfo)
        onChangeFocusSelector(focusDefaultOption)
    }

    const onChangeFocusSelector = async (item: MenuItemInfo) => {
        debugLog(item, 'FOCUS')
        setSelectedFocus(item)
        focusUpdater(item.value)
    }

    const onChangeSpeedSelector = async (item: MenuItemInfo) => {
        debugLog(item, 'SPEED')
        setSelectedSpeed(item)
        speedUpdater(item.value)
    }

    return (
        <div className="selectors flex flex-wrap">
            <ButtonToolbar>
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
            </ButtonToolbar>
        </div>
    )
}
