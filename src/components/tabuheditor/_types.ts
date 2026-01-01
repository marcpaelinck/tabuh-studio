import { type RefObject } from 'react'
import type { GridProps } from 'rsuite'

export interface NavigationGridProps extends GridProps {
    id?: string
}

export type GridRowInfo = Record<number, RefObject<HTMLTextAreaElement | null>>
export type GridInfo = { maxRowId: number; maxColId: number; cells: Record<number, GridRowInfo> }

export interface ElementWithValueTracker extends HTMLTextAreaElement {
    _valueTracker: { getValue: () => string; setValue: (value: string) => void }
}
