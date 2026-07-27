/**
 * useCompactSystemEditor — the controller for the editor.
 *
 * The compact (grouped/shorthand) view is the single editable surface and the
 * source of truth; the expanded per-position view is always read-only. Its lines are
 * notation GROUPS (each may stand for several instrument positions) rather than
 * individual staves. Each line's notation is a single FLAT array of symbols (like a
 * Staff); the cursor is two-dimensional: { line, index }.
 *
 * Compact symbols are position-independent (exactly as the parser builds them with
 * an `undefined` position), so all state-machine operations are run with no
 * position. Editing here is allowed to use shorthand (e.g. norot) and aggregated
 * notation — that is the whole point of the compact view.
 *
 * Selection / clipboard / overwrite (Phase 1):
 *   - `anchor` marks the fixed end of a selection on the cursor's line (single line
 *     only for now); the caret (`cursor.index`) is the moving end. A selection exists
 *     when `anchor != null && anchor != cursor.index`.
 *   - Shift+move and Shift+click extend it; a plain move / click collapses it.
 *   - Ctrl/Cmd+C copies, Ctrl/Cmd+X cuts, Ctrl/Cmd+A selects the whole line, and the
 *     Insert key toggles overwrite mode. Copy/cut/overwrite state lives in the shared
 *     `useEditorStateStore`; the selection is also mirrored there for external readers.
 *
 * The host turns the emitted lines back into `System.groups` and re-derives the
 * expanded staffs via expandSystem().
 */

import type { Keystroke, NoteObject, Position } from '@tabuhstudio/shared'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { registerEditor, useEditorStateStore, type EditorRestorer } from '../../stores/useEditorStateStore'
import { castGroupToSolo, type CastingInstruction } from '../castingRulesManager'
import {
    applyString,
    changeOctave,
    clampCursor,
    deleteLeft,
    deleteRange,
    deleteRight,
    insertSymbol,
    overwriteChar,
    overwriteString,
    overwriteSymbol,
    typeChar,
    type EditorStaffState
} from './inputStateMachine'
import { defaultKeyMap, type KeyMap } from './keyMap'
import { serializeStaff } from './notationClipboard'

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
    /** Fixed end of the selection on `cursor.line`, or null when nothing is selected. */
    anchor: number | null
}

export interface UseCompactSystemEditorOptions {
    initialLines: CompactLine[]
    /** UUID of the system this editor edits (used to scope the selection + undo history). */
    systemUuid: string
    keyMap?: KeyMap
    /** System-wide casting context; used when splitting a position out of a group. */
    castingInstructions?: CastingInstruction[]
    /** Called with the updated lines whenever an edit changes the notation or structure. */
    onChange?: (lines: CompactLine[]) => void
    /** Focuses this editor's DOM surface (used to route focus on undo/redo). */
    focusEditor?: () => void
}

export interface CompactEditorController {
    lines: CompactLine[]
    cursor: CompactCursor
    /** Fixed end of the active selection on `cursor.line`, or null. */
    anchor: number | null
    focused: boolean
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
    onPaste: (e: ClipboardEvent<HTMLDivElement>) => void
    onFocus: () => void
    onBlur: () => void
    /** Place the caret; `extend` (shift-click) keeps/creates a selection on the same line. */
    setCursor: (line: number, index: number, extend?: boolean) => void
    /** Insert a new staff (group) at `atIndex`, seeded with `positions` and empty notation. */
    addLine: (atIndex: number, positions: Position[]) => void
    /** Remove the staff (group) at `index`. */
    removeLine: (index: number) => void
    /** Add `position` to the group at `lineIndex`. */
    addPosition: (lineIndex: number, position: Position) => void
    /** Remove `position` from a multi-position group, splitting it into its own solo staff. */
    removePosition: (lineIndex: number, position: Position) => void
    /** Replace the whole notation of the line at `lineIndex` (e.g. copy-from-system). Undoable. */
    replaceLineNotation: (lineIndex: number, notation: NoteObject[]) => void
}

function toKeystroke(e: KeyboardEvent): Keystroke {
    return { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
}

const COMPACT_POSITION = undefined // compact symbols are not bound to a position

/** The selection range [from, to) on the cursor line, or null when there is none. */
function selectionRange(st: CompactEditorState): [number, number] | null {
    if (st.anchor === null || st.anchor === st.cursor.index) return null
    return [Math.min(st.anchor, st.cursor.index), Math.max(st.anchor, st.cursor.index)]
}

/** New caret position for a horizontal move, or null when it cannot move. */
function computeLeftRight(st: CompactEditorState, delta: -1 | 1): CompactCursor | null {
    const line = st.lines[st.cursor.line]
    if (!line) return null
    if (delta === -1 && st.cursor.index === 0) {
        if (st.cursor.line === 0) return null
        const l = st.cursor.line - 1
        return { line: l, index: st.lines[l].notation.length }
    }
    if (delta === 1 && st.cursor.index === line.notation.length) {
        if (st.cursor.line === st.lines.length - 1) return null
        return { line: st.cursor.line + 1, index: 0 }
    }
    return { line: st.cursor.line, index: clampCursor(line.notation, st.cursor.index + delta) }
}

/** New caret position for a vertical move, or null when it cannot move. */
function computeUpDown(st: CompactEditorState, delta: -1 | 1): CompactCursor | null {
    const line = st.cursor.line + delta
    if (line < 0 || line >= st.lines.length) return null
    return { line, index: clampCursor(st.lines[line].notation, st.cursor.index) }
}

const writeOsClipboard = (text: string) => {
    try {
        navigator.clipboard?.writeText(text).catch(() => {})
    } catch {
        /* clipboard API unavailable — the in-app store copy still works */
    }
}

export function useCompactSystemEditor({
    initialLines,
    systemUuid,
    keyMap = defaultKeyMap,
    castingInstructions,
    onChange,
    focusEditor
}: UseCompactSystemEditorOptions): CompactEditorController {
    const [state, setState] = useState<CompactEditorState>(() => ({
        lines: initialLines,
        cursor: { line: 0, index: initialLines[0]?.notation.length ?? 0 },
        anchor: null
    }))
    const [focused, setFocused] = useState(false)
    const setSelection = useEditorStateStore((s) => s.setSelection)

    // Latest state, read synchronously by the undo/redo restorer (see registerEditor).
    const stateRef = useRef(state)
    stateRef.current = state

    // Publish the selection to the shared store (only the focused editor owns it), so
    // other components can read it. Editing authority stays in this controller.
    useEffect(() => {
        if (!focused) return
        const range = selectionRange(state)
        const line = state.lines[state.cursor.line]
        setSelection(range && line ? { systemUuid, lineId: line.id, anchor: range[0], focus: range[1] } : null)
    }, [state, focused, systemUuid, setSelection])

    // Register this editor so the store can route undo/redo to it (by system uuid).
    useEffect(() => {
        const restorer: EditorRestorer = {
            snapshot: (lineId) => {
                const st = stateRef.current
                const idx = st.lines.findIndex((l) => l.id === lineId)
                if (idx < 0) return null
                const cursor = st.cursor.line === idx ? st.cursor.index : st.lines[idx].notation.length
                return { systemUuid, lineId, symbols: st.lines[idx].notation, cursor }
            },
            apply: (entry) => {
                setState((st) => {
                    const idx = st.lines.findIndex((l) => l.id === entry.lineId)
                    if (idx < 0) return st
                    const lines = st.lines.with(idx, { ...st.lines[idx], notation: entry.symbols })
                    onChange?.(lines)
                    return {
                        lines,
                        cursor: { line: idx, index: clampCursor(entry.symbols, entry.cursor) },
                        anchor: null
                    }
                })
                focusEditor?.()
            }
        }
        return registerEditor(systemUuid, restorer)
    }, [systemUuid, onChange, focusEditor])

    // Applies a pure single-line op to the active line and clears the selection anchor.
    // When `collapse` is true (the default, for text edits) any selection is deleted
    // FIRST so the op replaces it; octave/modifier tweaks pass `collapse = false` so they
    // act on the caret without deleting the selection.
    const editActiveLine = useCallback(
        (
            st: CompactEditorState,
            op: (s: EditorStaffState) => EditorStaffState,
            collapse = true
        ): CompactEditorState => {
            const line = st.lines[st.cursor.line]
            if (!line) return st
            const range = collapse ? selectionRange(st) : null
            const base: EditorStaffState = { symbols: line.notation, cursorIndex: st.cursor.index }
            const collapsed = range ? deleteRange(base, range[0], range[1]) : base
            const result = op(collapsed)
            const notationChanged = result.symbols !== line.notation
            const cursorChanged = result.cursorIndex !== st.cursor.index
            const anchorChanged = st.anchor !== null
            if (!notationChanged && !cursorChanged && !anchorChanged) return st
            let lines = st.lines
            if (notationChanged) {
                // Snapshot the line BEFORE the edit for undo (dedup handles StrictMode).
                useEditorStateStore
                    .getState()
                    .pushHistory({ systemUuid, lineId: line.id, symbols: line.notation, cursor: st.cursor.index })
                lines = st.lines.with(st.cursor.line, { ...line, notation: result.symbols })
                onChange?.(lines)
            }
            return { lines, cursor: { line: st.cursor.line, index: result.cursorIndex }, anchor: null }
        },
        [onChange, systemUuid]
    )

    // Moves the caret. `extend` keeps/creates a selection anchor on the same line; a
    // move that crosses to another line cancels the (single-line) selection.
    const applyMove = useCallback(
        (st: CompactEditorState, compute: (s: CompactEditorState) => CompactCursor | null, extend: boolean) => {
            const next = compute(st)
            if (!next) return extend || st.anchor === null ? st : { ...st, anchor: null }
            if (extend) {
                if (next.line !== st.cursor.line) return { ...st, cursor: next, anchor: null }
                return { ...st, cursor: next, anchor: st.anchor ?? st.cursor.index }
            }
            return { ...st, cursor: next, anchor: null }
        },
        []
    )

    // Copy (or cut) the selection — or, with no selection, copy the whole active line
    // (cut with no selection is a no-op). Writes both the in-app store and the OS clipboard.
    const copyActive = useCallback(
        (st: CompactEditorState, cut: boolean): CompactEditorState => {
            const line = st.lines[st.cursor.line]
            if (!line) return st
            const range = selectionRange(st)
            const text = serializeStaff(range ? line.notation.slice(range[0], range[1]) : line.notation)
            useEditorStateStore.getState().setClipboard(text)
            writeOsClipboard(text)
            if (cut && range) return editActiveLine(st, (s) => s) // identity op → selection is deleted
            return st
        },
        [editActiveLine]
    )

    const selectAll = useCallback((st: CompactEditorState): CompactEditorState => {
        const line = st.lines[st.cursor.line]
        if (!line || line.notation.length === 0) return st
        return { ...st, anchor: 0, cursor: { line: st.cursor.line, index: line.notation.length } }
    }, [])

    const onKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            const ctrl = e.ctrlKey || e.metaKey

            // Undo / redo, handled before everything else.
            if (ctrl && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
                e.preventDefault()
                useEditorStateStore.getState().undo()
                return
            }
            if (ctrl && (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
                e.preventDefault()
                useEditorStateStore.getState().redo()
                return
            }

            // Mode + clipboard shortcuts, handled before the key map.
            // Overwrite toggle: `Insert` (PC keyboards) or Ctrl/Cmd+Shift+O (works on
            // MacBooks, which have no Insert key).
            if (e.key === 'Insert' || (ctrl && e.shiftKey && (e.key === 'o' || e.key === 'O'))) {
                e.preventDefault()
                useEditorStateStore.getState().toggleOverwrite()
                return
            }
            if (ctrl && (e.key === 'a' || e.key === 'A')) {
                e.preventDefault()
                setState(selectAll)
                return
            }
            if (ctrl && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault()
                setState((st) => copyActive(st, false))
                return
            }
            if (ctrl && (e.key === 'x' || e.key === 'X')) {
                e.preventDefault()
                setState((st) => copyActive(st, true))
                return
            }

            const action = keyMap(toKeystroke(e))
            if (!action) return
            e.preventDefault()
            if (action.type === 'ignore') return
            const overwrite = useEditorStateStore.getState().overwriteMode
            const shift = e.shiftKey

            setState((st) => {
                const sel = selectionRange(st)
                const over = overwrite && !sel // overwrite only applies when typing without a selection
                switch (action.type) {
                    case 'cursorLeft':
                        return applyMove(st, (s) => computeLeftRight(s, -1), shift)
                    case 'cursorRight':
                        return applyMove(st, (s) => computeLeftRight(s, 1), shift)
                    case 'cursorUp':
                        return applyMove(st, (s) => computeUpDown(s, -1), shift)
                    case 'cursorDown':
                        return applyMove(st, (s) => computeUpDown(s, 1), shift)
                    case 'cursorStart':
                        return applyMove(st, (s) => ({ line: s.cursor.line, index: 0 }), shift)
                    case 'cursorEnd':
                        return applyMove(
                            st,
                            (s) => ({ line: s.cursor.line, index: s.lines[s.cursor.line].notation.length }),
                            shift
                        )
                    case 'octaveUp':
                        return editActiveLine(st, (s) => changeOctave(s, 1, COMPACT_POSITION), false)
                    case 'octaveDown':
                        return editActiveLine(st, (s) => changeOctave(s, -1, COMPACT_POSITION), false)
                    case 'deleteLeft':
                        // With a selection, editActiveLine deletes it (identity op); else delete left.
                        return editActiveLine(st, sel ? (s) => s : deleteLeft)
                    case 'deleteRight':
                        return editActiveLine(st, sel ? (s) => s : deleteRight)
                    case 'insertChar':
                        return editActiveLine(st, (s) =>
                            over ? overwriteChar(s, e.key, COMPACT_POSITION) : typeChar(s, e.key, COMPACT_POSITION)
                        )
                    case 'insertSymbol':
                        return action.value
                            ? editActiveLine(st, (s) =>
                                  over
                                      ? overwriteSymbol(s, action.value!, COMPACT_POSITION)
                                      : insertSymbol(s, action.value!, COMPACT_POSITION)
                              )
                            : st
                    case 'insertString':
                        return action.value
                            ? editActiveLine(st, (s) =>
                                  over
                                      ? overwriteString(s, action.value!, COMPACT_POSITION)
                                      : applyString(s, action.value!, COMPACT_POSITION)
                              )
                            : st
                    default:
                        return st
                }
            })
        },
        [keyMap, editActiveLine, applyMove, copyActive, selectAll]
    )

    // Paste: replace the selection (if any) with the first clipboard line's symbols,
    // else insert them at the cursor. Routed through typeChar so only valid symbols land.
    const onPaste = useCallback(
        (e: ClipboardEvent<HTMLDivElement>) => {
            const text = e.clipboardData.getData('text')
            if (!text) return
            e.preventDefault()
            const firstLine = text.split(/\r?\n/)[0] ?? ''
            if (!firstLine) return
            setState((st) =>
                editActiveLine(st, (s) => [...firstLine].reduce((acc, ch) => typeChar(acc, ch, COMPACT_POSITION), s))
            )
        },
        [editActiveLine]
    )

    const setCursor = useCallback(
        (line: number, index: number, extend = false) =>
            setState((st) => {
                if (line < 0 || line >= st.lines.length) return st
                const idx = clampCursor(st.lines[line].notation, index)
                if (extend && line === st.cursor.line) {
                    return { ...st, cursor: { line, index: idx }, anchor: st.anchor ?? st.cursor.index }
                }
                return { ...st, cursor: { line, index: idx }, anchor: null }
            }),
        []
    )

    const onFocus = useCallback(() => setFocused(true), [])
    const onBlur = useCallback(() => setFocused(false), [])

    // --- Group-structure editing (Step 4) -------------------------------------

    // Insert a new staff seeded with `positions` and empty notation. The cursor moves
    // into the new line. (Columns are the user's to align; no auto-padding.)
    // Structural edits clear the undo history (Option A, see CLAUDE.select-copy-paste-functionality.md): entries reference lines by id,
    // and restructuring makes past snapshots ambiguous. Cleared outside the updater so it
    // runs once (StrictMode double-invokes the updater).
    const addLine = useCallback(
        (atIndex: number, positions: Position[]) => {
            useEditorStateStore.getState().clearHistory()
            setState((st) => {
                if (positions.length === 0) return st
                const newLine: CompactLine = { id: uuidv4(), positions: [...positions], notation: [] }
                const idx = Math.max(0, Math.min(st.lines.length, atIndex))
                const lines = [...st.lines.slice(0, idx), newLine, ...st.lines.slice(idx)]
                onChange?.(lines)
                return { lines, cursor: { line: idx, index: 0 }, anchor: null }
            })
        },
        [onChange]
    )

    const removeLine = useCallback(
        (index: number) => {
            useEditorStateStore.getState().clearHistory()
            setState((st) => {
                if (index < 0 || index >= st.lines.length) return st
                const lines = st.lines.filter((_, i) => i !== index)
                onChange?.(lines)
                if (lines.length === 0) return { lines, cursor: { line: 0, index: 0 }, anchor: null }
                const line = Math.min(lines.length - 1, st.cursor.line > index ? st.cursor.line - 1 : st.cursor.line)
                return {
                    lines,
                    cursor: { line, index: clampCursor(lines[line].notation, st.cursor.index) },
                    anchor: null
                }
            })
        },
        [onChange]
    )

    const addPosition = useCallback(
        (lineIndex: number, position: Position) => {
            useEditorStateStore.getState().clearHistory()
            setState((st) => {
                const line = st.lines[lineIndex]
                if (!line || line.positions.includes(position)) return st
                const lines = st.lines.with(lineIndex, { ...line, positions: [...line.positions, position] })
                onChange?.(lines)
                return { ...st, lines }
            })
        },
        [onChange]
    )

    // Removing a position from a multi-position group splits it into its own solo staff
    // carrying the cast notation it had (see castGroupToSolo). A group's last position
    // cannot be removed (remove the whole line instead) — the UI disables that case.
    const removePosition = useCallback(
        (lineIndex: number, position: Position) => {
            useEditorStateStore.getState().clearHistory()
            setState((st) => {
                const line = st.lines[lineIndex]
                if (!line || !line.positions.includes(position) || line.positions.length <= 1) return st
                const soloNotation = castGroupToSolo(line.positions, line.notation, position, castingInstructions)
                const reduced: CompactLine = { ...line, positions: line.positions.filter((p) => p !== position) }
                const solo: CompactLine = { id: uuidv4(), positions: [position], notation: soloNotation }
                const lines = [...st.lines.slice(0, lineIndex), reduced, solo, ...st.lines.slice(lineIndex + 1)]
                onChange?.(lines)
                return { ...st, lines, anchor: null }
            })
        },
        [onChange, castingInstructions]
    )

    // Replace a whole line's notation (e.g. copy the same staff's notation from another
    // system). This is a notation edit (not a structural one), so it is undoable: a
    // pre-edit snapshot is pushed just like a keystroke edit.
    const replaceLineNotation = useCallback(
        (lineIndex: number, notation: NoteObject[]) =>
            setState((st) => {
                const line = st.lines[lineIndex]
                if (!line) return st
                useEditorStateStore.getState().pushHistory({
                    systemUuid,
                    lineId: line.id,
                    symbols: line.notation,
                    cursor: st.cursor.index
                })
                const lines = st.lines.with(lineIndex, { ...line, notation })
                onChange?.(lines)
                const sameLine = st.cursor.line === lineIndex
                return {
                    lines,
                    cursor: { line: st.cursor.line, index: sameLine ? clampCursor(notation, st.cursor.index) : st.cursor.index },
                    anchor: sameLine ? null : st.anchor
                }
            }),
        [onChange, systemUuid]
    )

    return {
        lines: state.lines,
        cursor: state.cursor,
        anchor: state.anchor,
        focused,
        onKeyDown,
        onPaste,
        onFocus,
        onBlur,
        setCursor,
        addLine,
        removeLine,
        addPosition,
        removePosition,
        replaceLineNotation
    }
}
