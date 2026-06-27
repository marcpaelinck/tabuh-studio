import { create } from 'zustand'

const NAME = 'Tabuh Studio'
const VERSION = '1.0.0'
const COPYRIGHT = '\u00a9 Marc Paelinck 2026'

export interface AppInfoStore {
    name: string
    version: string
    copyright: string
}
export const useAppInfo = create((): AppInfoStore => ({ name: NAME, version: VERSION, copyright: COPYRIGHT }))
