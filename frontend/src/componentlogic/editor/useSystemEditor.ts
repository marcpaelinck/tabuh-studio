/**
 * useSystemEditor — multi-staff controller for the virtual editor.
 *
 * Where the single-staff building blocks ({@link inputStateMachine},
 * {@link useEditorKeyboard}) operate on one notation line, this hook orchestrates
 * all the staves of a system as a grid. It owns the editor state — one
 * `NoteObject[]` per staff plus a single cursor `{ staff, index }` — and delegates
 * within-staff edits to the pure state-machine functions while handling
 * cross-staff navigation (Up/Down, and Left/Right wrapping at line ends) itself.
 *
 * Because every symbol occupies exactly one character cell in the spaced
 * BaliMusic font, the visual column equals the cursor index, so Up/Down simply
 * keep the index and clamp it to the target staff's length.
 *
 * Paste is wired (text is distributed across consecutive staves from the
 * cursor). Selection-based copy/cut is deferred; native selection copy still
 * works because the rendered glyphs are real text.
 */

import { useCallback, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { NoteObject } from '@tabuhstudio/shared'
import type { Position } from '@tabuhstudio/shared'
import {
    attachModifier,
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
import { parseClipboard } from './notationClipboard'

/** One staff in the editor: an instrument position and its notation. */
export interface EditorStaff {
    position: Position
    symbols: NoteObject[]
}

/** Cursor across the staff grid. */
export interface SystemCursor {
    staff: number
    index: number
}

interface SystemEditorState {
    staves: EditorStaff[]
    cursor: SystemCursor
}

export interface UseSystemEditorOptions {
    initialStaves: EditorStaff[]
    keyMap?: KeyMap
    /** Called with the updated staves whenever an edit changes the notation. */
    onChange?: (staves: EditorStaff[]) => void
}

export interface SystemEditorController {
    staves: EditorStaff[]
    cursor: SystemCursor
    focused: boolean
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
    onPaste: (e: ClipboardEvent<HTMLDivElement>) => void
    onFocus: () => void
    onBlur: () => void
    /** Place the cursor (used by click handling); clamps to valid range. */
    setCursor: (staff: number, index: number) => void
}

function toKeystroke(e: KeyboardEvent): Keystroke {
    return { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
}

export function useSystemEditor({
    initialStaves,
    keyMap = defaultKeyMap,
    onChange
}: UseSystemEditorOptions): SystemEditorController {
    const [state, setState] = useState<SystemEditorState>(() => ({
        staves: initialStaves,
        cursor: { staff: 0, index: initialStaves[0]?.symbols.length ?? 0 }
    }))
    const [focused, setFocused] = useState(false)

    // Applies a pure single-staff operation to the active staff and writes the
    // result back, reporting whether the notation (not just the cursor) changed.
    const applyToActiveStaff = useCallback(
        (st: SystemEditorState, op: (s: EditorStaffState) => EditorStaffState) => {
            const active = st.staves[st.cursor.staff]
            if (!active) return st
            const result = op({ symbols: active.symbols, cursorIndex: st.cursor.index })
            const notationChanged = result.symbols !== active.symbols
            const cursorChanged = result.cursorIndex !== st.cursor.index
            if (!notationChanged && !cursorChanged) return st
            const staves = notationChanged
                ? st.staves.with(st.cursor.staff, { ...active, symbols: result.symbols })
                : st.staves
            const next: SystemEditorState = {
                staves,
                cursor: { staff: st.cursor.staff, index: result.cursorIndex }
            }
            if (notationChanged) onChange?.(staves)
            return next
        },
        [onChange]
    )

    const moveUpDown = useCallback((st: SystemEditorState, delta: -1 | 1): SystemEditorState => {
        const staff = st.cursor.staff + delta
        if (staff < 0 || staff >= st.staves.length) return st
        const index = clampCursor(st.staves[staff].symbols, st.cursor.index)
        return { staves: st.staves, cursor: { staff, index } }
    }, [])

    const moveLeftRight = useCallback((st: SystemEditorState, delta: -1 | 1): SystemEditorState => {
        const active = st.staves[st.cursor.staff]
        if (!active) return st
        // Wrap to the adjacent staff when stepping off either end.
        if (delta === -1 && st.cursor.index === 0) {
            if (st.cursor.staff === 0) return st
            const staff = st.cursor.staff - 1
            return { staves: st.staves, cursor: { staff, index: st.staves[staff].symbols.length } }
        }
        if (delta === 1 && st.cursor.index === active.symbols.length) {
            if (st.cursor.staff === st.staves.length - 1) return st
            return { staves: st.staves, cursor: { staff: st.cursor.staff + 1, index: 0 } }
        }
        return applyToActiveStaff(st, (s) => moveCursor(s, delta))
    }, [applyToActiveStaff])

    const onKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            const action = keyMap(toKeystroke(e))
            if (!action) return
            e.preventDefault()
            if (action.type === 'ignore') return
            const pos = (st: SystemEditorState) => st.staves[st.cursor.staff]?.position

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
                        return applyToActiveStaff(st, (s) => ({ ...s, cursorIndex: 0 }))
                    case 'cursorEnd':
                        return applyToActiveStaff(st, (s) => ({ ...s, cursorIndex: s.symbols.length }))
                    case 'octaveUp':
                        return applyToActiveStaff(st, (s) => changeOctave(s, 1, pos(st)))
                    case 'octaveDown':
                        return applyToActiveStaff(st, (s) => changeOctave(s, -1, pos(st)))
                    case 'deleteLeft':
                        return applyToActiveStaff(st, deleteLeft)
                    case 'deleteRight':
                        return applyToActiveStaff(st, deleteRight)
                    case 'insertChar':
                        return applyToActiveStaff(st, (s) => typeChar(s, e.key, pos(st)))
                    case 'insertSymbol':
                        return action.value
                            ? applyToActiveStaff(st, (s) => insertSymbol(s, action.value!, pos(st)))
                            : st
                    case 'attachModifier':
                        return action.value
                            ? applyToActiveStaff(st, (s) => attachModifier(s, action.value!, pos(st)))
                            : st
                    default:
                        return st
                }
            })
        },
        [keyMap, applyToActiveStaff, moveLeftRight, moveUpDown]
    )

    const onPaste = useCallback(
        (e: ClipboardEvent<HTMLDivElement>) => {
            const text = e.clipboardData.getData('text')
            if (!text) return
            e.preventDefault()
            setState((st) => {
                const positions = st.staves.slice(st.cursor.staff).map((s) => s.position)
                const lines = parseClipboard(text, positions)
                if (lines.length === 0) return st
                let staves = st.staves
                let changed = false
                lines.forEach((objs, k) => {
                    const staffIdx = st.cursor.staff + k
                    if (staffIdx >= staves.length || objs.length === 0) return
                    const staff = staves[staffIdx]
                    const insertAt = k === 0 ? st.cursor.index : clampCursor(staff.symbols, st.cursor.index)
                    const symbols = [
                        ...staff.symbols.slice(0, insertAt),
                        ...objs,
                        ...staff.symbols.slice(insertAt)
                    ]
                    staves = staves.with(staffIdx, { ...staff, symbols })
                    changed = true
                })
                if (!changed) return st
                const cursor: SystemCursor = {
                    staff: st.cursor.staff,
                    index: st.cursor.index + lines[0].length
                }
                onChange?.(staves)
                return { staves, cursor }
            })
        },
        [onChange]
    )

    const setCursor = useCallback(
        (staff: number, index: number) =>
            setState((st) => {
                if (staff < 0 || staff >= st.staves.length) return st
                return { staves: st.staves, cursor: { staff, index: clampCursor(st.staves[staff].symbols, index) } }
            }),
        []
    )

    const onFocus = useCallback(() => setFocused(true), [])
    const onBlur = useCallback(() => setFocused(false), [])

    return { staves: state.staves, cursor: state.cursor, focused, onKeyDown, onPaste, onFocus, onBlur, setCursor }
}
