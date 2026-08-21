import { orchestraConfigs } from '@tabuhstudio/shared/config/position'
import type { Orchestra, Position } from '@tabuhstudio/shared/types/position'
import { orderedPositions, sortByPositionOrder } from '@tabuhstudio/shared/utils/position'
import type { Dispatch } from 'react'
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { ScoreInfo } from '../typing/interface'
import type { Score, System } from '../typing/score'

export interface CurrentScore {
    scoreInfoList: ScoreInfo[] | null
    currentScore: Score | undefined
    orchestra: Orchestra | undefined
    orchestraPositions: Position[]
    beatPosition: Position
    allowedPositionGroups: Position[][]
    labelDict: Record<string, System>
    /** True when currentScore has edits not yet saved to the DB or exported to a .json file. */
    dirty: boolean
    /** Bumped when the open score's systems are restructured in place (e.g. applying a new staff
     *  order), so the compact editors — which seed their own state — remount and pick it up. */
    structureVersion: number
    setScoreInfoList: Dispatch<ScoreInfo[] | null>
    setOrchestra: Dispatch<Orchestra>
    setOrchestraPositions: Dispatch<Position[]>
    setBeatPosition: Dispatch<Position>
    /**
     * Load/create a score. Staff order always follows the caller-supplied `staffOrder` (the current
     * user's default for the orchestra) — or the system default when omitted. The score's own
     * `positions` order is ignored. Every system's groups are sorted to that order.
     */
    setCurrentScore: (score: Score, staffOrder?: Position[]) => void
    updateCurrentScore: (updater: (score: Score) => Partial<Score>) => void
    setAllowedPositionGroups: Dispatch<Position[][]>
    setLabelDict: Dispatch<Record<string, System>>
    /** Marks the current score as saved (clears the dirty flag). */
    markSaved: () => void
    /**
     * Apply `order` (a per-orchestra staff order) to the OPEN score now: update the display order and
     * re-sort every system's groups to it. Marks the score dirty. Used by the Preferences "apply to
     * current score" action (normal loads resolve the order from the user's preferences instead).
     */
    applyPositionOrder: (order: Position[]) => void
    /** Closes the current score: back to the no-score state. */
    clearCurrentScore: () => void
}

export const useScoreStore: UseBoundStore<StoreApi<CurrentScore>> = create((set) => ({
    scoreInfoList: null,
    currentScore: undefined,
    orchestra: undefined,
    orchestraPositions: [],
    beatPosition: 'KEMPLI' as Position,
    allowedPositionGroups: [],
    labelDict: {},
    dirty: false,
    structureVersion: 0,
    setScoreInfoList: (infoList: ScoreInfo[] | null) => set(() => ({ scoreInfoList: infoList })),
    // Loading or creating a score establishes a clean baseline (dirty = false).
    setCurrentScore: (score: Score, staffOrder?: Position[]) =>
        set(() => {
            // Staff order always follows the user/system default (the score's own positions order is
            // ignored). Sort every system's groups to it on load, so ordering depends only on it.
            const positions = orderedPositions(score.instrumenttype, staffOrder)
            const systems = score.systems.map((sys) => ({ ...sys, groups: sortByPositionOrder(sys.groups, positions) }))
            return {
                currentScore: { ...score, systems },
                orchestra: score.instrumenttype,
                orchestraPositions: positions,
                dirty: false
            }
        }),
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
    setOrchestra: (orchestra: Orchestra) =>
        set(() => ({ orchestra: orchestra, beatPosition: orchestraConfigs[orchestra]?.beatPosition || undefined })),
    setOrchestraPositions: (positions: Position[]) => set(() => ({ orchestraPositions: positions })),
    setBeatPosition: (position: Position) => set(() => ({ beatPosition: position })),
    setAllowedPositionGroups: (groups: Position[][]) => set(() => ({ allowedPositionGroups: groups })),
    setLabelDict: (dict: Record<string, System>) => set(() => ({ labelDict: dict })),
    markSaved: () => set(() => ({ dirty: false })),
    applyPositionOrder: (order: Position[]) =>
        set((state) => {
            const cur = state.currentScore
            if (!cur) return {}
            const positions = orderedPositions(cur.instrumenttype, order)
            const systems = cur.systems.map((sys) => ({ ...sys, groups: sortByPositionOrder(sys.groups, positions) }))
            return {
                currentScore: { ...cur, systems },
                orchestraPositions: positions,
                dirty: true,
                // Force the compact editors (which seed their own state) to re-seed with the new order.
                structureVersion: state.structureVersion + 1
            }
        }),
    clearCurrentScore: () =>
        set(() => ({
            currentScore: undefined,
            orchestra: undefined,
            orchestraPositions: [],
            labelDict: {},
            dirty: false
        }))
}))

//         set((state) => ({state.currentScore: (state.currentScore ? { ...state.currentScore, ...entries } : undefined)})),
