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
    /** Highlighted selection range [from, to) on this row, or null. */
    selection?: { from: number; to: number } | null
    /** Show the caret as a block over the symbol at the cursor (overwrite mode). */
    overwrite?: boolean
    onSymbolClick: (index: number, extend?: boolean) => void
    onTrailingClick: (extend?: boolean) => void
    /** Optional block rendered below the row (e.g. the compact expansion snippet). */
    below?: ReactNode
}

export interface StaffGridProps {
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
    const positionFontStyle = { fontFamily: 'Courier', fontSize: '12px' }

    const notationFont = `balifontspaced${editorFontSize}`
    return (
        <div
            tabIndex={readOnly ? -1 : 0}
            role="textbox"
            aria-multiline="true"
            aria-readonly={readOnly}
            aria-label="notation"
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={onFocus}
            onBlur={onBlur}
            className={`${notationFont}${className ? ' ' + className : ''}`}
            style={{
                outline: 'none',
                whiteSpace: 'pre',
                boxSizing: 'border-box',
                background: 'transparent',
                cursor: readOnly ? 'default' : 'text',
                // Editable: suppress the browser's own text selection so it doesn't fight the
                // custom notation highlight during a click-drag. Read-only stays selectable.
                userSelect: readOnly ? undefined : 'none',
                WebkitUserSelect: readOnly ? undefined : 'none',
                ...style
            }}>
            <div className="relative">
                {grid && (
                    <div
                        ref={grid.ref}
                        aria-hidden="true"
                        className={`absolute top-0 bottom-0 z-0 ${notationFont}`}
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
                                    selection={row.selection}
                                    overwrite={row.overwrite}
                                    onSymbolClick={row.onSymbolClick}
                                    onTrailingClick={row.onTrailingClick}
                                />
                            </div>
                        )
                        return (
                            <div key={row.key}>
                                {row.label ? (
                                    <div className={`flex items-center`}>
                                        <div style={positionFontStyle}>{row.label}</div>
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
