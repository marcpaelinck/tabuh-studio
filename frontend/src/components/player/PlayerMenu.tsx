import type { Dispatch, JSX, RefObject } from 'react'
import { useEffect, useState } from 'react'
import { HStack, SelectPicker } from 'rsuite'
import { speedList } from '../../config/config'
import type { Position } from '../../typing/basetypes'
import {
    focusDefaultOption,
    type ExtendedOption,
    type MenuItemInfo,
    type ScoreInfo,
    type ScoreMenuOption
} from '../../typing/menus'
import type { Score, ScoreFormat } from '../../typing/score'
import { debug } from '../../utils/debugger'
import { createFocusMenuItems, createSpeedMenuItems, scoreDefaultOption } from '../../utils/selectorsUtils'
import Selector from './Selector'

export default function PlayerMenu({
    score,
    menuDisabled,
    scoreMenuOptions,
    selectedFocusOption,
    selectedSpeedOption,
    loadScore,
    setSelectedFocusOption,
    setSelectedSpeedOption
}: {
    score: Score | undefined
    menuDisabled: RefObject<Record<string, boolean>>
    scoreMenuOptions: ScoreMenuOption[]
    selectedFocusOption: ExtendedOption<Position[]>
    selectedSpeedOption: ExtendedOption<number>
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    setSelectedFocusOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedSpeedOption: Dispatch<ExtendedOption<number>>
}): JSX.Element {
    const [focusMenuItems, setFocusMenuItems] = useState<ExtendedOption<Position[]>[]>([focusDefaultOption])
    const [speedMenuItems, setSpeedMenuItems] = useState<ExtendedOption<number>[]>([])
    const [scoreMenuItems, setScoreMenuItems] = useState<MenuItemInfo<ScoreInfo>[]>([])
    const [selectedScore, setSelectedScore] = useState<MenuItemInfo<ScoreInfo | null>>(scoreDefaultOption)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
    }, [])

    useEffect(() => debug(`SELECTED SPEED: ${JSON.stringify(selectedSpeedOption)}`), [selectedSpeedOption])

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

    const onChangeScoreSelector = async (item: MenuItemInfo<ScoreInfo>) => {
        debug(`TABUH: ${JSON.stringify(item)}`)
        setSelectedScore(item)
        loadScore('JSON', item.value as ScoreInfo)
        setSelectedFocusOption(focusDefaultOption)
    }

    // const onChangeFocusSelector = async (item: ExtendedOption<Position[]>) => {
    //     debug(`FOCUS: ${JSON.stringify(item)}`)
    //     setSelectedFocusOption(item)
    //     setSelectedFocusOption(item.objValue as Position[])
    // }

    // const onChangeSpeedSelector = async (item: MenuItemInfo<number>) => {
    //     debug(`SPEED: ${JSON.stringify(item)}`)
    //     setSelectedSpeed(item)
    //     speedUpdater(item.value as number)
    // }

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
                <SelectPicker
                    id="focusselector"
                    searchable={false}
                    cleanable={false}
                    label="focus:"
                    data={focusMenuItems}
                    value={selectedFocusOption.value}
                    onSelect={(value, item) => {
                        setSelectedFocusOption(item as ExtendedOption<Position[]>)
                    }}
                    // Next lines only needed if cleanable==true
                    // onChange={(value, e) => {
                    //     if (value === null) setSelectedPanggulOption(null)
                    // }}
                />
                <SelectPicker
                    id="speedselector"
                    searchable={false}
                    cleanable={false}
                    label="speed:"
                    data={speedMenuItems}
                    value={selectedSpeedOption.value}
                    onSelect={(value, item) => {
                        setSelectedSpeedOption(item as ExtendedOption<number>)
                    }}
                    // Next lines only needed if cleanable==true
                    // onChange={(value, e) => {
                    //     if (value === null) setSelectedPanggulOption(null)
                    // }}
                />
            </HStack>
        </div>
    )
}
