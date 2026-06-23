/**
 * useCompactSystemEditor — controller for the COMPACT (grouped/shorthand) editor.
 *
 * This is the compact-view analogue of {@link useSystemEditor}. Its lines are
 * notation GROUPS (each may stand for several instrument positions) rather than
 * individual staves, and each line is subdivided into MEASURES (kempli beats),
 * because the per-measure structure is what the expansion pipeline needs to align
 * columns. The cursor is therefore three-dimensional: { line, measure, index }.
 *
 * Compact symbols are position-independent (exactly as the parser builds them with
 * an `undefined` position), so all state-machine operations are run with no
 * position. Editing here is allowed to use shorthand (e.g. norot) and aggregated
 * notation — that is the whole point of the compact view.
 *
 * The host turns the emitted lines back into `System.groups` and re-derives the
 * expanded staffs via expandSystem().
 */

import type { NoteObject, Position } from '@tabuhstudio/shared'
import { useCallback, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import {
    changeOctave,
    clampCursor,
    deleteLeft,
    deleteRight,
    insertSymbol,
    moveCursor,
    typeChar,
    type EditorStaffState
} from './inputStateMachine'
import { defaultKeyMap, type KeyMap, type Keystroke } from './keyMap'

/** One compact line = one notation group, subdivided into measures (kempli beats). */
export interface CompactLine {
    id: string
    positions: Position[]
    measures: NoteObject[][]
}

/** Cursor across the compact grid: which line, which measure, and where within it. */
export interface CompactCursor {
    line: number
    measure: number
    index: number
}

interface CompactEditorState {
    lines: CompactLine[]
    cursor: CompactCursor
}

export interface UseCompactSystemEditorOptions {
    initialLines: CompactLine[]
    keyMap?: KeyMap
    /** Called with the updated lines whenever an edit changes the notation. */
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
    setCursor: (line: number, measure: number, index: number) => void
}

function toKeystroke(e: KeyboardEvent): Keystroke {
    return { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
}

const COMPACT_POSITION = undefined // compact symbols are not bound to a position

export function useCompactSystemEditor({
    initialLines,
    keyMap = defaultKeyMap,
    onChange
}: UseCompactSystemEditorOptions): CompactEditorController {
    const [state, setState] = useState<CompactEditorState>(() => ({
        lines: initialLines,
        cursor: {
            line: 0,
            measure: 0,
            index: initialLines[0]?.measures[0]?.length ?? 0
        }
    }))
    const [focused, setFocused] = useState(false)

    // Applies a pure single-staff op to the active MEASURE and writes it back,
    // reporting whether the notation (not just the cursor) changed.
    const applyToActiveMeasure = useCallback(
        (st: CompactEditorState, op: (s: EditorStaffState) => EditorStaffState): CompactEditorState => {
            const line = st.lines[st.cursor.line]
            const measure = line?.measures[st.cursor.measure]
            if (!line || !measure) return st
            const result = op({ symbols: measure, cursorIndex: st.cursor.index })
            const notationChanged = result.symbols !== measure
            const cursorChanged = result.cursorIndex !== st.cursor.index
            if (!notationChanged && !cursorChanged) return st
            let lines = st.lines
            if (notationChanged) {
                const newMeasures = line.measures.with(st.cursor.measure, result.symbols)
                lines = st.lines.with(st.cursor.line, { ...line, measures: newMeasures })
                onChange?.(lines)
            }
            return { lines, cursor: { ...st.cursor, index: result.cursorIndex } }
        },
        [onChange]
    )

    // Left/right wrap across measures within a line, then across lines.
    const moveLeftRight = useCallback(
        (st: CompactEditorState, delta: -1 | 1): CompactEditorState => {
            const line = st.lines[st.cursor.line]
            const measure = line?.measures[st.cursor.measure]
            if (!line || !measure) return st
            if (delta === -1 && st.cursor.index === 0) {
                if (st.cursor.measure > 0) {
                    const m = st.cursor.measure - 1
                    return { lines: st.lines, cursor: { ...st.cursor, measure: m, index: line.measures[m].length } }
                }
                if (st.cursor.line > 0) {
                    const l = st.cursor.line - 1
                    const m = st.lines[l].measures.length - 1
                    return { lines: st.lines, cursor: { line: l, measure: m, index: st.lines[l].measures[m].length } }
                }
                return st
            }
            if (delta === 1 && st.cursor.index === measure.length) {
                if (st.cursor.measure < line.measures.length - 1) {
                    return { lines: st.lines, cursor: { ...st.cursor, measure: st.cursor.measure + 1, index: 0 } }
                }
                if (st.cursor.line < st.lines.length - 1) {
                    return { lines: st.lines, cursor: { line: st.cursor.line + 1, measure: 0, index: 0 } }
                }
                return st
            }
            return applyToActiveMeasure(st, (s) => moveCursor(s, delta))
        },
        [applyToActiveMeasure]
    )

    // Up/down move between lines, keeping the measure index and clamping the cursor.
    const moveUpDown = useCallback((st: CompactEditorState, delta: -1 | 1): CompactEditorState => {
        const line = st.cursor.line + delta
        if (line < 0 || line >= st.lines.length) return st
        const measure = Math.min(st.cursor.measure, st.lines[line].measures.length - 1)
        const index = clampCursor(st.lines[line].measures[measure], st.cursor.index)
        return { lines: st.lines, cursor: { line, measure, index } }
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
                        return applyToActiveMeasure(st, (s) => ({ ...s, cursorIndex: 0 }))
                    case 'cursorEnd':
                        return applyToActiveMeasure(st, (s) => ({ ...s, cursorIndex: s.symbols.length }))
                    case 'octaveUp':
                        return applyToActiveMeasure(st, (s) => changeOctave(s, 1, COMPACT_POSITION))
                    case 'octaveDown':
                        return applyToActiveMeasure(st, (s) => changeOctave(s, -1, COMPACT_POSITION))
                    case 'deleteLeft':
                        return applyToActiveMeasure(st, deleteLeft)
                    case 'deleteRight':
                        return applyToActiveMeasure(st, deleteRight)
                    case 'insertChar':
                        return applyToActiveMeasure(st, (s) => typeChar(s, e.key, COMPACT_POSITION))
                    case 'insertSymbol':
                        return action.value
                            ? applyToActiveMeasure(st, (s) => insertSymbol(s, action.value!, COMPACT_POSITION))
                            : st
                    default:
                        return st
                }
            })
        },
        [keyMap, applyToActiveMeasure, moveLeftRight, moveUpDown]
    )

    // Minimal paste: insert the first clipboard line's symbols into the active
    // measure at the cursor, routed through typeChar so only valid symbols land.
    const onPaste = useCallback(
        (e: ClipboardEvent<HTMLDivElement>) => {
            const text = e.clipboardData.getData('text')
            if (!text) return
            e.preventDefault()
            const firstLine = text.split(/\r?\n/)[0] ?? ''
            if (!firstLine) return
            setState((st) =>
                applyToActiveMeasure(st, (s) =>
                    [...firstLine].reduce((acc, ch) => typeChar(acc, ch, COMPACT_POSITION), s)
                )
            )
        },
        [applyToActiveMeasure]
    )

    const setCursor = useCallback(
        (line: number, measure: number, index: number) =>
            setState((st) => {
                if (line < 0 || line >= st.lines.length) return st
                const m = Math.max(0, Math.min(st.lines[line].measures.length - 1, measure))
                return {
                    lines: st.lines,
                    cursor: { line, measure: m, index: clampCursor(st.lines[line].measures[m], index) }
                }
            }),
        []
    )

    const onFocus = useCallback(() => setFocused(true), [])
    const onBlur = useCallback(() => setFocused(false), [])

    return { lines: state.lines, cursor: state.cursor, focused, onKeyDown, onPaste, onFocus, onBlur, setCursor }
}
