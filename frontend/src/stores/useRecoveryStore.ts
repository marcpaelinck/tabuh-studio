// Crash/close recovery for work in progress. A canonical snapshot of the score being edited
// is persisted (IndexedDB, via zustand `persist`) whenever it is loaded or modified. On the
// next startup the app checks this snapshot: if it is `dirty` (edited since the last save to
// the database or export to a Tabuh Studio .json file), the user is offered a chance to resume.
//
// This is deliberately a SEPARATE store from the live `useScoreStore`: persisting the live
// store would auto-rehydrate stale data into the editor on every normal reload. Here the
// snapshot is inert data that the app reads on boot and only applies on the user's request.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Score } from '../typing/score'
import { idbStorage } from './idbStorage'

export interface RecoverySnapshot {
    score: Score
    title: string
    scoreUuid: string
    savedAt: number // Date.now() of the capture
    dirty: boolean // true = unsaved changes since the last DB save / .json export
}

interface RecoveryState {
    snapshot: RecoverySnapshot | null
    /** Async IDB hydration has completed (snapshot reflects what was persisted). */
    hydrated: boolean
    capture: (snapshot: RecoverySnapshot) => void
    clear: () => void
}

export const useRecoveryStore = create<RecoveryState>()(
    persist(
        (set) => ({
            snapshot: null,
            hydrated: false,
            capture: (snapshot) => set({ snapshot }),
            clear: () => set({ snapshot: null })
        }),
        {
            name: 'currentScore', // key inside the IDB store
            storage: createJSONStorage(() => idbStorage),
            partialize: (s) => ({ snapshot: s.snapshot }),
            // Runs after the async IDB read resolves; flip `hydrated` so the boot check waits.
            onRehydrateStorage: () => () => useRecoveryStore.setState({ hydrated: true })
        }
    )
)

/**
 * Produces the canonical, compact score to persist: the same shape a database save stores,
 * i.e. without the derived object-notation caches and transient edit buffers. On recovery it
 * is re-expanded by `postprocessScore`. Deep-cloned so the live score is never mutated.
 */
export function buildSnapshotScore(score: Score): Score {
    const clone = structuredClone(score) as Score
    clone.systems.forEach((sys) =>
        Object.values(sys.staffs).forEach((staff) => {
            if (!staff) return
            // objNotation is non-optional on Staff; view as Partial so it can be dropped.
            const s = staff as Partial<typeof staff>
            delete s.notation_
            delete s.objNotation
            delete s.objNotation_
        })
    )
    return clone
}

/** Builds and stores a recovery snapshot for the given score (persist writes it to IDB). */
export function captureRecoverySnapshot(score: Score, dirty: boolean): void {
    useRecoveryStore.getState().capture({
        score: buildSnapshotScore(score),
        title: score.title,
        scoreUuid: score.uuid,
        savedAt: Date.now(),
        dirty
    })
}
