import { createContext, type Context, type RefObject } from 'react'
import type {
    CursorAction,
    CursorFunction,
    EditorSystemData,
    GenericFunction,
    JsonSymbol,
    SamplerAction
} from '../../models/types'
import type { NavigationAction } from '../../config/config'

// Audio functions: used for playback from the editor interface
export interface AudioFunctionsType {
    playInstrument: (time: number, action: SamplerAction) => void
    moveCursor: CursorFunction
    genericFunction: GenericFunction
}

export const defaultAudioFunc: AudioFunctionsType = {
    playInstrument: (time: number, action: SamplerAction) => {},
    moveCursor: (time: number, cAction: CursorAction) => {},
    genericFunction: (time: number) => {}
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
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => {},
    navigate: (action: NavigationAction, row: number, col: number): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    updateSystemData: (data: EditorSystemData) => {},
    applyRules: (notation: JsonSymbol[], rowId: number, colId: number, cached: boolean) => {}
}
export const NavigationFunctions: Context<NavigationFunctionsType> = createContext(defaultNavFunc)
