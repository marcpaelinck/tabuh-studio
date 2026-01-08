import type { JsonSymbol } from '../models/types'
// This hook contains the rules that are used for the automatic generation of notation for grouped staves.

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

// POKOK RULES - the pokok instruments play a selection of the full notation.
// Keep only the first note of a measure. Other notes will be translated to dashes (extension).
const onlyFirstNote = ['JEGOGAN', 'CALUNG']
// Keep only the odd numbered notes (1st, 3rd, etc.) of a measure. Other notes will be translated to dashes (extension).
const onlyOddNotes = ['PENYACAH']
// Only prcess even numbered measures
const onlyOddMeasures = ['JEGOGAN']

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
        const conversion: Record<string, string> = fromPolos[position] || {}

        var updatedNotation = notation
        // Apply pokok rules
        if (onlyOddMeasures.includes(position) && (measureId + 1) % 2 == 0) {
            // Clear even numbered measures. Note that measure numbering starts with 0.
            updatedNotation.forEach((sym) => {
                sym.s = '-'
            })
        }
        if (onlyOddNotes.includes(position))
            updatedNotation.forEach((sym, idx) => {
                // Remove even numbered notes.
                if ((idx + 1) % 2 == 0) sym.s = '-'
            })
        if (onlyFirstNote.includes(position))
            updatedNotation.forEach((sym, idx) => {
                // Remove all but first note.
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
