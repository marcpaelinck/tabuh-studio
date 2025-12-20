import { createContext, type Context, type RefObject } from 'react'
import type { CursorAction, CursorFunction, EditorSystemData, GenericFunction, SamplerAction } from '../../models/types'
import type { NavigationFunctionsType } from './_types'
import type { NavigationAction } from '../../config/config'

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

export const defaultNavFunc: NavigationFunctionsType = {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => {},
    navigate: (action: NavigationAction, row: number, col: number): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    updateSystemData: (data: EditorSystemData) => {}
}
export const NavigationFunctions: Context<NavigationFunctionsType> = createContext(defaultNavFunc)
