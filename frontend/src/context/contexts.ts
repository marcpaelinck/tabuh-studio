import { createContext, type Context, type RefObject } from 'react'
import type { NavigationAction } from '../config/config'
import type { Score, System } from '../typing/score'

// SCORE FUNCTIONS
// modify / save score
export interface ScoreFunctionsType {
    getScore: () => Score | undefined
    updateScore: (system: Score) => void
    updateSystem: (system: System) => void
    updateParts: (parts: Record<string, string[]>) => void
}
export const defaultScoreFunc: ScoreFunctionsType = {
    getScore: () => undefined,
    updateScore: () => {},
    updateSystem: () => {},
    updateParts: () => {}
}
export const ScoreFunctions: Context<ScoreFunctionsType> = createContext(defaultScoreFunc)

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
