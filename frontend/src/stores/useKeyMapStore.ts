/**
 * Editable keyboard-mapping definitions.
 *
 * Seeded from the shared built-in `keyMaps`, then edited in memory by the keymap
 * editor (Step 2). The *selection* (which map is active) lives in the user-selection
 * store; this store owns the editable LIST and the mutations on it. Later (Step 3)
 * the list will also be populated from / persisted to the database.
 */

import { keyMaps as builtinKeyMaps, type EditableKeyMapping, type KeyMapDefinition } from '@tabuhstudio/shared'
import { v4 as uuidv4 } from 'uuid'
import { create, type StoreApi, type UseBoundStore } from 'zustand'

interface KeyMapStore {
    keyMaps: KeyMapDefinition[]
    /** Replace the mappings of one definition (used when the editor confirms edits). */
    updateMappings: (id: string, mappings: EditableKeyMapping[]) => void
    /** Create a new, empty definition and return its id. */
    addKeyMap: (name: string) => string
    /** Add an imported definition under a fresh id and return that id. */
    importKeyMap: (def: KeyMapDefinition) => string
    renameKeyMap: (id: string, name: string) => void
    deleteKeyMap: (id: string) => void
}

export const useKeyMapStore: UseBoundStore<StoreApi<KeyMapStore>> = create((set) => ({
    // Deep clone so edits never mutate the shared built-in const.
    keyMaps: structuredClone(builtinKeyMaps) as KeyMapDefinition[],
    updateMappings: (id, mappings) =>
        set((s) => ({ keyMaps: s.keyMaps.map((k) => (k.id === id ? { ...k, mappings } : k)) })),
    addKeyMap: (name) => {
        const id = uuidv4()
        set((s) => ({ keyMaps: [...s.keyMaps, { id, name, mappings: [] }] }))
        return id
    },
    importKeyMap: (def) => {
        const id = uuidv4()
        set((s) => ({ keyMaps: [...s.keyMaps, { ...structuredClone(def), id }] }))
        return id
    },
    renameKeyMap: (id, name) =>
        set((s) => ({ keyMaps: s.keyMaps.map((k) => (k.id === id ? { ...k, name } : k)) })),
    deleteKeyMap: (id) => set((s) => ({ keyMaps: s.keyMaps.filter((k) => k.id !== id) }))
}))
