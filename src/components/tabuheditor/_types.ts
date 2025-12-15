import { type HTMLProps, type RefObject } from 'react'
import type { GridProps } from 'rsuite'
import type { NavigationAction } from '../../config/config'
import type { EditorSystemData } from '../../models/types'

export interface NavigationGridProps extends GridProps {
    id?: string
}

export interface NavigationCellProps extends HTMLProps<HTMLTextAreaElement> {
    posId: number
    secId: number
    validSymbols: string[]
}

export interface AudioFunctionsType {
    playPause: (doPlay: boolean, data?: EditorSystemData[]) => void
}

export interface NavigationFunctionsType {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => void
    navigate: (action: NavigationAction, row: number, col: number) => RefObject<HTMLTextAreaElement | null>
    updateSystemData: (data: EditorSystemData) => void
}

export type GridRowInfo = Record<number, RefObject<HTMLTextAreaElement | null>>
export type GridInfo = { maxRowId: number; maxColId: number; cells: Record<number, GridRowInfo> }
