import { instrumentConfigs, positionConfigs, type InstrumentConfig } from "../../config/config";
import type { MenuItemInfo, menuValueType, Score, Section, System } from "../../models/types";

// MenuItemInfo contains the info needed to create a single DropDown menu item.
// The `value` field can be a list of values. This is useful if the menu item is an 
// aggregation (e.g. an instrument containing multiple instrument positions).

// Data for a menu item
export const tabuhDefaultOption: MenuItemInfo = {key: null, displayValue: "Tabuh...", value:null}
export const focusDefaultOption: MenuItemInfo = {key: null, displayValue: "No Focus", value:[]}
export const speedDefaultOption: MenuItemInfo = {key: 100, displayValue: "100%", value:1}

const createItemInfo = (key: string, value:string, values: menuValueType): MenuItemInfo =>  {
    return {key: key, displayValue: value, value:values}
}

// Create lists of MenuItemInfo objects that will be used to populate the menus.

export function createTabuhMenuItems(values: string[]): MenuItemInfo[] {
    return [tabuhDefaultOption].concat(
        values.map((value: string) => createItemInfo(value, value, value))
    )
}

export function createSpeedMenuItems(values: number[]): MenuItemInfo[] {
    return values.map((value: number) => createItemInfo(`${value}`, `${value}%`, value/100))
}

export function createFocusMenuItems(score: Score): MenuItemInfo[]  {
    // Create a list of positions found in the score (multiple occurrences)
    const posList: string[] = score.systems.map(
        (system: System) => system.sections.map(
            (section: Section) => Object.keys(section.staves)
        ).flat()
    ).flat()
    // Reduce to single occurrences
    const positions = Array.from(new Set(posList))
    // Select the instruments from instrumentConfigs that contain the positions
    var instrumentList: [string, InstrumentConfig][] = Object.entries(instrumentConfigs).filter(([_, info])=>positions.includes(info.positions[0]))
    // Sort the instrument list
    instrumentList = instrumentList.sort(([key1, _1], [key2, _2]) => key1.localeCompare(key2))
    // Create the menu items
    const menuItems: MenuItemInfo[] = instrumentList.map(([key, info]) => {return {key: key, displayValue: info.name, value: info.positions}})
    return [focusDefaultOption].concat(menuItems)
}
