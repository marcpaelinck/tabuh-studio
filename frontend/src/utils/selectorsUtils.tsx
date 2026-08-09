import { type Position } from '@tabuhstudio/shared'
import { instrumentConfigs, positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Instrument, InstrumentConfig, Orchestra } from '@tabuhstudio/shared/types/position'
import { orchestraPositions } from '@tabuhstudio/shared/utils/position'
import _ from 'lodash'
import { focusDefaultOption } from '../stores/useUserSettingsStore'
import { type ExtendedOption, type MenuItemInfo, type ScoreInfo } from '../typing/interface'
import type { Score, System } from '../typing/score'

// MenuItemInfo contains the info needed to create a single DropDown menu item.
// The `value` field can be a list of values. This is useful if the menu item is an
// aggregation (e.g. an instrument containing multiple instrument positions).

// Data for a menu item
export const scoreDefaultOption: MenuItemInfo<ScoreInfo | null> = { key: null, displayValue: 'Tabuh...', value: null }
// export const focusDefaultOption: MenuItemInfo<Position[]> = { key: null, displayValue: 'No Focus', value: [] }

// Create lists of MenuItemInfo objects that will be used to populate the menus.

export function createSpeedMenuItems(values: number[]): ExtendedOption<number>[] {
    return values.map((value: number) => {
        return { label: `${value}%`, value: `${value}%`, objValue: value / 100 }
    })
}

export function createFocusMenuItems(scoreOrOrchestra?: Score | Orchestra | null): ExtendedOption<Position[]>[] {
    // Create a list of positions found in the score (multiple occurrences)
    const posList: Position[] = []
    if (scoreOrOrchestra) {
        if (typeof scoreOrOrchestra == 'string') {
            posList.push(...orchestraPositions(scoreOrOrchestra))
        } else {
            posList.push(
                ...(scoreOrOrchestra.systems
                    .map((system: System) => Object.keys(system.staffs))
                    .flat()
                    .flat() as Position[])
            )
        }
    } else posList.push(...(_.keys(positionConfigs) as Position[]))
    // Reduce to single occurrences
    const positions = Array.from(new Set(posList))
    // Select the instruments from instrumentConfigs that contain the positions
    var instrumentList: [Instrument, InstrumentConfig][] = Object.entries(instrumentConfigs).filter(([_, info]) =>
        positions.includes(info.positions[0])
    ) as [Instrument, InstrumentConfig][]
    // Sort the instrument list
    instrumentList = instrumentList.sort(([key1, _1], [key2, _2]) => key1.localeCompare(key2))
    // Create the menu items
    const menuItems: ExtendedOption<Position[]>[] = instrumentList.map(([key, info]) => {
        return { label: key, value: info.name, objValue: info.positions }
    })
    return [focusDefaultOption].concat(menuItems)
}
