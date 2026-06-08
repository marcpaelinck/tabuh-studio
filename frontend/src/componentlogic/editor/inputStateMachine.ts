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

import type { Position } from '@tabuhstudio/shared'
import { AFTER_MODIFIERS, GRACE_NOTE_PREFIXES, NoteObject, OCTAVE_MODIFIERS, PITCH_CHARS } from '@tabuhstudio/shared'

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

/** Replaces the symbol at `index` with `built`, leaving the cursor where it is. */
function replaceSymbol(state: EditorStaffState, index: number, built: NoteObject): EditorStaffState {
    return {
        symbols: [...state.symbols.slice(0, index), built, ...state.symbols.slice(index + 1)],
        cursorIndex: state.cursorIndex
    }
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
 * symbol would be invalid (e.g. a second octave modifier).
 *
 * Note: stroke and pattern modifiers are handled by {@link setModifier}
 * (replace/toggle semantics); this function deals with grace prefixes and octave
 * modifiers.
 */
export function attachModifier(
    state: EditorStaffState,
    char: string,
    position: Position | undefined
): EditorStaffState {
    const { symbols, cursorIndex } = state
    if (cursorIndex === 0) return state
    const prev = symbols[cursorIndex - 1]
    const isGrace = GRACE_NOTE_PREFIXES.has(char)
    const raw = isGrace ? char + prev.canonicalSymbol : prev.canonicalSymbol + char
    const built = tryBuild(raw, position)
    if (!built) return state
    return replaceSymbol(state, cursorIndex - 1, built)
}

/**
 * Sets a modifier (prefix, octave or stroke/pattern modifier) of the symbol LEFT of the cursor.
 * Each slot contains a single character, so this replaces whatever modifier is
 * already there (including switching between a stroke and a pattern). Typing the
 * modifier that is already present toggles it off. The cursor does not move.
 */
export function setModifier(state: EditorStaffState, char: string, position: Position | undefined): EditorStaffState {
    const { symbols, cursorIndex } = state
    if (cursorIndex === 0) return state
    const prev = symbols[cursorIndex - 1]
    if (prev.error) return state
    const isGrace = GRACE_NOTE_PREFIXES.has(char)
    const isOctave = OCTAVE_MODIFIERS.has(char)
    const isModifier = !isGrace && !isOctave
    const compareChar = isGrace ? prev.symbol.prefix : isOctave ? prev.symbol.octave : prev.symbol.modifier
    const newModifier = compareChar === char ? '' : char
    const raw =
        (isGrace ? newModifier : prev.symbol.prefix) +
        prev.symbol.pitch +
        (isOctave ? newModifier : prev.symbol.octave) +
        (isModifier ? newModifier : prev.symbol.modifier)
    const built = tryBuild(raw, position)
    if (!built) return state
    return replaceSymbol(state, cursorIndex - 1, built)
}

/**
 * Raises (+1) or lowers (-1) the octave of the MELODIC note LEFT of the cursor
 * by changing its octave modifier (`','` = -1, `''` = 0, `'<'` = +1). It is a
 * no-op for non-melodic notes and when the octave is already at its limit
 * (cannot go below -1 or above +1). The cursor does not move.
 */
export function changeOctave(state: EditorStaffState, delta: -1 | 1, position: Position | undefined): EditorStaffState {
    const { symbols, cursorIndex } = state
    if (cursorIndex === 0) return state
    const prev = symbols[cursorIndex - 1]
    if (prev.error || !NoteObject.isMelodic(prev.symbol.pitch)) return state
    const next = prev.octaveNumber + delta
    if (next < -1 || next > 1) return state
    const octaveChar = next === -1 ? ',' : next === 1 ? '<' : ''
    const raw = prev.symbol.prefix + prev.symbol.pitch + octaveChar + prev.symbol.modifier
    const built = tryBuild(raw, position)
    if (!built) return state
    return replaceSymbol(state, cursorIndex - 1, built)
}

/**
 * Routes a single typed character through the state machine:
 *  - a pitch character opens a new symbol at the cursor;
 *  - a stroke or pattern modifier replaces/toggles on the symbol to the left;
 *  - a grace-note prefix or an octave modifier attaches to the symbol on the left;
 *  - anything else is ignored.
 */
export function typeChar(state: EditorStaffState, char: string, position: Position | undefined): EditorStaffState {
    if (char.length !== 1) return state
    if (PITCH_CHARS.has(char)) return insertSymbol(state, char, position)
    if (GRACE_NOTE_PREFIXES.has(char) || AFTER_MODIFIERS.has(char)) return setModifier(state, char, position)
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
    return { symbols: [...symbols.slice(0, cursorIndex), ...symbols.slice(cursorIndex + 1)], cursorIndex }
}
