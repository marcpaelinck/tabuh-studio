import { createContext, type Context } from 'react'
import type { EditorSystemData } from '../../models/types'

export interface AudioFunctionsType {
    playPause: (doPlay: boolean, data?: EditorSystemData[]) => void
}

export const defaultAudioFunc: AudioFunctionsType = { playPause: (doPlay: boolean, data?: EditorSystemData[]) => {} }

export const AudioFunctions: Context<AudioFunctionsType> = createContext(defaultAudioFunc)
