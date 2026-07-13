import type { Position, PositionGroup } from '../types/position.ts'

/** The abstract actions the editor understands. */
export type EditorActionType =
    | 'cursorLeft'
    | 'cursorRight'
    | 'cursorUp' // move to the staff above (multi-staff editor only)
    | 'cursorDown' // move to the staff below (multi-staff editor only)
    | 'cursorStart'
    | 'cursorEnd'
    | 'octaveUp' // raise the octave of the melodic note left of the cursor
    | 'octaveDown' // lower the octave of the melodic note left of the cursor
    | 'deleteLeft'
    | 'deleteRight'
    | 'insertChar' // insert/attach the literal character that was typed
    | 'insertSymbol' // insert a fixed symbol string (action.value)
    | 'attachModifier' // attach a fixed modifier char (action.value)
    | 'ignore' // swallow the keystroke, do nothing

export interface EditorAction {
    type: EditorActionType
    /** Payload for `insertSymbol` / `attachModifier`. */
    value?: string
}

/** A normalised keystroke, independent of the DOM event. */
export interface Keystroke {
    key: string
    ctrl: boolean
    alt: boolean
    shift: boolean
    meta: boolean
}

export interface EditableKeyMapping {
    id: string
    keystroke: Keystroke
    symbol: string
    instruments: (PositionGroup | Position)[]
}

export interface KeyMapDefinition {
    id: string
    name: string
    mappings: EditableKeyMapping[]
}
