import { createContext, type Context, type RefObject } from 'react'
import type { NavigationAction } from '../../config/config'
import type {
    EditorCursorFunction,
    EditorScore,
    EditorSystem,
    GenericFunction,
    SamplerAction
} from '../../models/types'
import type { Level, WarningType } from './Dashboard'
// Score functions: modify / save score
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

export interface DashboardFunctionsType {
    setDashboardWarning: (type: WarningType, tooltip: string, level?: Level) => void
    clearDashboardWarning: (type: WarningType) => void
}
const defaultDashboardFunc = {
    setDashboardWarning: (type: WarningType, tooltip: string, level?: Level) => {},
    clearDashboardWarning: (type: WarningType) => {}
}
export const DashboardFunctions: Context<DashboardFunctionsType> = createContext(defaultDashboardFunc)

// Audio functions: used for playback from the editor interface
export interface AudioFunctionsType {
    playInstrument: (time: number, action: SamplerAction) => void
    moveEditorCursor: EditorCursorFunction
    genericFunction: GenericFunction
}
export const defaultAudioFunc: AudioFunctionsType = {
    playInstrument: () => {},
    moveEditorCursor: () => {},
    genericFunction: () => {}
}
export const AudioFunctions: Context<AudioFunctionsType> = createContext(defaultAudioFunc)

export interface NavigationFunctionsType {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => void
    navigate: (action: NavigationAction, row: number, col: number) => RefObject<HTMLTextAreaElement | null>
    applyRules: (notation: string[], rowId: number, colId: number, cached: boolean) => void
}
// Navigation functions: used by the keyboard listener
// register is used to access individual cells while avoiding passing a ref which slows down the app.
export const defaultNavFunc: NavigationFunctionsType = {
    register: () => {},
    navigate: (): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    applyRules: () => {}
}
export const NavigationFunctions: Context<NavigationFunctionsType> = createContext(defaultNavFunc)
