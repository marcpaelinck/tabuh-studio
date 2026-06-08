/**
 * Keyboard mapping layer for the virtual editor.
 *
 * A `KeyMap` translates a keystroke into an abstract {@link EditorAction}. The
 * keyboard handler then executes that action against the input state machine.
 * This indirection is what makes per-user keyboard customisation possible later:
 * a settings UI only needs to produce a different `KeyMap`, with no change to the
 * handler or the state machine.
 *
 * Example (from the design notes): the default mapping of `'A'` produces an
 * `insertChar` action, which the state machine resolves to "add a grace note to
 * the symbol left of the cursor" (because `'A'` is a grace-note prefix). An
 * alternative personal mapping could instead return
 * `{ type: 'insertSymbol', value: 'a,' }` for the same keystroke, inserting the
 * pitch `a` in the lower octave.
 */

/** The abstract actions the editor understands. */
export type EditorActionType =
    | 'cursorLeft'
    | 'cursorRight'
    | 'cursorUp' // move to the staff above (multi-staff editor only)
    | 'cursorDown' // move to the staff below (multi-staff editor only)
    | 'cursorStart'
    | 'cursorEnd'
    | 'octaveUp' // raise the octave of the melodic note left of the cursor
    | 'octaveDown' // lower the octave of the melodic note left of the cursor
    | 'deleteLeft'
    | 'deleteRight'
    | 'insertChar' // insert/attach the literal character that was typed
    | 'insertSymbol' // insert a fixed symbol string (action.value)
    | 'attachModifier' // attach a fixed modifier char (action.value)
    | 'ignore' // swallow the keystroke, do nothing

export interface EditorAction {
    type: EditorActionType
    /** Payload for `insertSymbol` / `attachModifier`. */
    value?: string
}

/** A normalised keystroke, independent of the DOM event. */
export interface Keystroke {
    key: string
    ctrl: boolean
    alt: boolean
    shift: boolean
    meta: boolean
}

/**
 * Maps a keystroke to an action. Returning `undefined` means "not handled" — the
 * keyboard handler will let the keystroke fall through (the browser default is
 * still suppressed for editing safety; see `useEditorKeyboard`).
 */
export type KeyMap = (ks: Keystroke) => EditorAction | undefined

/** The built-in default mapping. */
export const defaultKeyMap: KeyMap = (ks) => {
    if (ks.ctrl || ks.meta) {
        // Ctrl/Cmd + Up/Down octavate the melodic note left of the cursor.
        if (ks.key === 'ArrowUp') return { type: 'octaveUp' }
        if (ks.key === 'ArrowDown') return { type: 'octaveDown' }
        // Copy (Ctrl/Cmd+C) is left to the browser's native selection copy.
        // Paste (Ctrl/Cmd+V) is handled by the editor's onPaste event.
        // Cut is swallowed for now to avoid desyncing the DOM from editor state
        // (selection-based cut is a later feature).
        if (ks.key === 'x' || ks.key === 'X') return { type: 'ignore' }
        return undefined
    }

    switch (ks.key) {
        case 'ArrowLeft':
            return { type: 'cursorLeft' }
        case 'ArrowRight':
            return { type: 'cursorRight' }
        case 'ArrowUp':
            return { type: 'cursorUp' }
        case 'ArrowDown':
            return { type: 'cursorDown' }
        case 'Home':
            return { type: 'cursorStart' }
        case 'End':
            return { type: 'cursorEnd' }
        case 'Backspace':
            return { type: 'deleteLeft' }
        case 'Delete':
            return { type: 'deleteRight' }
    }

    // Any single printable character (without Alt) is sent to the state machine,
    // which decides whether it opens a new symbol or attaches as a modifier.
    if (ks.key.length === 1 && !ks.alt) return { type: 'insertChar' }

    return undefined
}
