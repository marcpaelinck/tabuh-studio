/**
 * Virtual-editor input state machine.
 *
 * Pure, framework-agnostic operations on a single staff's notation, modelled as
 * a `NoteObject[]` with a cursor index that sits BETWEEN symbols (0 = before the
 * first symbol, `symbols.length` = after the last). The fact that a symbol is
 * made up of several font characters is hidden from the caller: the cursor only
 * ever moves and deletes by whole symbols.
 *
 * These functions never mutate their input. When an operation would produce an
 * invalid symbol it is rejected and the original state is returned unchanged.
 *
 * Character classification and symbol normalisation come from the shared
 * `NoteObject` layer; this module does not duplicate them.
 */

import { AFTER_MODIFIERS, GRACE_NOTE_PREFIXES, NoteObject, PITCH_CHARS } from '@tabuhstudio/shared'
import type { Position } from '@tabuhstudio/shared'

/** Editor state for a single staff (one instrument position). */
export interface EditorStaffState {
    /** The notation as a list of normalised symbols. */
    symbols: NoteObject[]
    /** Cursor position, between symbols: 0..symbols.length. */
    cursorIndex: number
}

/**
 * Builds a NoteObject from a raw string, returning `null` (instead of an
 * error-flagged NoteObject) when the string is not a structurally valid symbol.
 * Pre-validating with `NoteObject.validate` keeps invalid editor input from
 * emitting console noise via the NoteObject constructor.
 */
function tryBuild(raw: string, position: Position | undefined): NoteObject | null {
    try {
        NoteObject.validate(raw, position)
    } catch {
        return null
    }
    return new NoteObject(raw, position)
}

/** Clamps an index into the valid cursor range for `symbols`. */
export function clampCursor(symbols: NoteObject[], index: number): number {
    return Math.max(0, Math.min(symbols.length, index))
}

/** Moves the cursor left (-1) or right (+1) by one whole symbol. */
export function moveCursor(state: EditorStaffState, delta: -1 | 1): EditorStaffState {
    const cursorIndex = clampCursor(state.symbols, state.cursorIndex + delta)
    return cursorIndex === state.cursorIndex ? state : { ...state, cursorIndex }
}

/**
 * Inserts a complete symbol (e.g. a single pitch character, or a fixed symbol
 * such as `'a,'` supplied by a custom key mapping) at the cursor and advances
 * the cursor past it. Invalid input leaves the state unchanged.
 */
export function insertSymbol(state: EditorStaffState, raw: string, position: Position | undefined): EditorStaffState {
    const built = tryBuild(raw, position)
    if (!built) return state
    const { symbols, cursorIndex } = state
    return {
        symbols: [...symbols.slice(0, cursorIndex), built, ...symbols.slice(cursorIndex)],
        cursorIndex: cursorIndex + 1
    }
}

/**
 * Attaches a modifier character to the symbol immediately LEFT of the cursor and
 * re-normalises it. Grace-note prefixes are prepended (they sit before the pitch
 * character); all other modifiers are appended. The cursor does not move, since
 * the modified symbol occupies the same slot. The operation is rejected (state
 * returned unchanged) when there is no symbol to the left, or when the resulting
 * symbol would be invalid (e.g. a second octave or stroke modifier).
 */
export function attachModifier(state: EditorStaffState, char: string, position: Position | undefined): EditorStaffState {
    const { symbols, cursorIndex } = state
    if (cursorIndex === 0) return state
    const prev = symbols[cursorIndex - 1]
    const isGrace = GRACE_NOTE_PREFIXES.has(char)
    const raw = isGrace ? char + prev.canonicalSymbol : prev.canonicalSymbol + char
    const built = tryBuild(raw, position)
    if (!built) return state
    return {
        symbols: [...symbols.slice(0, cursorIndex - 1), built, ...symbols.slice(cursorIndex)],
        cursorIndex
    }
}

/**
 * Routes a single typed character through the state machine:
 *  - a pitch character opens a new symbol at the cursor;
 *  - a grace-note prefix or an after-modifier attaches to the symbol on the left;
 *  - anything else is ignored.
 */
export function typeChar(state: EditorStaffState, char: string, position: Position | undefined): EditorStaffState {
    if (char.length !== 1) return state
    if (PITCH_CHARS.has(char)) return insertSymbol(state, char, position)
    if (GRACE_NOTE_PREFIXES.has(char) || AFTER_MODIFIERS.has(char)) return attachModifier(state, char, position)
    return state
}

/** Removes the symbol to the LEFT of the cursor (Backspace). */
export function deleteLeft(state: EditorStaffState): EditorStaffState {
    const { symbols, cursorIndex } = state
    if (cursorIndex === 0) return state
    return {
        symbols: [...symbols.slice(0, cursorIndex - 1), ...symbols.slice(cursorIndex)],
        cursorIndex: cursorIndex - 1
    }
}

/** Removes the symbol to the RIGHT of the cursor (Delete). */
export function deleteRight(state: EditorStaffState): EditorStaffState {
    const { symbols, cursorIndex } = state
    if (cursorIndex === symbols.length) return state
    return {
        symbols: [...symbols.slice(0, cursorIndex), ...symbols.slice(cursorIndex + 1)],
        cursorIndex
    }
}
