import { positionConfigs } from '../config/position'
import type { NoteSymbol } from '../types/basetypes'
import type { Position } from '../types/position'

/**
 * Sorts melodic notes by frequency.
 * @param values list of NoteSymbol values
 * @param ascending boolean: sorting order
 * @returns sorted list of NoteSymbol values.
 */
export function sortNotes(values: NoteSymbol[], ascending: boolean = true): NoteSymbol[] {
    const order = ['i,', 'o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i>', 'o>', 'e>', 'u>', 'a>']
    const compare = (n1: string, n2: string) => {
        n1 = n1.length == 1 ? n1 : n1[1] in [',', '<'] ? n1.slice(0, 2) : n1[0]
        n2 = n1.length == 1 ? n2 : n2[1] in [',', '<'] ? n2.slice(0, 2) : n2[0]
        if (!(n1 in order && n2 in order)) return 0
        return ascending ? order.indexOf(n1) - order.indexOf(n2) : order.indexOf(n2) - order.indexOf(n1)
    }
    return values.sort(compare)
}

/**
 * Returns a position's range as a list of NoteSymbol values.
 * @param position
 * @param invert
 * @returns sorted list of NoteSymbol values.
 */
export function noteRange(position: Position, invert: boolean = false): NoteSymbol[] {
    const range = Object.keys(positionConfigs[position].symbolToNoteNames).filter((sym) =>
        /^[aeiou][,<]{0,1}$/.test(sym)
    )
    return sortNotes(range)
}
