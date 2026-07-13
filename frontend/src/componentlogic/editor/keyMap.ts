/**
 * Keyboard mapping layer for the virtual editor.
 *
 * A `KeyMap` translates a keystroke into an abstract {@link EditorAction}. The
 * keyboard handler then executes that action against the input state machine.
 * This indirection is what makes per-user keyboard customisation possible: a
 * settings UI only produces a different {@link KeyMapDefinition}, with no change
 * to the handler or the state machine.
 *
 * A compiled `KeyMap` is layered:
 *   1. a FIXED control layer (cursor moves, delete, Ctrl±octave) that the user
 *      cannot rebind — this is what keeps navigation working;
 *   2. the user's editable mappings (keystroke → notation string), consulted only
 *      for keystrokes the control layer did not claim;
 *   3. a fallback that sends any remaining single printable character to the state
 *      machine as `insertChar` (so unmapped keys still type their literal symbol).
 *
 * The user only ever edits layer 2 (a list of {@link EditableKeyMapping}); a
 * mapping's `symbol` is turned into an `insertString` action whose value the state
 * machine inserts as a whole symbol (or attaches as a modifier). See `applyString`.
 */

import type { EditableKeyMapping, EditorAction, KeyMapDefinition, Keystroke } from '@tabuhstudio/shared'

/**
 * Maps a keystroke to an action. Returning `undefined` means "not handled" — the
 * keyboard handler will let the keystroke fall through (the browser default is
 * still suppressed for editing safety; see `useEditorKeyboard`).
 */
export type KeyMap = (ks: Keystroke) => EditorAction | undefined

/**
 * The FIXED, non-editable control layer: navigation, deletion and octave change.
 * Returns `undefined` for anything it does not own, so the caller can consult the
 * user mappings next.
 */
function controlAction(ks: Keystroke): EditorAction | undefined {
    if (ks.ctrl || ks.meta) {
        // Ctrl/Cmd + Up/Down octavate the melodic note left of the cursor.
        if (ks.key === 'ArrowUp') return { type: 'octaveUp' }
        if (ks.key === 'ArrowDown') return { type: 'octaveDown' }
        // Copy (Ctrl/Cmd+C) is left to the browser's native selection copy.
        // Paste (Ctrl/Cmd+V) is handled by the editor's onPaste event.
        // Cut is swallowed for now to avoid desyncing the DOM from editor state.
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
    return undefined
}

/**
 * True when two keystrokes are the same binding.
 *
 * For a single printable character the shift state is already reflected in `key`
 * (`'A'` vs `'a'`), so comparing `shift` as well would double-count it — we ignore
 * `shift` for length-1 keys and compare it only for named keys (`ArrowUp`, …).
 */
function keystrokeMatches(a: Keystroke, b: Keystroke): boolean {
    if (a.key !== b.key || a.ctrl !== b.ctrl || a.alt !== b.alt || a.meta !== b.meta) return false
    const printable = a.key.length === 1
    return printable || a.shift === b.shift
}

/**
 * Looks up the notation string a keystroke is bound to, or `undefined` if none.
 * A pure lookup: position/instrument-independent (instrument scoping is applied
 * when the map is compiled, not here).
 */
export function keystrokeToString(mappings: EditableKeyMapping[], ks: Keystroke): string | undefined {
    return mappings.find((m) => keystrokeMatches(m.keystroke, ks))?.symbol
}

/**
 * Compiles a {@link KeyMapDefinition} into a runnable {@link KeyMap}.
 *
 * TODO(instruments): a mapping's `instruments` scope is not yet consulted — every
 * mapping is currently active regardless of the edited instrument. This is fine
 * for the compact (aggregate, position-independent) editor; per-instrument
 * filtering will be added once the compact-vs-instrument aggregation is settled.
 */
export function compileKeyMap(def: KeyMapDefinition): KeyMap {
    const { mappings } = def
    return (ks) => {
        // 1. fixed control keys always win.
        const control = controlAction(ks)
        if (control) return control
        // 2. user mapping: keystroke -> notation string.
        const symbol = keystrokeToString(mappings, ks)
        if (symbol !== undefined) return { type: 'insertString', value: symbol }
        // 3. fallback: a single printable char (no Ctrl/Alt/Meta) types its literal symbol.
        if (ks.key.length === 1 && !ks.alt && !ks.ctrl && !ks.meta) return { type: 'insertChar' }
        return undefined
    }
}

/**
 * The built-in default mapping: the control layer + literal typing, with no custom
 * bindings. Behaviourally identical to the pre-`KeyMapDefinition` default.
 */
export const defaultKeyMap: KeyMap = compileKeyMap({ id: 'default', name: 'Default', mappings: [] })
