/**
 * StaffGrid — shared presentational surface for a stack of notation staves.
 *
 * Renders a focusable container with (optionally) a single background grid behind
 * all staves and one {@link StaffLine} per row. It is purely presentational: the
 * caller supplies the rows (symbols + cursor + click handlers, plus an optional
 * label element and an optional `below` block) and the keyboard/focus handlers.
 *
 * Both the editable compact editor ({@link CompactSystemEditor}) and the read-only
 * expanded viewer ({@link SystemNotationViewer}) build their rows and delegate the
 * grid/row rendering here, so the layered-grid + StaffLine plumbing lives in one place.
 */

import type { NoteObject } from '@tabuhstudio/shared'
import type { ClipboardEvent, CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react'
import { editorFontSize } from '../../config/config'
import { StaffLine } from './StaffLine'

export interface StaffGridRow {
    key: string
    /** Optional label element rendered before the staff (e.g. the compact group chip). */
    label?: ReactNode
    symbols: NoteObject[]
    /** Cursor index within this row, or null when the row is not active. */
    cursorIndex: number | null
    onSymbolClick: (index: number) => void
    onTrailingClick: () => void
    /** Optional block rendered below the row (e.g. the compact expansion snippet). */
    below?: ReactNode
}

export interface StaffGridProps {
    /** Ref to the outer container. Used as the grid-paint surface only when there is no
     *  internal label column (e.g. the expanded viewer); the compact view paints `grid.ref`
     *  (the inner, label-offset grid element) instead so the grid aligns with the notation. */
    ref?: RefObject<HTMLDivElement | null>
    rows: StaffGridRow[]
    /**
     * Single background grid behind all staves. Omit for a transparent overlay (e.g. the
     * viewer, whose grid is the textarea behind it). `ref` forwards the grid element so
     * the host can paint its background (gridlines + moving playback cursor) directly;
     * `style` is an optional static background instead.
     */
    grid?: { ref?: RefObject<HTMLDivElement | null>; left: string; widthCh: number; style?: CSSProperties }
    /** Shared width (in columns) for each staff row, so rows line up. */
    rowWidthCh?: number
    /** Read-only: no tab focus, default cursor, aria-readonly. */
    readOnly?: boolean
    onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
    onPaste?: (e: ClipboardEvent<HTMLDivElement>) => void
    onFocus?: () => void
    onBlur?: () => void
    className?: string
    style?: CSSProperties
}

export function StaffGrid({
    ref,
    rows,
    grid,
    rowWidthCh,
    readOnly,
    onKeyDown,
    onPaste,
    onFocus,
    onBlur,
    className,
    style
}: StaffGridProps) {
    const fontClass = `balifontspaced${editorFontSize}`
    return (
        <div
            ref={ref}
            tabIndex={readOnly ? -1 : 0}
            role="textbox"
            aria-multiline="true"
            aria-readonly={readOnly}
            aria-label="notation"
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={onFocus}
            onBlur={onBlur}
            className={`${fontClass}${className ? ' ' + className : ''}`}
            style={{
                outline: 'none',
                whiteSpace: 'pre',
                boxSizing: 'border-box',
                background: 'transparent',
                cursor: readOnly ? 'default' : 'text',
                ...style
            }}>
            <div className="relative">
                {grid && (
                    <div
                        ref={grid.ref}
                        aria-hidden="true"
                        className={`absolute top-0 bottom-0 z-0 ${fontClass}`}
                        style={{ left: grid.left, width: `${grid.widthCh}ch`, ...grid.style }}
                    />
                )}
                <div className="relative z-10">
                    {rows.map((row) => {
                        const staff = (
                            <div
                                style={{
                                    width: rowWidthCh != null ? `${rowWidthCh}ch` : undefined,
                                    whiteSpace: 'pre'
                                }}>
                                <StaffLine
                                    symbols={row.symbols}
                                    cursorIndex={row.cursorIndex}
                                    onSymbolClick={row.onSymbolClick}
                                    onTrailingClick={row.onTrailingClick}
                                />
                            </div>
                        )
                        return (
                            <div key={row.key}>
                                {row.label ? (
                                    <div className="flex items-center">
                                        {row.label}
                                        {staff}
                                    </div>
                                ) : (
                                    staff
                                )}
                                {row.below}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
