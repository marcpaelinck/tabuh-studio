import { createContext, type Context, type RefObject } from 'react'
import type { EditorSystemData } from '../../models/types'
import type { NavigationFunctionsType } from './_types'
import type { NavigationAction } from '../../config/config'

export interface AudioFunctionsType {
    loadData: (data: EditorSystemData[]) => void
    playPause: (doPlay: boolean) => void
}

export const defaultAudioFunc: AudioFunctionsType = {
    loadData: (data: EditorSystemData[]) => {},
    playPause: (doPlay: boolean) => {}
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
