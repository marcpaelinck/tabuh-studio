import type { Position } from '@tabuhstudio/shared'
import type { Dispatch } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { KeyboardType } from '../config/config'
import type { PlaybackCursorStyle } from '../typing/animation'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'
import { idbStorage } from './idbStorage'

export const panggulDefaultOption: ExtendedOption<Position[]> = { label: 'Hide', value: 'Hide', objValue: [] }
export const focusDefaultOption: ExtendedOption<Position[]> = { label: 'No Focus', value: 'No Focus', objValue: [] }
export const speedDefaultOption: ExtendedOption<number> = { label: '100%', value: '100%', objValue: 1 }
// Which editor view is shown: the editable compact (grouped) view, or the
// read-only expanded (per-position) view.
export type MainView = 'editor' | 'player'
export type EditorView = 'compact' | 'expanded'
// The active tab of the mobile bottom navigation (room for a future 'more').
export type MobileTab = 'player' | 'scores' | 'focus' | 'speed'

export interface UserSelections {
    selectedScoreOption: ExtendedOption<ScoreInfo> | null
    selectedFocusOption: ExtendedOption<Position[]>
    selectedSpeedOption: ExtendedOption<number>
    selectedPanggulOption: ExtendedOption<Position[]>
    selectedCursorStyle: PlaybackCursorStyle
    mainView: MainView
    editorView: EditorView
    mobileTab: MobileTab
    /** Id of the active keyboard mapping (see shared `keyMaps`). */
    selectedKeyMapId: string
    /** Physical keyboard layout used for note entry. */
    keyboard: KeyboardType
    /** Whether the notation panel in the Animation component is shown. */
    notationVisible: boolean
    setSelectedScoreOption: Dispatch<ExtendedOption<ScoreInfo> | null>
    setSelectedFocusOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedSpeedOption: Dispatch<ExtendedOption<number>>
    setSelectedPanggulOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedCursorStyle: Dispatch<PlaybackCursorStyle>
    setMainView: Dispatch<MainView>
    setEditorView: Dispatch<EditorView>
    setMobileTab: Dispatch<MobileTab>
    setSelectedKeyMapId: Dispatch<string>
    setKeyboard: Dispatch<KeyboardType>
    setNotationVisible: Dispatch<boolean>
}

// The UI selections are persisted to IndexedDB (next to the recovery score) so a reload restores
// the last session regardless of authentication. `selectedScoreOption` is excluded — the score
// itself is restored by the recovery snapshot, not here. Preferences still override these on an
// explicit login (see AuthContext).
export const useUserSelectionStore = create<UserSelections>()(
    persist(
        (set): UserSelections => ({
            selectedScoreOption: null,
            selectedFocusOption: focusDefaultOption,
            selectedSpeedOption: speedDefaultOption,
            selectedPanggulOption: panggulDefaultOption,
            selectedCursorStyle: 'Beat' as PlaybackCursorStyle,
            editorView: 'compact' as EditorView,
            mainView: 'player' as MainView,
            mobileTab: 'player' as MobileTab,
            selectedKeyMapId: '1', // default keyboard mapping (see shared `keyMaps`)
            keyboard: 'regular' as KeyboardType,
            notationVisible: false,
            setSelectedScoreOption: (option: ExtendedOption<ScoreInfo> | null) =>
                set(() => ({ selectedScoreOption: option })),
            setSelectedFocusOption: (option: ExtendedOption<Position[]>) => set(() => ({ selectedFocusOption: option })),
            setSelectedSpeedOption: (option: ExtendedOption<number>) => set(() => ({ selectedSpeedOption: option })),
            setSelectedPanggulOption: (option: ExtendedOption<Position[]>) =>
                set(() => ({ selectedPanggulOption: option })),
            setSelectedCursorStyle: (option: PlaybackCursorStyle) => set(() => ({ selectedCursorStyle: option })),
            setMainView: (view: MainView) => set(() => ({ mainView: view })),
            setEditorView: (view: EditorView) => set(() => ({ editorView: view })),
            setMobileTab: (tab: MobileTab) => set(() => ({ mobileTab: tab })),
            setSelectedKeyMapId: (id: string) => set(() => ({ selectedKeyMapId: id })),
            setKeyboard: (keyboard: KeyboardType) => set(() => ({ keyboard })),
            setNotationVisible: (visible: boolean) => set(() => ({ notationVisible: visible }))
        }),
        {
            name: 'userSelections', // key inside the shared IDB store (alongside the recovery score)
            storage: createJSONStorage(() => idbStorage),
            // Persist the UI selections only — never the setters or the selected score.
            partialize: (s) => ({
                selectedFocusOption: s.selectedFocusOption,
                selectedSpeedOption: s.selectedSpeedOption,
                selectedPanggulOption: s.selectedPanggulOption,
                selectedCursorStyle: s.selectedCursorStyle,
                mainView: s.mainView,
                editorView: s.editorView,
                mobileTab: s.mobileTab,
                selectedKeyMapId: s.selectedKeyMapId,
                keyboard: s.keyboard,
                notationVisible: s.notationVisible
            })
        }
    )
)
