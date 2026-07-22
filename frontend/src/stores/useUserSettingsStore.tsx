import type { Position } from '@tabuhstudio/shared'
import type { Dispatch } from 'react'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { PlaybackCursorStyle } from '../typing/animation'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'

export const panggulDefaultOption: ExtendedOption<Position[]> = { label: 'Hide', value: 'Hide', objValue: [] }
export const focusDefaultOption: ExtendedOption<Position[]> = { label: 'No Focus', value: 'No Focus', objValue: [] }
export const speedDefaultOption: ExtendedOption<number> = { label: '100%', value: '100%', objValue: 1 }
// Which editor view is shown: the editable compact (grouped) view, or the
// read-only expanded (per-position) view.
export type MainView = 'editor' | 'player'
export type EditorView = 'compact' | 'expanded'

export interface UserSelections {
    selectedScoreOption: ExtendedOption<ScoreInfo> | null
    selectedFocusOption: ExtendedOption<Position[]>
    selectedSpeedOption: ExtendedOption<number>
    selectedPanggulOption: ExtendedOption<Position[]>
    selectedCursorStyle: PlaybackCursorStyle
    mainView: MainView
    editorView: EditorView
    /** Id of the active keyboard mapping (see shared `keyMaps`). */
    selectedKeyMapId: string
    setSelectedScoreOption: Dispatch<ExtendedOption<ScoreInfo> | null>
    setSelectedFocusOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedSpeedOption: Dispatch<ExtendedOption<number>>
    setSelectedPanggulOption: Dispatch<ExtendedOption<Position[]>>
    setSelectedCursorStyle: Dispatch<PlaybackCursorStyle>
    setMainView: Dispatch<MainView>
    setEditorView: Dispatch<EditorView>
    setSelectedKeyMapId: Dispatch<string>
}

export const useUserSelectionStore: UseBoundStore<StoreApi<UserSelections>> = create((set) => ({
    selectedScoreOption: null,
    selectedFocusOption: focusDefaultOption,
    selectedSpeedOption: speedDefaultOption,
    selectedPanggulOption: panggulDefaultOption,
    selectedCursorStyle: 'Beat' as PlaybackCursorStyle,
    editorView: 'expanded' as EditorView,
    mainView: 'player' as MainView,
    selectedKeyMapId: '1', // default keyboard mapping (see shared `keyMaps`)
    setSelectedScoreOption: (option: ExtendedOption<ScoreInfo> | null) => set(() => ({ selectedScoreOption: option })),
    setSelectedFocusOption: (option: ExtendedOption<Position[]>) => set(() => ({ selectedFocusOption: option })),
    setSelectedSpeedOption: (option: ExtendedOption<number>) => set(() => ({ selectedSpeedOption: option })),
    setSelectedPanggulOption: (option: ExtendedOption<Position[]>) => set(() => ({ selectedPanggulOption: option })),
    setSelectedCursorStyle: (option: PlaybackCursorStyle) => set(() => ({ selectedCursorStyle: option })),
    setMainView: (view: MainView) => set(() => ({ mainView: view })),
    setEditorView: (view: EditorView) => set(() => ({ editorView: view })),
    setSelectedKeyMapId: (id: string) => set(() => ({ selectedKeyMapId: id }))
}))
