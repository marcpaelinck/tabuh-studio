import { orchestras } from '@tabuhstudio/shared/config/position'
import type { InstrumentGroup, Position } from '@tabuhstudio/shared/types/position'
import type { Dispatch } from 'react'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { ScoreInfo } from '../typing/interface'
import type { Score, System } from '../typing/score'

export interface CurrentScore {
    scoreInfoList: ScoreInfo[] | null
    currentScore: Score | undefined
    orchestra: InstrumentGroup
    orchestraPositions: Position[]
    beatPosition: Position
    allowedPositionGroups: Position[][]
    labelDict: Record<string, System>
    /** True when currentScore has edits not yet saved to the DB or exported to a .json file. */
    dirty: boolean
    setScoreInfoList: Dispatch<ScoreInfo[] | null>
    setOrchestra: Dispatch<InstrumentGroup>
    setOrchestraPositions: Dispatch<Position[]>
    setBeatPosition: Dispatch<Position>
    setCurrentScore: Dispatch<Score>
    updateCurrentScore: (updater: (score: Score) => Partial<Score>) => void
    setAllowedPositionGroups: Dispatch<Position[][]>
    setLabelDict: Dispatch<Record<string, System>>
    /** Marks the current score as saved (clears the dirty flag). */
    markSaved: () => void
}

export const useScoreStore: UseBoundStore<StoreApi<CurrentScore>> = create((set) => ({
    scoreInfoList: null,
    currentScore: undefined,
    orchestra: 'UNDEFINED',
    orchestraPositions: [],
    beatPosition: 'KEMPLI' as Position,
    allowedPositionGroups: [],
    labelDict: {},
    dirty: false,
    setScoreInfoList: (infoList: ScoreInfo[] | null) => set(() => ({ scoreInfoList: infoList })),
    // Loading or creating a score establishes a clean baseline (dirty = false).
    setCurrentScore: (score: Score) =>
        set(() => ({
            currentScore: score,
            orchestra: score.instrumenttype,
            orchestraPositions: orchestras[score.instrumenttype as InstrumentGroup]?.positions || [],
            dirty: false
        })),
    // Every edit path goes through here, so this is where the score becomes dirty.
    updateCurrentScore: (updater) =>
        set((state) => {
            const currentScore = state.currentScore
            if (!currentScore) {
                return { currentScore: undefined }
            }
            const attr = updater(currentScore)
            return { currentScore: { ...currentScore, ...attr }, dirty: true }
        }),
    setOrchestra: (orchestra: InstrumentGroup) =>
        set(() => ({ orchestra: orchestra, beatPosition: orchestras[orchestra]?.beatPosition || undefined })),
    setOrchestraPositions: (positions: Position[]) => set(() => ({ orchestraPositions: positions })),
    setBeatPosition: (position: Position) => set(() => ({ beatPosition: position })),
    setAllowedPositionGroups: (groups: Position[][]) => set(() => ({ allowedPositionGroups: groups })),
    setLabelDict: (dict: Record<string, System>) => set(() => ({ labelDict: dict })),
    markSaved: () => set(() => ({ dirty: false }))
}))

//         set((state) => ({state.currentScore: (state.currentScore ? { ...state.currentScore, ...entries } : undefined)})),
