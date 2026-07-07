import { create } from 'zustand'
import pkg from '../../package.json' with { type: 'json' }
import { apiVersion } from '../services/apiService'

const NAME = 'Tabuh Studio'
const FRONTEND_VERSION = pkg.version
const BACKEND_VERSION = (await apiVersion()).version || ''
const COPYRIGHT = '\u00a9 Marc Paelinck 2026'

export interface AppInfoStore {
    name: string
    frontend_version: string
    backend_version: string
    copyright: string
}
export const useAppInfo = create(
    (): AppInfoStore => ({
        name: NAME,
        frontend_version: FRONTEND_VERSION,
        backend_version: BACKEND_VERSION,
        copyright: COPYRIGHT
    })
)
