import type { Position } from '@tabuhstudio/shared'
import { NoteObject } from '@tabuhstudio/shared'
import {
    alphabet,
    invalidSymbol,
    type AlphabetItem,
    type Category,
    type Kind
} from '@tabuhstudio/shared/config/alphabet'
import { orchestras, positionConfigs } from '@tabuhstudio/shared/config/position'
import type { NoteSymbol } from '@tabuhstudio/shared/types/basetypes'
import type { InstrumentGroup } from '@tabuhstudio/shared/types/position'
import _ from 'lodash'

export interface ValidNoteObjectsAttr {
    position?: Position
    orchestra?: InstrumentGroup
    asDict: boolean
}

/**
 * Returns a list of all possible NoteObjects for the given position/
 * If the position is omitted, all possible NoteObjects will be returned/
 * @param position
 * @param asDict false: returns a list of NoteObjects. true: returns a Record<Position, NoteObject[]>.
 * @returns
 */
export function validNoteObjects({
    position,
    orchestra,
    asDict = false
}: ValidNoteObjectsAttr): NoteObject[] | Partial<Record<Position, NoteObject[]>> {
    interface LookupValue extends AlphabetItem {
        char: NoteSymbol
    }
    if (orchestra && !(orchestra in orchestras)) return asDict ? ({} as Partial<Record<Position, NoteObject[]>>) : []

    // Create a set of positions for which to return valid notes
    const positions: Set<Position> = new Set(
        orchestra
            ? orchestras[orchestra]!.positions
            : position
              ? [position]
              : (Object.keys(positionConfigs) as Position[])
    )

    // Create convenience lookup tables
    const tones = Object.entries(alphabet)
        .filter(([char, props]) => props.kind == 'tone')
        .map(([char, props]) => ({ char, ...props })) as LookupValue[]
    const prefixes = Object.entries(alphabet)
        .filter(([char, props]) => props.kind == 'prefix')
        .map(([char, props]) => ({ char, ...props })) as LookupValue[]
    const octavations = Object.entries(alphabet)
        .filter(([char, props]) => props.kind == 'octavation')
        .map(([char, props]) => ({ char, ...props })) as LookupValue[]
    const modifiers = Object.entries(alphabet)
        .filter(([char, props]) => props.kind == 'modifier')
        .map(([char, props]) => ({ char, ...props })) as LookupValue[]

    // Create a 'no character' alphabet entry
    const none = {
        char: '',
        kind: 'null' as Kind,
        name: '',
        description: '',
        combinesWith: ['melodic', 'percussion', 'colotomy'] as Category[],
        positions: Object.keys(positionConfigs)
    } as LookupValue

    const validList: NoteObject[] = []
    const validDict: Partial<Record<Position, NoteObject[]>> = _.fromPairs(
        [...positions].map((pos) => [pos as Position, [] as NoteObject[]])
    )

    // Iterate over all tones
    for (const tone of tones) {
        var matchingPositions = positions.intersection(new Set(tone.positions))
        if (positions.intersection(new Set(tone.positions))) {
            // Iterate over all prefixes (including none)
            for (const prefix of [none].concat(prefixes)) {
                if (
                    matchingPositions.intersection(new Set(prefix.positions)).size &&
                    prefix.combinesWith!.includes(tone.category!) &&
                    tone.positions.some((pos) => prefix.positions.includes(pos))
                ) {
                    // Iterate over all octaves (including none)
                    for (const octavation of [none].concat(octavations)) {
                        if (
                            matchingPositions.intersection(new Set(octavation.positions)).size &&
                            octavation.combinesWith!.includes(tone.category!) &&
                            tone.positions.some((pos) => octavation.positions.includes(pos)) &&
                            (prefix.kind == 'null' || octavation.combinesWithPrefix)
                        ) {
                            // Iterate over all modifiers (including none)
                            for (const modifier of [none].concat(modifiers)) {
                                if (
                                    matchingPositions.intersection(new Set(modifier.positions)).size &&
                                    modifier.combinesWith!.includes(tone.category!) &&
                                    tone.positions.some((pos) => modifier.positions.includes(pos)) &&
                                    (prefix.kind == 'null' || modifier.combinesWithPrefix)
                                ) {
                                    // Add valid note to list or dict
                                    const validNote = new NoteObject(
                                        prefix.char + tone.char + octavation.char + modifier.char,
                                        position
                                    )
                                    if (asDict) matchingPositions.forEach((pos) => validDict[pos]?.push(validNote))
                                    else validList.push(validNote)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return asDict ? validDict : validList
}

export function symbolName(symbol: NoteSymbol) {
    return Array.from(symbol)
        .map((char) =>
            char in alphabet ? alphabet[char].name.toLowerCase() : alphabet[invalidSymbol].name.toLowerCase()
        )
        .join(' ')
}
