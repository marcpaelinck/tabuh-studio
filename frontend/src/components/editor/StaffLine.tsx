/**
 * StaffLine — presentational render of one staff's notation as a single line.
 *
 * Renders each symbol in its own span (preserving the font's intra-symbol
 * negative spacing) and draws the blinking cursor between whole symbols when
 * `cursorIndex` is non-null. A `selection` range highlights the covered symbols; in
 * `overwrite` mode (and with no selection) the caret is shown as a block over the
 * symbol at the cursor instead of a bar. Pressing on a symbol reports the nearest
 * boundary (with the shift state, for shift-click range selection); pressing past the
 * end reports the trailing position. It is purely presentational — all state lives in
 * the controller.
 *
 * The cursor is placed on `mousedown` (not `click`), like a real text editor: this
 * captures the target at press time, before focusing the editor can re-render and
 * shift the layout (e.g. the expansion snippet appearing), which would otherwise
 * make the trailing `click` land on the wrong staff.
 *
 * Click-drag selection: while the primary button is held (`mousemove` with
 * `buttons === 1`), the boundary under the pointer is reported with `extend = true`,
 * so the caret set on press becomes the anchor and the drag grows the selection.
 */

import type { NoteObject } from '@tabuhstudio/shared'
import type { MouseEvent } from 'react'

export interface StaffLineProps {
    symbols: NoteObject[]
    /** Cursor index within this line, or null when the line is not active. */
    cursorIndex: number | null
    /** Highlighted selection range [from, to) on this line, or null. */
    selection?: { from: number; to: number } | null
    /** Show the caret as a block over the symbol at the cursor (overwrite mode). */
    overwrite?: boolean
    onSymbolClick: (index: number, extend?: boolean) => void
    onTrailingClick: (extend?: boolean) => void
}

export function StaffLine({
    symbols,
    cursorIndex,
    selection,
    overwrite,
    onSymbolClick,
    onTrailingClick
}: StaffLineProps) {
    // Nearest symbol boundary (this index or the next) for a pointer x within a span.
    function boundaryAt(e: MouseEvent<HTMLSpanElement>, index: number): number {
        const rect = e.currentTarget.getBoundingClientRect()
        return e.clientX < rect.left + rect.width / 2 ? index : index + 1
    }

    function handleSymbolPress(e: MouseEvent<HTMLSpanElement>, index: number) {
        e.stopPropagation()
        onSymbolClick(boundaryAt(e, index), e.shiftKey)
    }

    // While dragging with the primary button held, extend the selection to the boundary
    // under the pointer (anchor is the caret dropped on the initial press).
    function handleSymbolDrag(e: MouseEvent<HTMLSpanElement>, index: number) {
        if (e.buttons !== 1) return
        e.stopPropagation()
        onSymbolClick(boundaryAt(e, index), true)
    }

    const inSelection = (i: number) => selection != null && i >= selection.from && i < selection.to
    // Block caret only when overwriting a real symbol (not past the end) and no selection.
    const blockCaret = (i: number) => !!overwrite && !selection && cursorIndex === i && i < symbols.length

    return (
        <div
            style={{ whiteSpace: 'pre', lineHeight: 'inherit', minHeight: '1em' }}
            onMouseDown={(e) => {
                e.stopPropagation()
                onTrailingClick(e.shiftKey)
            }}
            onMouseMove={(e) => {
                // Dragging over the trailing area (past the last symbol) extends to the end.
                if (e.buttons === 1) onTrailingClick(true)
            }}
        >
            {symbols.map((sym, index) => (
                <span
                    key={index}
                    onMouseDown={(e) => handleSymbolPress(e, index)}
                    onMouseMove={(e) => handleSymbolDrag(e, index)}
                >
                    {cursorIndex === index && !blockCaret(index) && <Cursor />}
                    <span className={inSelection(index) ? 'notation-selected' : blockCaret(index) ? 'notation-cursor-block' : undefined}>
                        {sym.toString()}
                    </span>
                </span>
            ))}
            {cursorIndex === symbols.length && <Cursor />}
        </div>
    )
}

function Cursor() {
    return <span className="notation-cursor" aria-hidden="true" />
}
