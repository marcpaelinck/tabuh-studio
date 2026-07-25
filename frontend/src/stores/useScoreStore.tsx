import { instrumentGroups, type InstrumentGroup, type Position } from '@tabuhstudio/shared'
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
    setScoreInfoList: Dispatch<ScoreInfo[] | null>
    setOrchestra: Dispatch<InstrumentGroup>
    setOrchestraPositions: Dispatch<Position[]>
    setBeatPosition: Dispatch<Position>
    setCurrentScore: Dispatch<Score>
    updateCurrentScore: (updater: (score: Score) => Partial<Score>) => void
    setAllowedPositionGroups: Dispatch<Position[][]>
    setLabelDict: Dispatch<Record<string, System>>
}

export const useScoreStore: UseBoundStore<StoreApi<CurrentScore>> = create((set) => ({
    scoreInfoList: null,
    currentScore: undefined,
    orchestra: 'UNDEFINED',
    orchestraPositions: [],
    beatPosition: 'KEMPLI',
    allowedPositionGroups: [],
    labelDict: {},
    setScoreInfoList: (infoList: ScoreInfo[] | null) => set(() => ({ scoreInfoList: infoList })),
    setCurrentScore: (score: Score) =>
        set(() => ({
            currentScore: score,
            orchestra: score.instrumenttype,
            orchestraPositions: instrumentGroups[score.instrumenttype]?.positions || []
        })),
    updateCurrentScore: (updater) =>
        set((state) => {
            const currentScore = state.currentScore
            if (!currentScore) {
                return { currentScore: undefined }
            }
            const attr = updater(currentScore)
            return { currentScore: { ...currentScore, ...attr } }
        }),
    setOrchestra: (orchestra: InstrumentGroup) =>
        set(() => ({ orchestra: orchestra, beatPosition: instrumentGroups[orchestra]?.beatPosition })),
    setOrchestraPositions: (positions: Position[]) => set(() => ({ orchestraPositions: positions })),
    setBeatPosition: (position: Position) => set(() => ({ beatPosition: position })),
    setAllowedPositionGroups: (groups: Position[][]) => set(() => ({ allowedPositionGroups: groups })),
    setLabelDict: (dict: Record<string, System>) => set(() => ({ labelDict: dict }))
}))

//         set((state) => ({state.currentScore: (state.currentScore ? { ...state.currentScore, ...entries } : undefined)})),
