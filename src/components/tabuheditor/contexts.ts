import { createContext, type Context, type RefObject } from 'react'
import type { NavigationAction } from '../../config/config'
import type {
    EditorCursorFunction,
    EditorScore,
    EditorSystem,
    GenericFunction,
    SamplerAction
} from '../../models/types'
// Score functions: modify / save score
export interface ScoreFunctionsType {
    editorScore: EditorScore | undefined
    getEditorScore: () => EditorScore | undefined
    updateEditorScore: (score: EditorScore) => void
    updateSystem: (system: EditorSystem) => void
    updateParts: (parts: Record<string, string[]>) => void
}
export const defaultScoreFunc: ScoreFunctionsType = {
    editorScore: undefined,
    getEditorScore: () => undefined,
    updateEditorScore: () => {},
    updateSystem: () => {},
    updateParts: () => {}
}

export const ScoreFunctions: Context<ScoreFunctionsType> = createContext(defaultScoreFunc)

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
    updateSystemData: (data: EditorSystem) => void
    applyRules: (notation: string[], rowId: number, colId: number, cached: boolean) => void
}

// Navigation functions: used by the keyboard listener
// register is used to access individual cells while avoiding passing a ref which slows down the app.
export const defaultNavFunc: NavigationFunctionsType = {
    register: () => {},
    navigate: (): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    updateSystemData: () => {},
    applyRules: () => {}
}
export const NavigationFunctions: Context<NavigationFunctionsType> = createContext(defaultNavFunc)
