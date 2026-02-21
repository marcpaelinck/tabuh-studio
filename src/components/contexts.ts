import { createContext, type Context, type RefObject } from 'react'
import type { NavigationAction } from '../config/config'
import type {
    EditorCursorFunction,
    EditorScore,
    EditorSystem,
    GenericFunction,
    ScheduleSamplerAction,
    WpDatabaseReturnValue,
    WpUserReturnValue
} from '../typing/types'
import { emulateAsync } from '../utils/async'
import type { ComponentName, DashboardComponentValues } from './editor/Dashboard'

// SCORE FUNCTIONS
// modify / save score
export interface ScoreFunctionsType {
    getEditorScore: () => EditorScore | undefined
    updateScore: (system: EditorScore) => void
    updateSystem: (system: EditorSystem) => void
    updateParts: (parts: Record<string, string[]>) => void
    scoreToFormattedJson: (score: EditorScore) => string | undefined
}
export const defaultScoreFunc: ScoreFunctionsType = {
    getEditorScore: () => undefined,
    updateScore: () => {},
    updateSystem: () => {},
    updateParts: () => {},
    scoreToFormattedJson: () => undefined
}
export const ScoreFunctions: Context<ScoreFunctionsType> = createContext(defaultScoreFunc)

// DASHBOARD FUNCTIONS
// Update the status info above the notation frame
export interface DashboardFunctionsType {
    setDashboardElement: (name: ComponentName, value: DashboardComponentValues) => void
    clearDashboardElement: (type: ComponentName) => void
}
const defaultDashboardFunc = {
    setDashboardElement: (name: ComponentName, value: DashboardComponentValues) => {},
    clearDashboardElement: (type: ComponentName) => {}
}
export const DashboardFunctions: Context<DashboardFunctionsType> = createContext(defaultDashboardFunc)

// AUDIO FUNCTIONS
// used for playback from the editor interface
export interface PlaybackFunctionsType {
    playInstrument: (time: number, action: ScheduleSamplerAction) => void
    moveEditorCursor: EditorCursorFunction
    genericFunction: GenericFunction
}
export const defaultPlaybackFunc: PlaybackFunctionsType = {
    playInstrument: () => {},
    moveEditorCursor: () => {},
    genericFunction: () => {}
}
export const PlaybackFunctions: Context<PlaybackFunctionsType> = createContext(defaultPlaybackFunc)

// NAVIGATION FUNCTIONS
// used by the keyboard listener
// register is used to access individual cells while avoiding passing a ref which slows down the app.
export interface NavigationFunctionsType {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => void
    navigate: (action: NavigationAction, row: number, col: number) => RefObject<HTMLTextAreaElement | null>
    applyRules: (notation: string[], rowId: number, colId: number, cached: boolean) => void
}
export const defaultNavFunc: NavigationFunctionsType = {
    register: () => {},
    navigate: (): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    applyRules: () => {}
}
export const NavigationFunctions: Context<NavigationFunctionsType> = createContext(defaultNavFunc)

// WORDPRESS API FUNCTIONS
export interface WordPressApiType {
    user: {
        login: (username: string, password: string) => Promise<WpUserReturnValue>
        logout: () => Promise<WpUserReturnValue>
        getUser: () => Promise<WpUserReturnValue>
    }
    database: {
        saveScore: (uuid: string, title: string, json: string) => Promise<WpDatabaseReturnValue>
        getScore: (uuid: string) => Promise<WpDatabaseReturnValue>
        getScoreList: () => Promise<WpDatabaseReturnValue>
    }
}
export const defaultWpApiFunc: WordPressApiType = {
    user: {
        login: () =>
            emulateAsync<WpUserReturnValue>({
                logged_in: false,
                user: { ID: '-1', display_name: 'Develop Mode', roles: [] },
                nonce: ''
            }),
        logout: () =>
            emulateAsync<WpUserReturnValue>({
                logged_in: false,
                user: { ID: '-1', display_name: 'Develop Mode', roles: [] },
                nonce: ''
            }),
        getUser: () =>
            emulateAsync<WpUserReturnValue>({
                logged_in: true,
                user: { ID: '-1', display_name: 'Develop Mode', roles: [] },
                nonce: ''
            })
    },
    database: {
        saveScore: async () => new Promise(Object()),
        getScore: async () => new Promise(Object()),
        getScoreList: async () => new Promise(Object())
    }
}
export const WpApiFunctions: Context<WordPressApiType> = createContext(defaultWpApiFunc)
