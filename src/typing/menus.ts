import type { UUID } from './basetypes'

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

export type menuValueType = string | number | null | (string | number | null)[] | ScoreInfo | undefined

export type MenuInfo = { disabled: Record<MenuName, boolean> }

export type MenuItemInfo = { key: string | number | null; displayValue: string; value: menuValueType }

export type MenuCollectionInfo = Record<MenuName, MenuInfo>
