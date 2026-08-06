// A zustand `persist` StateStorage backed by IndexedDB (via idb-keyval) instead of the
// default localStorage. Scores are large and localStorage is synchronous + ~5 MB; IndexedDB
// is async and roomy, keeping big writes off the main thread.

import { createStore, del, get, set, type UseStore } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

// Dedicated DB/store so this can't collide with anything else using idb-keyval's default store.
const store: UseStore = createStore('tabuh-studio', 'recovery')

export const idbStorage: StateStorage = {
    getItem: async (name) => (await get<string>(name, store)) ?? null,
    setItem: async (name, value) => {
        await set(name, value, store)
    },
    removeItem: async (name) => {
        await del(name, store)
    }
}
