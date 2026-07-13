/**
 * useCompactSystemEditor — controller for the COMPACT (grouped/shorthand) editor.
 *
 * This is the compact-view analogue of {@link useSystemEditor}. Its lines are
 * notation GROUPS (each may stand for several instrument positions) rather than
 * individual staves. Each line's notation is a single FLAT array of symbols (like a
 * Staff); the cursor is two-dimensional: { line, index }.
 *
 * Compact symbols are position-independent (exactly as the parser builds them with
 * an `undefined` position), so all state-machine operations are run with no
 * position. Editing here is allowed to use shorthand (e.g. norot) and aggregated
 * notation — that is the whole point of the compact view.
 *
 * The host turns the emitted lines back into `System.groups` and re-derives the
 * expanded staffs via expandSystem().
 */

import type { Keystroke, NoteObject, Position } from '@tabuhstudio/shared'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useCallback, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { castGroupToSolo, type CastingInstruction } from '../castingRulesManager'
import {
    applyString,
    changeOctave,
    clampCursor,
    deleteLeft,
    deleteRight,
    insertSymbol,
    moveCursor,
    typeChar,
    type EditorStaffState
} from './inputStateMachine'
import { defaultKeyMap, type KeyMap } from './keyMap'

/** One compact line = one notation group, holding a flat array of symbols. */
export interface CompactLine {
    id: string
    positions: Position[]
    notation: NoteObject[]
}

/** Cursor across the compact grid: which line, and where within its notation. */
export interface CompactCursor {
    line: number
    index: number // the index of the note in the CompactLine's notation
}

interface CompactEditorState {
    lines: CompactLine[]
    cursor: CompactCursor
}

export interface UseCompactSystemEditorOptions {
    initialLines: CompactLine[]
    keyMap?: KeyMap
    /** System-wide casting context; used when splitting a position out of a group. */
    castingInstructions?: CastingInstruction[]
    /** Called with the updated lines whenever an edit changes the notation or structure. */
    onChange?: (lines: CompactLine[]) => void
}

export interface CompactEditorController {
    lines: CompactLine[]
    cursor: CompactCursor
    focused: boolean
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
    onPaste: (e: ClipboardEvent<HTMLDivElement>) => void
    onFocus: () => void
    onBlur: () => void
    setCursor: (line: number, index: number) => void
    /** Insert a new staff (group) at `atIndex`, seeded with `positions` and empty notation. */
    addLine: (atIndex: number, positions: Position[]) => void
    /** Remove the staff (group) at `index`. */
    removeLine: (index: number) => void
    /** Add `position` to the group at `lineIndex`. */
    addPosition: (lineIndex: number, position: Position) => void
    /** Remove `position` from a multi-position group, splitting it into its own solo staff. */
    removePosition: (lineIndex: number, position: Position) => void
}

function toKeystroke(e: KeyboardEvent): Keystroke {
    return { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
}

const COMPACT_POSITION = undefined // compact symbols are not bound to a position

export function useCompactSystemEditor({
    initialLines,
    keyMap = defaultKeyMap,
    castingInstructions,
    onChange
}: UseCompactSystemEditorOptions): CompactEditorController {
    const [state, setState] = useState<CompactEditorState>(() => ({
        lines: initialLines,
        cursor: { line: 0, index: initialLines[0]?.notation.length ?? 0 }
    }))
    const [focused, setFocused] = useState(false)

    // Applies a pure single-staff op to the active LINE and writes it back,
    // reporting whether the notation (not just the cursor) changed.
    const applyToActiveLine = useCallback(
        (st: CompactEditorState, op: (s: EditorStaffState) => EditorStaffState): CompactEditorState => {
            const line = st.lines[st.cursor.line]
            if (!line) return st
            const result = op({ symbols: line.notation, cursorIndex: st.cursor.index })
            const notationChanged = result.symbols !== line.notation
            const cursorChanged = result.cursorIndex !== st.cursor.index
            if (!notationChanged && !cursorChanged) return st
            let lines = st.lines
            if (notationChanged) {
                lines = st.lines.with(st.cursor.line, { ...line, notation: result.symbols })
                onChange?.(lines)
            }
            return { lines, cursor: { ...st.cursor, index: result.cursorIndex } }
        },
        [onChange]
    )

    // Left/right wrap to the adjacent line at the ends.
    const moveLeftRight = useCallback(
        (st: CompactEditorState, delta: -1 | 1): CompactEditorState => {
            const line = st.lines[st.cursor.line]
            if (!line) return st
            if (delta === -1 && st.cursor.index === 0) {
                if (st.cursor.line === 0) return st
                const l = st.cursor.line - 1
                return { lines: st.lines, cursor: { line: l, index: st.lines[l].notation.length } }
            }
            if (delta === 1 && st.cursor.index === line.notation.length) {
                if (st.cursor.line === st.lines.length - 1) return st
                return { lines: st.lines, cursor: { line: st.cursor.line + 1, index: 0 } }
            }
            return applyToActiveLine(st, (s) => moveCursor(s, delta))
        },
        [applyToActiveLine]
    )

    // Up/down move between lines, keeping the column (index) clamped to the target line.
    const moveUpDown = useCallback((st: CompactEditorState, delta: -1 | 1): CompactEditorState => {
        const line = st.cursor.line + delta
        if (line < 0 || line >= st.lines.length) return st
        return { lines: st.lines, cursor: { line, index: clampCursor(st.lines[line].notation, st.cursor.index) } }
    }, [])

    const onKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            const action = keyMap(toKeystroke(e))
            if (!action) return
            e.preventDefault()
            if (action.type === 'ignore') return
            setState((st) => {
                switch (action.type) {
                    case 'cursorLeft':
                        return moveLeftRight(st, -1)
                    case 'cursorRight':
                        return moveLeftRight(st, 1)
                    case 'cursorUp':
                        return moveUpDown(st, -1)
                    case 'cursorDown':
                        return moveUpDown(st, 1)
                    case 'cursorStart':
                        return applyToActiveLine(st, (s) => ({ ...s, cursorIndex: 0 }))
                    case 'cursorEnd':
                        return applyToActiveLine(st, (s) => ({ ...s, cursorIndex: s.symbols.length }))
                    case 'octaveUp':
                        return applyToActiveLine(st, (s) => changeOctave(s, 1, COMPACT_POSITION))
                    case 'octaveDown':
                        return applyToActiveLine(st, (s) => changeOctave(s, -1, COMPACT_POSITION))
                    case 'deleteLeft':
                        return applyToActiveLine(st, deleteLeft)
                    case 'deleteRight':
                        return applyToActiveLine(st, deleteRight)
                    case 'insertChar':
                        return applyToActiveLine(st, (s) => typeChar(s, e.key, COMPACT_POSITION))
                    case 'insertSymbol':
                        return action.value
                            ? applyToActiveLine(st, (s) => insertSymbol(s, action.value!, COMPACT_POSITION))
                            : st
                    case 'insertString':
                        return action.value
                            ? applyToActiveLine(st, (s) => applyString(s, action.value!, COMPACT_POSITION))
                            : st
                    default:
                        return st
                }
            })
        },
        [keyMap, applyToActiveLine, moveLeftRight, moveUpDown]
    )

    // Minimal paste: insert the first clipboard line's symbols into the active line
    // at the cursor, routed through typeChar so only valid symbols land.
    const onPaste = useCallback(
        (e: ClipboardEvent<HTMLDivElement>) => {
            const text = e.clipboardData.getData('text')
            if (!text) return
            e.preventDefault()
            const firstLine = text.split(/\r?\n/)[0] ?? ''
            if (!firstLine) return
            setState((st) =>
                applyToActiveLine(st, (s) => [...firstLine].reduce((acc, ch) => typeChar(acc, ch, COMPACT_POSITION), s))
            )
        },
        [applyToActiveLine]
    )

    const setCursor = useCallback(
        (line: number, index: number) =>
            setState((st) => {
                if (line < 0 || line >= st.lines.length) return st
                return { lines: st.lines, cursor: { line, index: clampCursor(st.lines[line].notation, index) } }
            }),
        []
    )

    const onFocus = useCallback(() => setFocused(true), [])
    const onBlur = useCallback(() => setFocused(false), [])

    // --- Group-structure editing (Step 4) -------------------------------------

    // Insert a new staff seeded with `positions` and empty notation. The cursor moves
    // into the new line. (Columns are the user's to align; no auto-padding.)
    const addLine = useCallback(
        (atIndex: number, positions: Position[]) =>
            setState((st) => {
                if (positions.length === 0) return st
                const newLine: CompactLine = { id: uuidv4(), positions: [...positions], notation: [] }
                const idx = Math.max(0, Math.min(st.lines.length, atIndex))
                const lines = [...st.lines.slice(0, idx), newLine, ...st.lines.slice(idx)]
                onChange?.(lines)
                return { lines, cursor: { line: idx, index: 0 } }
            }),
        [onChange]
    )

    const removeLine = useCallback(
        (index: number) =>
            setState((st) => {
                if (index < 0 || index >= st.lines.length) return st
                const lines = st.lines.filter((_, i) => i !== index)
                onChange?.(lines)
                if (lines.length === 0) return { lines, cursor: { line: 0, index: 0 } }
                const line = Math.min(lines.length - 1, st.cursor.line > index ? st.cursor.line - 1 : st.cursor.line)
                return { lines, cursor: { line, index: clampCursor(lines[line].notation, st.cursor.index) } }
            }),
        [onChange]
    )

    const addPosition = useCallback(
        (lineIndex: number, position: Position) =>
            setState((st) => {
                const line = st.lines[lineIndex]
                if (!line || line.positions.includes(position)) return st
                const lines = st.lines.with(lineIndex, { ...line, positions: [...line.positions, position] })
                onChange?.(lines)
                return { ...st, lines }
            }),
        [onChange]
    )

    // Removing a position from a multi-position group splits it into its own solo staff
    // carrying the cast notation it had (see castGroupToSolo). A group's last position
    // cannot be removed (remove the whole line instead) — the UI disables that case.
    const removePosition = useCallback(
        (lineIndex: number, position: Position) =>
            setState((st) => {
                const line = st.lines[lineIndex]
                if (!line || !line.positions.includes(position) || line.positions.length <= 1) return st
                const soloNotation = castGroupToSolo(line.positions, line.notation, position, castingInstructions)
                const reduced: CompactLine = { ...line, positions: line.positions.filter((p) => p !== position) }
                const solo: CompactLine = { id: uuidv4(), positions: [position], notation: soloNotation }
                const lines = [...st.lines.slice(0, lineIndex), reduced, solo, ...st.lines.slice(lineIndex + 1)]
                onChange?.(lines)
                return { ...st, lines }
            }),
        [onChange, castingInstructions]
    )

    return {
        lines: state.lines,
        cursor: state.cursor,
        focused,
        onKeyDown,
        onPaste,
        onFocus,
        onBlur,
        setCursor,
        addLine,
        removeLine,
        addPosition,
        removePosition
    }
}
