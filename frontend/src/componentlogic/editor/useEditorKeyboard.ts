/**
 * React keyboard handler for the virtual editor.
 *
 * This is the bridge between raw DOM keyboard events and the pure state machine.
 * It resolves each keystroke through a {@link KeyMap} into an abstract
 * {@link EditorAction}, then applies that action to the current staff state.
 *
 * All native browser text-editing behaviour is suppressed: the component never
 * relies on the browser to manage cursor position, so a handled keystroke always
 * calls `preventDefault`.
 */

import { useCallback } from 'react'
import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'
import type { NoteObject, Position } from '@tabuhstudio/shared'
import {
    attachModifier,
    deleteLeft,
    deleteRight,
    insertSymbol,
    moveCursor,
    typeChar,
    type EditorStaffState
} from './inputStateMachine'
import { defaultKeyMap, type KeyMap, type Keystroke } from './keyMap'

function toKeystroke(e: KeyboardEvent): Keystroke {
    return { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
}

export interface UseEditorKeyboardOptions {
    /** Current state of the staff being edited. */
    state: EditorStaffState
    /** State setter (the editor owns the state). */
    setState: Dispatch<SetStateAction<EditorStaffState>>
    /** Instrument position bound to every NoteObject produced. */
    position?: Position
    /** Optional custom key mapping; defaults to {@link defaultKeyMap}. */
    keyMap?: KeyMap
    /** Called with the new symbol list whenever an edit changes the notation. */
    onChange?: (symbols: NoteObject[]) => void
}

/**
 * Returns an `onKeyDown` handler for a focusable notation element.
 */
export function useEditorKeyboard({
    state,
    setState,
    position,
    keyMap = defaultKeyMap,
    onChange
}: UseEditorKeyboardOptions): (e: KeyboardEvent) => void {
    return useCallback(
        (e: KeyboardEvent) => {
            const action = keyMap(toKeystroke(e))
            if (!action) return
            // A recognised keystroke is always handled by us, never the browser.
            e.preventDefault()
            if (action.type === 'ignore') return

            let next = state
            switch (action.type) {
                case 'cursorLeft':
                    next = moveCursor(state, -1)
                    break
                case 'cursorRight':
                    next = moveCursor(state, 1)
                    break
                case 'cursorStart':
                    next = { ...state, cursorIndex: 0 }
                    break
                case 'cursorEnd':
                    next = { ...state, cursorIndex: state.symbols.length }
                    break
                case 'deleteLeft':
                    next = deleteLeft(state)
                    break
                case 'deleteRight':
                    next = deleteRight(state)
                    break
                case 'insertChar':
                    next = typeChar(state, e.key, position)
                    break
                case 'insertSymbol':
                    next = action.value ? insertSymbol(state, action.value, position) : state
                    break
                case 'attachModifier':
                    next = action.value ? attachModifier(state, action.value, position) : state
                    break
            }

            if (next === state) return
            setState(next)
            // Notify only when the notation itself changed (not on pure cursor moves).
            if (next.symbols !== state.symbols) onChange?.(next.symbols)
        },
        [state, setState, position, keyMap, onChange]
    )
}
