/**
 * SystemNotationEditor — multiline virtual editor for one system.
 *
 * A single focusable element that renders every staff of a system as its own
 * line (via {@link StaffLine}) and routes all keyboard / paste input through
 * {@link useSystemEditor}. It is designed to be layered ON TOP of the existing
 * playback textarea: it has a transparent background and matched font / line
 * metrics, so the textarea behind it keeps carrying the playback highlight while
 * this element supplies the glyphs, the cursor, and editing.
 *
 * The host passes the staves (position + symbols, in display order) and an
 * `onChange` callback; the editor owns its cursor/edit state internally so that
 * keystrokes re-render only this component, not the whole system.
 */

import { editorFontSize } from '../../config/config'
import { useSystemEditor, type EditorStaff } from '../../componentlogic/editor/useSystemEditor'
import type { KeyMap } from '../../componentlogic/editor/keyMap'
import type { CSSProperties } from 'react'
import { StaffLine } from './StaffLine'

export interface SystemNotationEditorProps {
    /** Staves in display order (one per instrument position). */
    initialStaves: EditorStaff[]
    /** Called with the updated staves whenever an edit changes the notation. */
    onChange?: (staves: EditorStaff[]) => void
    keyMap?: KeyMap
    className?: string
    style?: CSSProperties
}

export function SystemNotationEditor({ initialStaves, onChange, keyMap, className, style }: SystemNotationEditorProps) {
    const { staves, cursor, focused, onKeyDown, onPaste, onFocus, onBlur, setCursor } = useSystemEditor({
        initialStaves,
        keyMap,
        onChange
    })

    const fontClass = `balifontspaced${editorFontSize}`

    return (
        <div
            tabIndex={0}
            role="textbox"
            aria-multiline="true"
            aria-label="system notation editor"
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={onFocus}
            onBlur={onBlur}
            className={`${fontClass}${className ? ' ' + className : ''}`}
            style={{
                outline: 'none',
                whiteSpace: 'pre',
                cursor: 'text',
                background: 'transparent',
                boxSizing: 'border-box',
                ...style
            }}
        >
            {staves.map((staff, staffIdx) => (
                <StaffLine
                    key={staff.position}
                    symbols={staff.symbols}
                    cursorIndex={focused && cursor.staff === staffIdx ? cursor.index : null}
                    onSymbolClick={(index) => setCursor(staffIdx, index)}
                    onTrailingClick={() => setCursor(staffIdx, staff.symbols.length)}
                />
            ))}
        </div>
    )
}
