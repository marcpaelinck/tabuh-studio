import { Dropdown } from "rsuite";
import { instrumentConfigs } from "../../config/config";
import type { Score, Section, System } from "../../models/types";
import type { JSX } from "react";

export type MenuItemInfo = { 
    key: string | number | null, 
    displayValue: string, 
    values: (string | number | null)[] 
}

// Data for a menu item
export const noTabuhOption: MenuItemInfo = {key: null, displayValue: "Tabuh...", values:[null]}
export const noFocusOption: MenuItemInfo = {key: null, displayValue: "No Focus", values:[null]}
export const defaultSpeedOption: MenuItemInfo = {key: 100, displayValue: "100%", values:[null]}

const createItemInfo = (key: string, value:string, values: (string | number | null)[]): MenuItemInfo =>  {
    return {key: key, displayValue: value, values:values}
}

// Create lists of MenuItemInfo objects that will be used to populate the menus.

export function createTabuhMenuItems(values: string[]): MenuItemInfo[] {
    return [noTabuhOption].concat(
        values.map((value: string) => createItemInfo(value, value, [value]))
    )
}

export function createSpeedMenuItems(values: number[]): MenuItemInfo[] {
    return [noTabuhOption].concat(
        values.map((value: number) => createItemInfo(`${value}`, `${value}%`, [value]))
    )
}

export function createFocusMenuItems(score: Score): MenuItemInfo[]  {
    // Create a list of positions found in the score (multiple occurrences)
    const posList: string[] = score.systems.map(
        (system: System) => system.sections.map(
            (section: Section) => Object.keys(section.staves)
        ).flat()
    ).flat()
    // Reduce to single occurrences and sort
    const positions = Array.from(new Set(posList)).sort()
    // Look up the instrument in the instrumentConfigs dict and group by instrument
    const posByInstrument: Record<string, MenuItemInfo[]> = {}
    positions.forEach((position) => {
        const instrument: string = instrumentConfigs[position].instrumentName 
        const item = createItemInfo(position, instrumentConfigs[position].name, [position])
        if (! (instrument in posByInstrument)) posByInstrument[instrument] = []
        posByInstrument[instrument].push(item)
    })
    // Create the menu item list.
    const itemList: MenuItemInfo[] = []
    Object.entries(posByInstrument).forEach(([instr, items]) => {
        if (items.length > 1) {
            // Instrument has multiple positions: add an option to select all positions
            const key = instr
            const values = items.reduce((aggr:  (string | number | null)[], curr) => aggr.concat(curr.values), [])
            itemList.push(createItemInfo(key, instr, values))
            items.forEach((item) => item.displayValue = "- " + item.displayValue)
        }
        items.forEach((item) => itemList.push(item))
    })
    return itemList
}

// Creates a DropDown.Item object that returns a MenuItemInfo object when selected
export const DDItem = (item: MenuItemInfo, index: number, menuName: string, onChange: CallableFunction) => {
    return (     
        <Dropdown.Item
            key={`${menuName}-option-${index}`}
            eventKey={item.key}
            //@ts-ignore
            onSelect={(eventKey: string, event) => {onChange(item)}} 
        >{item.displayValue}</Dropdown.Item>
    )}


// Creates a list of DropDown.Item objects based on a list of MenuItemInfo objects.
export function menuItemListToMenu(menuName: string, items: MenuItemInfo[], onChange: CallableFunction): JSX.Element[] {
    // return items.map((item: MenuItemInfo, index: number) => ddItem(`${menuName}-option-${index}`, item.key, item.displayValue, onChange))
    return items.map((item: MenuItemInfo, index: number) => DDItem(item, index, menuName, onChange))
}
