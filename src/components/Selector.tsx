import { Dropdown } from "rsuite"
import type { Dispatch, JSX } from "react"
import type { MenuItemInfo } from "../models/types"

const DDItem = (item: MenuItemInfo, index: number, menuName: string, onChange: Dispatch<MenuItemInfo>) => {
    return (     
        <Dropdown.Item
            key={`${menuName}-option-${index}`}
            eventKey={item.key}
            //@ts-ignore: can't figure out typing for `event`.
            onSelect={(eventKey: string, event) => {onChange(item)}} 
        >{item.displayValue}</Dropdown.Item>
    )}

export default function Selector({valueList, scrollable, ...props}: {valueList: MenuItemInfo[], [key: string]: any, scrollable?: boolean})
     {
    const items: JSX.Element[] = valueList.map((item: MenuItemInfo, index: number) => DDItem(item, index, props.id, props.onChange))
       return (
        <Dropdown menuStyle={{overflowY: scrollable?"scroll":"visible", maxHeight: scrollable?"300px":""}} {...props}>
            { items }
        </Dropdown>
    )
}