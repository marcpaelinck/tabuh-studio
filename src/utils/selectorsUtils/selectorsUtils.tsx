import { instrumentConfigs } from "../../config/config";
import type { Score, Section, System } from "../../models/types";

// MenuItemInfo contains the info needed to create a single DropDown menu item.
// The `value` field can be a list of values. This is useful if the menu item is an 
// aggregation (e.g. an instrument containing multiple instrument positions).

type menuValueType = string | number | null | (string | number | null)[]

export type MenuItemInfo = { 
    key: string | number | null, 
    displayValue: string, 
    value: menuValueType
}

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
    // Reduce to single occurrences and sort
    const positions = Array.from(new Set(posList)).sort()
    // Look up the instrument in the instrumentConfigs dict and group by instrument
    const posByInstrument: Record<string, MenuItemInfo[]> = {}
    positions.forEach((position) => {
        console.log(position)
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
            const values = items.reduce((aggr:  (string | number | null)[], curr) => aggr.concat(curr.value), [])
            itemList.push(createItemInfo(key, instr, values))
            items.forEach((item) => item.displayValue = "- " + item.displayValue)
        }
        items.forEach((item) => itemList.push(item))
    })
    return [focusDefaultOption].concat(itemList)
}
