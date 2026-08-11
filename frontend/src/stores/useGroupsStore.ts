// Music groups and the current user's subscriptions, loaded after login. Used by the score
// filter (subscribed groups), the preferences drawer (subscriptions), and the admin group
// manager. Cleared on logout.

import { create } from 'zustand'
import type { MusicGroup } from '../services/apiService'

interface GroupsState {
    groups: MusicGroup[]
    subscriptions: number[] // group ids the user subscribes to
    setGroups: (groups: MusicGroup[]) => void
    setSubscriptions: (ids: number[]) => void
    clear: () => void
}

export const useGroupsStore = create<GroupsState>((set) => ({
    groups: [],
    subscriptions: [],
    setGroups: (groups) => set({ groups }),
    setSubscriptions: (subscriptions) => set({ subscriptions }),
    clear: () => set({ groups: [], subscriptions: [] })
}))
