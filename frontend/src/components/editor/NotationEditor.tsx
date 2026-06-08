/**
 * NotationEditor — presentational virtual-cursor editor for a single staff.
 *
 * Renders a `NoteObject[]` using the (negatively spaced) BaliMusic font, drawing
 * a blinking cursor BETWEEN whole symbols. It owns no state: the parent supplies
 * the symbols, the cursor index and the event handlers (typically produced by
 * `useNotationEditor`). The browser's native text editing is never used — the
 * element is focusable and forwards every keystroke to `onKeyDown`.
 *
 * Clicking a symbol snaps the cursor to the nearest symbol boundary (left or
 * right half), so the multi-character makeup of a symbol stays invisible to the
 * user.
 */

import type { NoteObject } from '@tabuhstudio/shared'
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { editorFontSize } from '../../config/config'

export interface NotationEditorProps {
    /** The notation to render. */
    symbols: NoteObject[]
    /** Cursor position, between symbols: 0..symbols.length. */
    cursorIndex: number
    /** Whether to draw the cursor (typically: is this staff focused?). */
    focused?: boolean
    /** Keystroke handler (from `useEditorKeyboard` / `useNotationEditor`). */
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
    /** Called with the desired cursor index when the user clicks. */
    onSetCursor: (index: number) => void
    /** Fired when the element gains focus. */
    onFocus?: () => void
    /** Focus the element on mount. */
    autoFocus?: boolean
    /** Extra class names appended after the font class. */
    className?: string
    style?: CSSProperties
}

export function NotationEditor({
    symbols,
    cursorIndex,
    focused = true,
    onKeyDown,
    onSetCursor,
    onFocus,
    autoFocus = false,
    className,
    style
}: NotationEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (autoFocus) containerRef.current?.focus()
    }, [autoFocus])

    const fontClass = `balifontspaced${editorFontSize}`

    function handleSymbolClick(e: MouseEvent<HTMLSpanElement>, index: number) {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const mid = rect.left + rect.width / 2
        onSetCursor(e.clientX < mid ? index : index + 1)
    }

    // A click in the empty area to the right of the last symbol parks the cursor
    // at the end.
    function handleContainerClick() {
        onSetCursor(symbols.length)
    }

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            role="textbox"
            aria-label="notation editor"
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onClick={handleContainerClick}
            className={`${fontClass}${className ? ' ' + className : ''}`}
            style={{ outline: 'none', whiteSpace: 'pre', cursor: 'text', display: 'inline-block', minWidth: '1ch', ...style }}
        >
            {symbols.map((sym, index) => (
                <span key={index} onClick={(e) => handleSymbolClick(e, index)}>
                    {focused && index === cursorIndex && <Cursor />}
                    <span>{sym.toString()}</span>
                </span>
            ))}
            {focused && cursorIndex === symbols.length && <Cursor />}
        </div>
    )
}

function Cursor() {
    return <span className="notation-cursor" aria-hidden="true" />
}
