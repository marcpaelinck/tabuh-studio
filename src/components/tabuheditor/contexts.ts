import { createContext, type Context, type RefObject } from 'react'
import type { NavigationAction } from '../../config/config'
import type {
    EditorCursorFunction,
    EditorSystemData,
    GenericFunction,
    JsonSymbol,
    SamplerAction
} from '../../models/types'

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
    updateSystemData: (data: EditorSystemData) => void
    applyRules: (notation: JsonSymbol[], rowId: number, colId: number, cached: boolean) => void
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
