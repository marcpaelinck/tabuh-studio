import type { JSX, RefObject } from 'react'
import { useEffect, useState } from 'react'
import { ButtonToolbar } from 'rsuite'
// import 'rsuite/ButtonToolbar/styles/index.css';
import { speedList } from '../../config/config'
import type { EditorScore, MenuItemInfo, ScoreFormat, ScoreInfo } from '../../typing/types'
import { debug } from '../../utils/debugger'
import {
    createFocusMenuItems,
    createSpeedMenuItems,
    createTabuhMenuItems,
    focusDefaultOption,
    speedDefaultOption,
    tabuhDefaultOption
} from '../../utils/selectorsUtils'
import Selector from './Selector'

export default function Menu({
    menuDisabled,
    scoreList,
    score,
    loadScore,
    focusUpdater,
    speedUpdater
}: {
    menuDisabled: RefObject<Record<string, boolean>>
    scoreList: string[]
    score: EditorScore | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    focusUpdater: Function
    speedUpdater: Function
}): JSX.Element {
    const [tabuhMenuItems, setTabuhMenuItems] = useState<MenuItemInfo[]>([])
    const [focusMenuItems, setFocusMenuItems] = useState<MenuItemInfo[]>([])
    const [speedMenuItems, setSpeedMenuItems] = useState<MenuItemInfo[]>([])
    const [selectedTabuh, setSelectedTabuh] = useState<MenuItemInfo>(tabuhDefaultOption)
    const [selectedFocus, setSelectedFocus] = useState<MenuItemInfo>(focusDefaultOption)
    const [selectedSpeed, setSelectedSpeed] = useState<MenuItemInfo>(speedDefaultOption)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setTabuhMenuItems(createTabuhMenuItems(scoreList))
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
    }, [scoreList])

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

    const onChangeTabuhSelector = async (item: MenuItemInfo) => {
        debugLog(item, 'TABUH')
        setSelectedTabuh(item)
        // scoreUpdater(item.value)
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
                    title={selectedTabuh.displayValue || tabuhDefaultOption.displayValue}
                    className="tabuhselector lg:hidden"
                    width="3/10"
                    valueList={tabuhMenuItems}
                    onChange={onChangeTabuhSelector}
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
