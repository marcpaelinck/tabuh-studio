import type { JSX, RefObject } from "react";
import { useEffect, useState } from "react";
import { ButtonToolbar, Dropdown } from "rsuite";
import 'rsuite/styles/index.less';
import 'rsuite/Dropdown/styles/index.css';
import 'rsuite/ButtonToolbar/styles/index.css';
import type { Score } from "../models/types";
import { createFocusMenuItems, createSpeedMenuItems, createTabuhMenuItems, speedDefaultOption, focusDefaultOption, tabuhDefaultOption, type MenuItemInfo } from "../utils/selectorsUtils/selectorsUtils";
import { speedList } from "../config/constants";

export const DDItem = (item: MenuItemInfo, index: number, menuName: string, onChange: CallableFunction) => {
    return (     
        <Dropdown.Item
            key={`${menuName}-option-${index}`}
            eventKey={item.key}
            //@ts-ignore: can't figure out typing for `event`.
            onSelect={(eventKey: string, event) => {onChange(item)}} 
        >{item.displayValue}</Dropdown.Item>
    )}

const Selector = ({valueList, scrollable, ...props}: {valueList: MenuItemInfo[], [key: string]: any, scrollable?: boolean}) => 
     {
    const items: JSX.Element[] = valueList.map((item: MenuItemInfo, index: number) => DDItem(item, index, props.id, props.onChange))
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
    const [selectedSong,setSelectedSong]  = useState<MenuItemInfo>(tabuhDefaultOption)
    const [selectedFocus,setSelectedFocus]  = useState<MenuItemInfo>(focusDefaultOption)
    const [selectedSpeed,setSelectedSpeed]  = useState<MenuItemInfo>(speedDefaultOption)

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
      

    function debugLog(item: MenuItemInfo, menu: string) {
        const strValue = Array.isArray(item.value) 
            ?  item.value.reduce((aggr, val) => aggr + (aggr? ", " : "") + val, "[") + "]" 
            : item.value
        console.log(`${menu}: ${item.key} ${item.displayValue} ${strValue}`)
    }

    const onChangeTabuhSelector = async (item: MenuItemInfo) => {
        debugLog(item, 'TABUH')
        setSelectedSong(item)
        songUpdater(item.value)
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