import type { Option } from 'rsuite'
import type { Position, UUID } from './basetypes'

// MENUS
// SCORE MENU

type MenuName = string

export type ScoreInfo = {
    title: string
    uuid: UUID
    instrumentgroup: string
    file?: string
    notationversion: string
    pdf?: string
}

export interface ScoreMenuOption {
    value: ScoreInfo
    label: string
}

export type menuValueType = string | number | null | (Position | number | null)[] | ScoreInfo | undefined

export type MenuInfo = { disabled: Record<MenuName, boolean> }

export type MenuItemInfo<T> = { key: string | number | null; displayValue: string; value: T }

export type MenuCollectionInfo = Record<MenuName, MenuInfo>

// Extension of React Suite Option used for SelectPicker elements.
// This interface allows to link an additional object to an option.
// The Option's value attribute only accepts string and numbers.
export interface ExtendedOption<U> extends Option<string> {
    objValue: U
}

export const panggulDefaultOption: ExtendedOption<Position[]> = { label: 'Hide', value: 'Hide', objValue: [] }
export const focusDefaultOption: ExtendedOption<Position[]> = { label: 'No Focus', value: 'No Focus', objValue: [] }
export const speedDefaultOption: ExtendedOption<number> = { label: '100%', value: '100%', objValue: 1 }
