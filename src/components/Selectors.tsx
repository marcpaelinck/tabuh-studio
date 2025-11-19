import type { JSX, RefObject } from "react";
import { useEffect, useState } from "react";
import { ButtonToolbar, Dropdown } from "rsuite";
import 'rsuite/styles/index.less';
import 'rsuite/Dropdown/styles/index.css';
import 'rsuite/ButtonToolbar/styles/index.css';
import type { Score } from "../models/types";
import { createFocusMenuItems, createSpeedMenuItems, createTabuhMenuItems, defaultSpeedOption, noFocusOption, noTabuhOption, menuItemListToMenu, type MenuItemInfo } from "../utils/selectorsUtils/selectorsUtils";
import { speedList } from "../config/constants";

const Selector = ({valueList, scrollable, ...props}: {valueList: MenuItemInfo[], [key: string]: any, scrollable?: boolean}) => 
     {
    const items: JSX.Element[] = menuItemListToMenu(props.id, valueList, props.onChange)
       return (
        <Dropdown menuStyle={{overflowY: scrollable?"scroll":"visible", maxHeight: scrollable?"300px":""}} {...props}>
            { items }
        </Dropdown>
    )
}

export default function Selectors(
    {menuDisabled, songList, score, songUpdater, focusUpdater, speedUpdater}: 
    {menuDisabled: RefObject<Record<string, boolean>>, songList: string[], score: Score | null, songUpdater: Function, focusUpdater: Function, speedUpdater: Function}, 
    ) : JSX.Element {
    
    const [tabuhMenuItems, setTabuhMenuItems] = useState<MenuItemInfo[]>([])
    const [focusMenuItems, setFocusMenuItems] = useState<MenuItemInfo[]>([])
    const [speedMenuItems, setSpeedMenuItems] = useState<MenuItemInfo[]>([])
    const [selectedSong,setSelectedSong]  = useState<MenuItemInfo>(noTabuhOption)
    const [selectedFocus,setSelectedFocus]  = useState<MenuItemInfo>(noFocusOption)
    const [selectedSpeed,setSelectedSpeed]  = useState<MenuItemInfo>(defaultSpeedOption)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setTabuhMenuItems(createTabuhMenuItems(songList))
            setSpeedMenuItems(createSpeedMenuItems(speedList))
        }
        updateFixedMenus()
        }, [songList])

    useEffect(() => {
        const updateFocusMenu = async () => {
            if (score) {
                setFocusMenuItems(createFocusMenuItems(score))
                }
        }
    updateFocusMenu()
    }, [score])
      

    const onChangeTabuhSelector = async (item: MenuItemInfo) => {
        setSelectedSong(item)
        songUpdater(item.key)
        onChangeFocusSelector(noFocusOption)
    }

    const onChangeFocusSelector = async (item: MenuItemInfo) => {
        setSelectedFocus(item)
        focusUpdater(item.key)
    }

    const onChangeSpeedSelector = async (item: MenuItemInfo) => {
        setSelectedSpeed(item)
        speedUpdater(item.key)
    }

    return (
            <div className="selectors flex flex-wrap">
                <ButtonToolbar>
                    <Selector 
                        id="tabuhselector" 
                        scrollable
                        disabled={menuDisabled.current.tabuh}
                        title={selectedSong.displayValue || noTabuhOption.displayValue} 
                        className="tabuhselector" 
                        width="3/10" 
                        valueList={tabuhMenuItems} 
                        onChange={onChangeTabuhSelector}
                    />
                    <Selector 
                        id="focusselector" 
                        scrollable
                        disabled={menuDisabled.current.focus}
                        title={selectedFocus.displayValue || noFocusOption.displayValue} 
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