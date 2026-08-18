// Coordination bus for the guided tours. Keeps the whole thing decoupled: the launcher sets the
// active tour; each Tour component starts when `active` matches its id; the hands-on tour reads
// `requested*` to drive the UI (open a submenu) and the `*` signals published by the app to know
// when the user completed an action.

import { create } from 'zustand'

export type TourId = 'brief' | 'handsOn' | 'editor'

interface TourState {
    /** The currently running tour (null = none). */
    active: TourId | null
    /** The hands-on tour asks MainMenu to open a submenu (by eventKey) so a target becomes visible. */
    requestedMenuKey: string | null
    // ── Signals the app publishes so the tour can advance on real user actions ──
    /** Whether the desktop "Open" score drawer is open. */
    scoreBrowserOpen: boolean
    /** The orchestra currently selected in the score browser filter (null if a group is selected). */
    browserOrchestra: string | null
    /** Whether playback is currently playing. */
    playbackPlaying: boolean
    /** Monotonic counter bumped each time the user clicks in the FIRST system's notation (editor tour). */
    editorNotationClicks: number
    /** Sets the highlighted Nav.item of the main menu. Should be set before a menu item has the tour focus.
     * This avoids another item to be highlighted together with the target item.
     */
    mainMenuActiveItem: string

    setActive: (t: TourId | null) => void
    requestMenu: (key: string | null) => void
    setScoreBrowserOpen: (v: boolean) => void
    setBrowserOrchestra: (v: string | null) => void
    setPlaybackPlaying: (v: boolean) => void
    bumpEditorNotationClick: () => void
    setMainMenuActiveItem: (v: string) => void
}

export const useTourStore = create<TourState>((set) => ({
    active: null,
    requestedMenuKey: null,
    scoreBrowserOpen: false,
    browserOrchestra: null,
    playbackPlaying: false,
    editorNotationClicks: 0,
    mainMenuActiveItem: '',
    setActive: (active) => set({ active }),
    requestMenu: (requestedMenuKey) => set({ requestedMenuKey }),
    setScoreBrowserOpen: (scoreBrowserOpen) => set({ scoreBrowserOpen }),
    setBrowserOrchestra: (browserOrchestra) => set({ browserOrchestra }),
    setPlaybackPlaying: (playbackPlaying) => set({ playbackPlaying }),
    bumpEditorNotationClick: () => set((s) => ({ editorNotationClicks: s.editorNotationClicks + 1 })),
    setMainMenuActiveItem: (mainMenuActiveItem) => set({ mainMenuActiveItem })
}))
