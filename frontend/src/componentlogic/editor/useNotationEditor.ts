/**
 * useNotationEditor — composition hook that wires the virtual editor together.
 *
 * It owns the editor state for a single staff and combines it with
 * {@link useEditorKeyboard}, returning everything a {@link NotationEditor} needs
 * as props. This is the intended seam for integrating the editor into a larger
 * component (e.g. a future `SystemNode` that hosts one editor per instrument
 * staff): the host passes the staff's `NoteObject[]` and `position`, receives an
 * `onChange` callback whenever the notation is edited, and forwards the returned
 * `symbols`, `cursorIndex`, `onKeyDown` and `setCursor` to `NotationEditor`.
 */

import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { NoteObject, Position } from '@tabuhstudio/shared'
import { clampCursor, type EditorStaffState } from './inputStateMachine'
import { useEditorKeyboard } from './useEditorKeyboard'
import type { KeyMap } from './keyMap'

export interface UseNotationEditorOptions {
    /** Initial notation for the staff. */
    initialSymbols: NoteObject[]
    /** Instrument position bound to every NoteObject produced by edits. */
    position?: Position
    /** Optional custom key mapping. */
    keyMap?: KeyMap
    /** Called with the new symbol list whenever an edit changes the notation. */
    onChange?: (symbols: NoteObject[]) => void
}

export interface NotationEditorController {
    symbols: NoteObject[]
    cursorIndex: number
    onKeyDown: ReturnType<typeof useEditorKeyboard>
    /** Snap the cursor to a (clamped) index — used by click handling. */
    setCursor: (index: number) => void
    /** Replace the whole editor state (e.g. to load different notation). */
    setState: Dispatch<SetStateAction<EditorStaffState>>
}

export function useNotationEditor({
    initialSymbols,
    position,
    keyMap,
    onChange
}: UseNotationEditorOptions): NotationEditorController {
    const [state, setState] = useState<EditorStaffState>(() => ({
        symbols: initialSymbols,
        cursorIndex: initialSymbols.length
    }))

    const onKeyDown = useEditorKeyboard({ state, setState, position, keyMap, onChange })

    const setCursor = useCallback(
        (index: number) => setState((s) => ({ ...s, cursorIndex: clampCursor(s.symbols, index) })),
        []
    )

    return { symbols: state.symbols, cursorIndex: state.cursorIndex, onKeyDown, setCursor, setState }
}
