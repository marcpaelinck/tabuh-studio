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
    /**
     * When true the editor is a non-interactive, REACTIVE read-only display: it
     * renders straight from `initialStaves` on every render (so it reflects
     * external updates, e.g. compact-view edits flowing through expandSystem),
     * shows no cursor, and ignores keyboard/paste input.
     */
    readOnly?: boolean
}

export function SystemNotationEditor({
    initialStaves,
    onChange,
    keyMap,
    className,
    style,
    readOnly
}: SystemNotationEditorProps) {
    const controller = useSystemEditor({ initialStaves, keyMap, onChange })

    // In read-only mode we ignore the controller's internal (mount-seeded) state
    // and render from the live prop, so the view tracks external changes.
    const staves = readOnly ? initialStaves : controller.staves
    const showCursor = !readOnly && controller.focused

    const fontClass = `balifontspaced${editorFontSize}`

    return (
        <div
            tabIndex={readOnly ? -1 : 0}
            role="textbox"
            aria-multiline="true"
            aria-readonly={readOnly}
            aria-label="system notation editor"
            onKeyDown={readOnly ? undefined : controller.onKeyDown}
            onPaste={readOnly ? undefined : controller.onPaste}
            onFocus={readOnly ? undefined : controller.onFocus}
            onBlur={readOnly ? undefined : controller.onBlur}
            className={`${fontClass}${className ? ' ' + className : ''}`}
            style={{
                outline: 'none',
                whiteSpace: 'pre',
                cursor: readOnly ? 'default' : 'text',
                background: 'transparent',
                boxSizing: 'border-box',
                ...style
            }}
        >
            {staves.map((staff, staffIdx) => (
                <StaffLine
                    key={staff.position}
                    symbols={staff.symbols}
                    cursorIndex={showCursor && controller.cursor.staff === staffIdx ? controller.cursor.index : null}
                    onSymbolClick={readOnly ? () => {} : (index) => controller.setCursor(staffIdx, index)}
                    onTrailingClick={readOnly ? () => {} : () => controller.setCursor(staffIdx, staff.symbols.length)}
                />
            ))}
        </div>
    )
}
