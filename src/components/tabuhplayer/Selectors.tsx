import type { JSX, RefObject } from "react";
import { useEffect, useState } from "react";
import { ButtonToolbar } from "rsuite";
import 'rsuite/Dropdown/styles/index.css';
import 'rsuite/ButtonToolbar/styles/index.css';
import type { MenuItemInfo, Score } from "../../models/types";
import { createFocusMenuItems, createSpeedMenuItems, createTabuhMenuItems, speedDefaultOption, focusDefaultOption, tabuhDefaultOption } from "../../utils/selectorsUtils/selectorsUtils";
import { speedList } from "../../config/constants";
import Selector from "../Selector";


export default function Selectors(
    {menuDisabled, scoreList, score, scoreUpdater, focusUpdater, speedUpdater}: 
    {menuDisabled: RefObject<Record<string, boolean>>, scoreList: string[], score: Score | null, scoreUpdater: Function, focusUpdater: Function, speedUpdater: Function}, 
    ) : JSX.Element {
    
    const [tabuhMenuItems, setTabuhMenuItems] = useState<MenuItemInfo[]>([])
    const [focusMenuItems, setFocusMenuItems] = useState<MenuItemInfo[]>([])
    const [speedMenuItems, setSpeedMenuItems] = useState<MenuItemInfo[]>([])
    const [selectedSong,setSelectedSong]  = useState<MenuItemInfo>(tabuhDefaultOption)
    const [selectedFocus,setSelectedFocus]  = useState<MenuItemInfo>(focusDefaultOption)
    const [selectedSpeed,setSelectedSpeed]  = useState<MenuItemInfo>(speedDefaultOption)

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
            ?  item.value.reduce((aggr, val) => aggr + (aggr? ", " : "") + val, "[") + "]" 
            : item.value
        console.log(`${menu}: ${item.key} ${item.displayValue} ${strValue}`)
    }

    const onChangeTabuhSelector = async (item: MenuItemInfo) => {
        debugLog(item, 'TABUH')
        setSelectedSong(item)
        scoreUpdater(item.value)
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
                    <Selector 
                        id="tabuhselector" 
                        scrollable
                        disabled={menuDisabled.current.tabuh}
                        title={selectedSong.displayValue || tabuhDefaultOption.displayValue} 
                        className="tabuhselector" 
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