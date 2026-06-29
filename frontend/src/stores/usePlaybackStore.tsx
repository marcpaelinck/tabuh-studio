import type { Position } from '@tabuhstudio/shared'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { PlaybackCursorStyle } from '../typing/animation'
import type { ExtendedOption, ScoreInfo } from '../typing/interface'
import type { PlaybackSettings } from '../typing/playback'

export const panggulDefaultOption: ExtendedOption<Position[]> = { label: 'Hide', value: 'Hide', objValue: [] }
export const focusDefaultOption: ExtendedOption<Position[]> = { label: 'No Focus', value: 'No Focus', objValue: [] }
export const speedDefaultOption: ExtendedOption<number> = { label: '100%', value: '100%', objValue: 1 }

export const useUserSelectionStore: UseBoundStore<StoreApi<PlaybackSettings>> = create((set) => ({
    selectedScoreOption: null,
    selectedFocusOption: focusDefaultOption,
    selectedSpeedOption: speedDefaultOption,
    selectedPanggulOption: panggulDefaultOption,
    selectedCursorStyle: 'Beat',
    setSelectedScoreOption: (option: ExtendedOption<ScoreInfo> | null) => set(() => ({ selectedScoreOption: option })),
    setSelectedFocusOption: (option: ExtendedOption<Position[]>) => set(() => ({ selectedFocusOption: option })),
    setSelectedSpeedOption: (option: ExtendedOption<number>) => set(() => ({ selectedSpeedOption: option })),
    setSelectedPanggulOption: (option: ExtendedOption<Position[]>) => set(() => ({ selectedPanggulOption: option })),
    setSelectedCursorStyle: (option: PlaybackCursorStyle) => set(() => ({ selectedCursorStyle: option }))
}))
