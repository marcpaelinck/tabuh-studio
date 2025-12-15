import { type RefObject } from 'react'
import type { AudioFunctionsType, NavigationFunctionsType } from './_types'
import type { NavigationAction } from '../../config/config'
import type { EditorCellCursor, EditorSystemData } from '../../models/types'

export const defaultNavFunc: NavigationFunctionsType = {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => {},
    navigate: (action: NavigationAction, row: number, col: number): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    updateSystemData: (data: EditorSystemData) => {}
}

export const defaultAudioFunc: AudioFunctionsType = { playPause: (doPlay: boolean, data?: EditorSystemData[]) => {} }

export const noCursor: EditorCellCursor = { system: -1, position: '', measure: -1 }
