/**
 * Cross-cutting editor state (selection, clipboard, overwrite mode).
 *
 * The grouped/compact view is the single editable surface, but each system renders
 * its own `useCompactSystemEditor` instance. The state that is conceptually a global
 * singleton — the active selection, the internal clipboard, and the insert/overwrite
 * flag — lives here so it is reachable from other components (menus, toolbars, status
 * indicators) and, later, from the undo/redo machinery (Phase 2).
 *
 * The selection is published here for external consumers; the editing authority for a
 * selection still lives in the focused controller (its `anchor` + cursor). Only the
 * focused editor writes the selection. See CLAUDE.select-copy-paste-functionality.md.
 */

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

interface EditorStateStore {
    /** Insert (false, default) vs. overwrite (true) typing mode. Session-scoped. */
    overwriteMode: boolean
    /** Last internally copied/cut notation, as text (also mirrored to the OS clipboard). */
    clipboard: string | null
    /** Active selection, or null when nothing is selected. */
    selection: EditorSelection | null

    toggleOverwrite: () => void
    setOverwriteMode: (on: boolean) => void
    setClipboard: (text: string | null) => void
    setSelection: (selection: EditorSelection | null) => void
}

export const useEditorStateStore: UseBoundStore<StoreApi<EditorStateStore>> = create((set) => ({
    overwriteMode: false,
    clipboard: null,
    selection: null,

    toggleOverwrite: () => set((s) => ({ overwriteMode: !s.overwriteMode })),
    setOverwriteMode: (on) => set({ overwriteMode: on }),
    setClipboard: (text) => set({ clipboard: text }),
    setSelection: (selection) => set({ selection })
}))
