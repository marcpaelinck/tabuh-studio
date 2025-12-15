import { createContext, type Context, type RefObject } from 'react'
import type { NavigationFunctionsType } from './types'
import type { NavigationAction } from '../../config/config'
import type { EditorCellCursor, EditorSystemData } from '../../models/types'

export const defaultNavFunc: NavigationFunctionsType = {
    register: (row: number, col: number, element?: RefObject<HTMLTextAreaElement | null>) => {},
    navigate: (action: NavigationAction, row: number, col: number): RefObject<HTMLTextAreaElement | null> => {
        return { current: null }
    },
    updateSystemData: (data: EditorSystemData) => {}
}

export const noCursor: EditorCellCursor = { system: -1, position: '', measure: -1 }

export const NavigationFunctions: Context<NavigationFunctionsType> = createContext(defaultNavFunc)
