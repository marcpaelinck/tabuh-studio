import _ from 'lodash'
import type { JsonSymbol } from '../models/types'
import { getValidSymbols, symbolValidationUtils } from '../utils/alphabet'

// CASTING RULES
const fromPolos: Record<string, Record<string, string>> = {
    // prettier-ignore
    JEGOGAN: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i'  , '-': '-', '.': '.' },
    // prettier-ignore
    CALUNG: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i'  , '-': '-', '.': '.' },
    // prettier-ignore
    PENYACAH: { 'o,': 'o', 'e,': 'e', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i'  , '-': '-', '.': '.' },
    // prettier-ignore
    PEMADE_POLOS: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' },
    // prettier-ignore
    KANTILAN_POLOS: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' },
    // prettier-ignore
    PEMADE_SANGSIH: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' },
    // prettier-ignore
    KANTILAN_SANGSIH: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<' , '-': '-', '.': '.' },
    // prettier-ignore
    UGAL: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' },
    // prettier-ignore
    REYONG_1: { 'o,': 'a,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'u,', o: 'a,', e: 'e,', u: 'u,', a: 'a,', 'i<': 'u,' , '-': '-', '.': '.' },
    // prettier-ignore
    REYONG_2: { 'o,': 'o', 'e,': 'e', 'u,': 'o', 'a,': 'e', i: 'i', o: 'o', e: 'e', u: 'o', a: 'e', 'i<': 'i' , '-': '-', '.': '.' },
    // prettier-ignore
    REYONG_3: { 'o,': 'a', 'e,': 'i<', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<' , '-': '-', '.': '.' },
    // prettier-ignore
    REYONG_4: { 'o,': 'o<', 'e,': 'e<', 'u,': 'u<', 'a,': 'e<', i: 'u<', o: 'o<', e: 'e<', u: 'u<', a: 'e<', 'i<': 'u<' , '-': '-', '.': '.' },
    // prettier-ignore
    DEFAULT: { 'o,': ' ', 'e,': ' ', 'u,': ' ', 'a,': ' ', i: ' ', o: ' ', e: ' ', u: ' ', a: ' ', 'i<': ' ', '-': '-', '.': '.' }
}

// POKOK RULES
const onlyFirstNote = ['JEGOGAN', 'CALUNG']
const onlyOddNotes = ['PENYACAH']
const onlyEvenMeasures = ['JEGOGAN']

// Splits a symbol in a tone (pitch letter + octave character) and the rest (remaining characters).
const splitTone = (symbol: string): string[] => {
    // const regExp = RegExp(_.escapeRegExp('^([aeiours-\.][,<]{0,1})(.*)$'), 'g')
    const regExp = /^([aeiours\-\.][,<]{0,1})(.*)$/g
    const match = symbol.matchAll(regExp)
    return [...match.map((el) => [el[1], el[2]])].flat(1)
}

export function useRules() {
    // Casts the measure to the given position:
    // converts the notation to the position's range and polos/sangsih type,
    // assuming that the measure is a basic (polos) melody.
    // measureId starts with 0
    function castNotation(notation: JsonSymbol[], position: string, measureId: number): JsonSymbol[] {
        const validSymbols = getValidSymbols(position, true)
        const { validRegExpCell } = symbolValidationUtils(validSymbols)
        const conversion: Record<string, string> = fromPolos[position] || {}

        var updatedNotation = notation
        // Apply pokok rules
        if (onlyEvenMeasures.includes(position) && (measureId + 1) % 2 == 0)
            updatedNotation.forEach((sym) => {
                sym.s = '-'
            })
        // updatedNotation = updatedNotation.map((jsonSym) => {
        //     return { ...jsonSym, ...{ s: '-' } }
        // })
        if (onlyOddNotes.includes(position))
            updatedNotation.forEach((sym, idx) => {
                if ((idx + 1) % 2 == 0) sym.s = '-'
            })
        if (onlyFirstNote.includes(position))
            updatedNotation.forEach((sym, idx) => {
                if (idx > 0) sym.s = '-'
            })

        // Apply casting rules
        const result = notation.map((jSymbol) => {
            const [tone, rest] = splitTone(jSymbol.s)
            var cast = conversion[tone]
            const newSymbol = cast ? cast + rest : ' '
            return { ...jSymbol, ...{ s: newSymbol } }
        })
        return result
    }

    return { castNotation }
}
