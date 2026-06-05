import _ from 'lodash'
import {
    AcceleratingTremoloChars,
    GraceNoteChars,
    HalfDurationChars,
    NorotChars,
    positionConfigs,
    RakeDownChars,
    RakeUpChars,
    TremoloChars
} from '../config/config'
import type { NoteSymbol, Position } from '../typing/basetypes'
import { getValidSymbols } from './alphabet'

type StrokeType =
    | 'SINGLENOTE'
    | 'HALF_DURATION'
    | 'TREMOLO'
    | 'TREMOLO_ACC'
    | 'GRACENOTE'
    | 'RAKE'
    | 'NOROT'
    | 'UNHANDLED'
    | 'INVALID'

export function getStrokeType(symbol: NoteSymbol, position: Position): StrokeType {
    const validSymbols = getValidSymbols(position, true, false)
    switch (true) {
        case validSymbols.includes(symbol):
            return 'SINGLENOTE'
        case HalfDurationChars.some((char) => symbol.includes(char)):
            return 'HALF_DURATION'
        case !positionConfigs[position].validStrokes.includes(symbol):
            return 'INVALID'
        case symbol.length > 0 && GraceNoteChars.includes(symbol[0]):
            return 'GRACENOTE'
        case TremoloChars.includes(symbol.slice(-1)):
            return 'TREMOLO'
        case AcceleratingTremoloChars.includes(symbol.slice(-1)):
            return 'TREMOLO_ACC'
        case _.concat(RakeUpChars, RakeDownChars).includes(symbol.slice(-1)):
            return 'RAKE'
        case NorotChars.some((char) => symbol.includes(char)):
            return 'NOROT'
        default:
            return 'UNHANDLED'
    }
}
