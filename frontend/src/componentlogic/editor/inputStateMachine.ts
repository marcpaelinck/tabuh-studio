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
 * Octave-shifts a single symbol by `delta` (`','` = -1, `''` = 0, `'<'` = +1). Returns the new
 * NoteObject, or `null` when the symbol cannot be shifted: it is not a melodic note, the target octave
 * is out of range (below -1 / above +1), or the resulting symbol is invalid for the position.
 */
function octavateSymbol(sym: NoteObject, delta: -1 | 1, position: Position | undefined): NoteObject | null {
    if (sym.error || !NoteObject.isMelodic(sym.symbol.pitch)) return null
    const next = sym.octaveNumber + delta
    if (next < -1 || next > 1) return null
    const octaveChar = next === -1 ? ',' : next === 1 ? '<' : ''
    const raw = sym.symbol.prefix + sym.symbol.pitch + octaveChar + sym.symbol.modifier
    return tryBuild(raw, position)
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
    const built = octavateSymbol(symbols[cursorIndex - 1], delta, position)
    if (!built) return state
    return replaceSymbol(state, cursorIndex - 1, built)
}

/** Result of octavating a selection range: the new symbols on success, or a reason to show otherwise. */
export type OctavateRangeResult = { ok: true; symbols: NoteObject[] } | { ok: false; reason: string }

/**
 * Octavates every MELODIC note in the range [from, to) by `delta`. Non-melodic symbols (rests,
 * extensions, spaces) are skipped. All-or-nothing: it succeeds only when every melodic note in the
 * range can be shifted; otherwise no symbol is changed and a reason is returned for the caller to
 * surface. Also fails when the range contains no melodic notes at all. Does not mutate `symbols`.
 */
export function octavateRange(
    symbols: NoteObject[],
    from: number,
    to: number,
    delta: -1 | 1,
    position: Position | undefined
): OctavateRangeResult {
    const lo = Math.max(0, Math.min(from, to))
    const hi = Math.min(symbols.length, Math.max(from, to))
    const out = symbols.slice()
    let hasNote = false
    for (let i = lo; i < hi; i++) {
        const sym = symbols[i]
        // Skip non-melodic symbols (rests / extensions / spaces) — they are not notes.
        if (sym.error || !NoteObject.isMelodic(sym.symbol.pitch)) continue
        hasNote = true
        const built = octavateSymbol(sym, delta, position)
        if (!built) {
            return {
                ok: false,
                reason:
                    delta > 0
                        ? 'Cannot raise the octave: some selected notes are already at the highest octave.'
                        : 'Cannot lower the octave: some selected notes are already at the lowest octave.'
            }
        }
        out[i] = built
    }
    if (!hasNote) return { ok: false, reason: 'There are no notes to octavate in the selection.' }
    return { ok: true, symbols: out }
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

/**
 * Applies a mapped string (from a custom key mapping's `symbol`) to the state.
 *
 * A mapping's target can be either a whole composite symbol (e.g. `'a,'`, `'<a'`,
 * written in canonical order) or a bare modifier that should attach to the symbol
 * on the left (e.g. `','`). We therefore try to insert the string as ONE symbol
 * first — `insertSymbol` validates the whole thing via `NoteObject` — and only
 * fall back to per-character routing (`typeChar`) when that fails, which is what
 * makes single-modifier mappings and other char-sequences work. Using the atomic
 * path first also gets grace-note prefixes right (canonical prefix-before-pitch
 * order), which a naive left-to-right `typeChar` reduce would drop.
 */
export function applyString(state: EditorStaffState, str: string, position: Position | undefined): EditorStaffState {
    if (!str) return state
    const inserted = insertSymbol(state, str, position)
    if (inserted !== state) return inserted
    // Not a single valid symbol — route each character through typeChar (handles a
    // lone modifier attaching left, and any other decomposable sequence).
    return [...str].reduce((s, ch) => typeChar(s, ch, position), state)
}

/**
 * Overwrites the symbol AT the cursor with `built` and advances the cursor past it.
 * When the cursor is at the end (nothing to overwrite) it inserts instead. Invalid
 * input leaves the state unchanged. This is the overwrite-mode counterpart of
 * {@link insertSymbol}.
 */
export function overwriteSymbol(state: EditorStaffState, raw: string, position: Position | undefined): EditorStaffState {
    const built = tryBuild(raw, position)
    if (!built) return state
    const { symbols, cursorIndex } = state
    if (cursorIndex >= symbols.length) {
        return { symbols: [...symbols.slice(0, cursorIndex), built], cursorIndex: cursorIndex + 1 }
    }
    return {
        symbols: [...symbols.slice(0, cursorIndex), built, ...symbols.slice(cursorIndex + 1)],
        cursorIndex: cursorIndex + 1
    }
}

/**
 * Overwrite-mode counterpart of {@link typeChar}: a pitch character REPLACES the
 * symbol at the cursor (rather than inserting); a grace prefix / octave / stroke
 * modifier still attaches to the symbol on the left exactly as in insert mode.
 */
export function overwriteChar(state: EditorStaffState, char: string, position: Position | undefined): EditorStaffState {
    if (char.length !== 1) return state
    if (PITCH_CHARS.has(char)) return overwriteSymbol(state, char, position)
    if (GRACE_NOTE_PREFIXES.has(char) || AFTER_MODIFIERS.has(char)) return setModifier(state, char, position)
    return state
}

/**
 * Overwrite-mode counterpart of {@link applyString}: a whole valid symbol replaces the
 * symbol at the cursor; otherwise each character is routed through {@link overwriteChar}.
 */
export function overwriteString(state: EditorStaffState, str: string, position: Position | undefined): EditorStaffState {
    if (!str) return state
    const built = tryBuild(str, position)
    if (built) return overwriteSymbol(state, str, position)
    return [...str].reduce((s, ch) => overwriteChar(s, ch, position), state)
}

/**
 * Removes the symbols in the range [from, to) (order-independent) and places the
 * cursor at the range start. A no-op when the range is empty. Used to delete or
 * replace a selection.
 */
export function deleteRange(state: EditorStaffState, from: number, to: number): EditorStaffState {
    const a = clampCursor(state.symbols, Math.min(from, to))
    const b = clampCursor(state.symbols, Math.max(from, to))
    if (a === b) return state
    return { symbols: [...state.symbols.slice(0, a), ...state.symbols.slice(b)], cursorIndex: a }
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
