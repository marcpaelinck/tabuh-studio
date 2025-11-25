import type { JSX, RefObject } from "react";
import { useEffect, useState } from "react";
import { ButtonToolbar } from "rsuite";
import 'rsuite/Dropdown/styles/index.css';
import 'rsuite/ButtonToolbar/styles/index.css';
import type { MenuItemInfo } from "../../models/types";
import { createTabuhMenuItems, tabuhDefaultOption } from "../../utils/selectorsUtils/selectorsUtils";
import Selector from "../Selector";


export default function Selectors(
    {menuDisabled, scoreList: songList, scoreUpdater: songUpdater}: 
    {menuDisabled: RefObject<Record<string, boolean>>, scoreList: string[], scoreUpdater: Function}, 
    ) : JSX.Element {
    
    const [tabuhMenuItems, setTabuhMenuItems] = useState<MenuItemInfo[]>([])
    const [selectedSong,setSelectedSong]  = useState<MenuItemInfo>(tabuhDefaultOption)

    useEffect(() => {
        const updateFixedMenus = async () => {
            setTabuhMenuItems(createTabuhMenuItems(songList))
        }
        updateFixedMenus()
        }, [songList])


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
                </ButtonToolbar>
            </div>
        )
}