/**
 * StaffLine — presentational render of one staff's notation as a single line.
 *
 * Renders each symbol in its own span (preserving the font's intra-symbol
 * negative spacing) and draws the blinking cursor between whole symbols when
 * `cursorIndex` is non-null. Clicking a symbol reports the nearest boundary;
 * clicking past the end reports the trailing position. It is purely
 * presentational — all state lives in the controller.
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
    function handleSymbolClick(e: MouseEvent<HTMLSpanElement>, index: number) {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const mid = rect.left + rect.width / 2
        onSymbolClick(e.clientX < mid ? index : index + 1)
    }

    return (
        <div
            style={{ whiteSpace: 'pre', lineHeight: 'inherit', minHeight: '1em' }}
            onClick={(e) => {
                e.stopPropagation()
                onTrailingClick()
            }}
        >
            {symbols.map((sym, index) => (
                <span key={index} onClick={(e) => handleSymbolClick(e, index)}>
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
