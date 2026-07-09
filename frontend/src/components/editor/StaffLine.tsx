/**
 * StaffLine — presentational render of one staff's notation as a single line.
 *
 * Renders each symbol in its own span (preserving the font's intra-symbol
 * negative spacing) and draws the blinking cursor between whole symbols when
 * `cursorIndex` is non-null. Pressing on a symbol reports the nearest boundary;
 * pressing past the end reports the trailing position. It is purely
 * presentational — all state lives in the controller.
 *
 * The cursor is placed on `mousedown` (not `click`), like a real text editor: this
 * captures the target at press time, before focusing the editor can re-render and
 * shift the layout (e.g. the expansion snippet appearing), which would otherwise
 * make the trailing `click` land on the wrong staff.
 */

import type { NoteObject } from '@tabuhstudio/shared'
import type { MouseEvent } from 'react'

export interface StaffLineProps {
    symbols: NoteObject[]
    /** Cursor index within this line, or null when the line is not active. */
    cursorIndex: number | null
    onSymbolClick: (index: number) => void
    onTrailingClick: () => void
}

export function StaffLine({ symbols, cursorIndex, onSymbolClick, onTrailingClick }: StaffLineProps) {
    function handleSymbolPress(e: MouseEvent<HTMLSpanElement>, index: number) {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const mid = rect.left + rect.width / 2
        onSymbolClick(e.clientX < mid ? index : index + 1)
    }

    return (
        <div
            style={{ whiteSpace: 'pre', lineHeight: 'inherit', minHeight: '1em' }}
            onMouseDown={(e) => {
                e.stopPropagation()
                onTrailingClick()
            }}
        >
            {symbols.map((sym, index) => (
                <span key={index} onMouseDown={(e) => handleSymbolPress(e, index)}>
                    {cursorIndex === index && <Cursor />}
                    <span>{sym.toString()}</span>
                </span>
            ))}
            {cursorIndex === symbols.length && <Cursor />}
        </div>
    )
}

function Cursor() {
    return <span className="notation-cursor" aria-hidden="true" />
}
