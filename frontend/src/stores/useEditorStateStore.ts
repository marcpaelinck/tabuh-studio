/**
 * Cross-cutting editor state (selection, clipboard, overwrite mode, undo/redo).
 *
 * The grouped/compact view is the single editable surface, but each system renders
 * its own `useCompactSystemEditor` instance. The state that is conceptually a global
 * singleton — the active selection, the internal clipboard, the insert/overwrite
 * flag, and the undo/redo history — lives here so it is reachable from other
 * components (menus, toolbars, status indicators).
 *
 * Undo/redo (Phase 2) is snapshot-based: every notation-changing edit pushes a
 * snapshot of the affected line BEFORE the edit, keyed by system `uuid` + group-line
 * `id` (both stable across renumbering). Because each editor instance owns its own
 * local line state, the store cannot mutate it directly; instead each controller
 * registers a small `EditorRestorer` (a synchronous `snapshot` reader + an `apply`
 * mutator) via `registerEditor`, and undo/redo route through it — which also moves
 * focus to the targeted system. Any structural change (add/remove line, add/remove
 * position, or a system new/copy/move/delete) clears the history (Option A).
 *
 * See CLAUDE.select-copy-paste-functionality.md.
 */

import type { NoteObject } from '@tabuhstudio/shared'
import { create, type StoreApi, type UseBoundStore } from 'zustand'

/** The active selection: a contiguous symbol range on one group line of one system. */
export interface EditorSelection {
    systemUuid: string
    /** GroupedNotation.id of the selected line (stable across renumbering). */
    lineId: string
    /** Index where the selection was started. */
    anchor: number
    /** Index where the caret currently is (moving end of the selection). */
    focus: number
}

/** A snapshot of one group line at a point in time (an undo/redo entry). */
export interface HistoryEntry {
    systemUuid: string
    lineId: string
    /** The line's symbols at snapshot time (immutable — safe to keep by reference). */
    symbols: NoteObject[]
    /** Caret index to restore. */
    cursor: number
}

/** How the store reaches a specific system's editor controller for undo/redo. */
export interface EditorRestorer {
    /** Current snapshot of `lineId`, or null when the line no longer exists. */
    snapshot: (lineId: string) => HistoryEntry | null
    /** Restore a snapshot into the editor and focus it. */
    apply: (entry: HistoryEntry) => void
}

// Non-reactive registry of the mounted editors, keyed by system uuid. Kept out of the
// reactive store so registering/unregistering does not re-render subscribers.
const restorers = new Map<string, EditorRestorer>()

/** Register an editor controller for undo/redo routing; returns an unregister fn. */
export function registerEditor(systemUuid: string, restorer: EditorRestorer): () => void {
    restorers.set(systemUuid, restorer)
    return () => {
        if (restorers.get(systemUuid) === restorer) restorers.delete(systemUuid)
    }
}

const MAX_HISTORY = 200

interface EditorStateStore {
    /** Insert (false, default) vs. overwrite (true) typing mode. Session-scoped. */
    overwriteMode: boolean
    /** Last internally copied/cut notation, as text (also mirrored to the OS clipboard). */
    clipboard: string | null
    /** Active selection, or null when nothing is selected. */
    selection: EditorSelection | null
    /** Undo history (most recent last). */
    undoStack: HistoryEntry[]
    /** Redo history (most recent last). */
    redoStack: HistoryEntry[]

    toggleOverwrite: () => void
    setOverwriteMode: (on: boolean) => void
    setClipboard: (text: string | null) => void
    setSelection: (selection: EditorSelection | null) => void

    /** Record a pre-edit snapshot (clears the redo stack). */
    pushHistory: (entry: HistoryEntry) => void
    undo: () => void
    redo: () => void
    /** Drop all history (called on any structural change — Option A). */
    clearHistory: () => void
}

export const useEditorStateStore: UseBoundStore<StoreApi<EditorStateStore>> = create((set, get) => ({
    overwriteMode: false,
    clipboard: null,
    selection: null,
    undoStack: [],
    redoStack: [],

    toggleOverwrite: () => set((s) => ({ overwriteMode: !s.overwriteMode })),
    setOverwriteMode: (on) => set({ overwriteMode: on }),
    setClipboard: (text) => set({ clipboard: text }),
    setSelection: (selection) => set({ selection }),

    pushHistory: (entry) =>
        set((s) => {
            // Dedupe StrictMode's double-invoked updaters: a genuine second edit always
            // has a fresh `symbols` array reference, so identical references are a dupe.
            const top = s.undoStack[s.undoStack.length - 1]
            if (top && top.lineId === entry.lineId && top.symbols === entry.symbols && top.cursor === entry.cursor) {
                return s
            }
            const undoStack = [...s.undoStack, entry]
            if (undoStack.length > MAX_HISTORY) undoStack.shift()
            return { undoStack, redoStack: [] }
        }),

    undo: () => {
        const { undoStack } = get()
        if (undoStack.length === 0) return
        const entry = undoStack[undoStack.length - 1]
        const editor = restorers.get(entry.systemUuid)
        if (!editor) {
            set((s) => ({ undoStack: s.undoStack.slice(0, -1) })) // target gone: drop it
            return
        }
        const current = editor.snapshot(entry.lineId)
        set((s) => ({
            undoStack: s.undoStack.slice(0, -1),
            redoStack: current ? [...s.redoStack, current] : s.redoStack
        }))
        editor.apply(entry)
    },

    redo: () => {
        const { redoStack } = get()
        if (redoStack.length === 0) return
        const entry = redoStack[redoStack.length - 1]
        const editor = restorers.get(entry.systemUuid)
        if (!editor) {
            set((s) => ({ redoStack: s.redoStack.slice(0, -1) }))
            return
        }
        const current = editor.snapshot(entry.lineId)
        set((s) => ({
            redoStack: s.redoStack.slice(0, -1),
            undoStack: current ? [...s.undoStack, current] : s.undoStack
        }))
        editor.apply(entry)
    },

    clearHistory: () => set({ undoStack: [], redoStack: [] })
}))
