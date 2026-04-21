// This module contains the rules that are used for the automatic generation of notation for grouped staves.
// These are staves that stand for multiple instruments or multiple instrument positions.

import type { NoteSymbol, Position } from '../typing/types'
import { debug } from '../utils/debugger.ts'

type CastingInstructionType = 'nokempyung'
export interface CastingInstruction {
    type: CastingInstructionType
    positions?: Position[]
    scope?: 'score' | 'system'
}

type RuleName = 'default' | 'nokempyung'
type CastingRule = Record<NoteSymbol, NoteSymbol>
type PositionRuleSet = Partial<Record<RuleName, CastingRule>> & Record<'default', CastingRule>
type CastingRuleSet = Partial<Record<Position, PositionRuleSet>> & Record<'DEFAULT', PositionRuleSet>

// CASTING RULES
// prettier-ignore
const castingRules: CastingRuleSet = {
    JEGOGAN: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', '-': '-', '.': '.' }},
    CALUNG: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', '-': '-', '.': '.' }},
    PENYACAH: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', '-': '-', '.': '.' }},
    PEMADE_POLOS: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<',
                            'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A',  '-': '-', '.': '.' }},
    KANTILAN_POLOS: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<', 
                                'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', '-': '-', '.': '.' }},
    PEMADE_SANGSIH: {default: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'A', 'O': 'I', 'E':'I', 'U': 'O', 'A': 'E', '-': '-', '.': '.' },
                    nokempyung: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A',  '-': '-', '.': '.' }},
    KANTILAN_SANGSIH: {default: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'A', 'O': 'I', 'E':'I', 'U': 'O', 'A': 'E',  '-': '-', '.': '.' },
                    nokempyung: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A',  '-': '-', '.': '.' }},
    UGAL: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<', 
                    'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', '-': '-', '.': '.' }},
    REYONG_1: {default: { 'o,':'a,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'u,', o: 'a,', e: 'e,', u: 'u,', a: 'a,', 'i<':'u,',
                        'I':'A', 'O': 'I', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 't':'t', 'b':'b', 'x':'x', '-': '-', '.': '.' },
            nokempyung: { 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', 'e': 'e,', 'u': 'u,', 'a': 'a,', 'i<': 'i', 'o<': 'o',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.' }},
    REYONG_2: {default: { 'o,':'o', 'e,': 'e', 'u,': 'o', 'a,': 'e', i: 'i', o: 'o', e: 'e', u: 'o', a: 'e', 'i<': 'i',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'O', 'A': 'E', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.' },
            nokempyung: { 'a,': 'a,', i: 'i', o: 'o', 'e': 'e', 'u': 'u,', 'a': 'a,', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.' }},
    REYONG_3: {default: { 'o,':'a', 'e,': 'i<', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<',
                        'I':'I', 'O': 'A', 'E':'I', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.' },
            nokempyung: { 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'o<', 'e': 'e', 'u': 'u', 'a': 'a', 'i<': 'i<', 'o<': 'o<',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.' }},
    REYONG_4: {default: { 'o,':'o<', 'e,': 'e<', 'u,': 'u<', 'a,': 'e<', i: 'u<', o: 'o<', e: 'e<', u: 'u<', a: 'e<', 'i<': 'u<',
                        'I':'U', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'E', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.' },
            nokempyung: { 'a,': 'a', i: 'i<', o: 'o<', 'e': 'e<', 'u': 'u<', 'a': 'a', 'i<': 'i<', 'o<': 'o<', 'e<': 'e<', 'u<': 'u<',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.' }},
    DEFAULT: {default: { 'o,':' ', 'e,': ' ', 'u,': ' ', 'a,': ' ', i: ' ', o: ' ', e: ' ', u: ' ', a: ' ', 'i<': ' ', '-': '-', '.': '.' }}
}

// POKOK RULES - the pokok instruments play a selection of the full notation.
// Keep only the first note of a measure. Other notes will be translated to dashes (extension).
const onlyFirstNote: Partial<Position>[] = ['JEGOGAN', 'CALUNG']
// Keep only the odd numbered notes (1st, 3rd, etc.) of a measure. Other notes will be translated to dashes (extension).
const onlyOddNotes: Partial<Position>[] = ['PENYACAH']
// Only prcess even numbered measures
const onlyOddMeasures: Partial<Position>[] = ['JEGOGAN']
// Staves with these position groups should not be converted to kempyung.
const nokempyung: Partial<Position>[][] = [
    ['PEMADE_SANGSIH', 'KANTILAN_SANGSIH'],
    ['REYONG_1', 'REYONG_3'],
    ['REYONG_2', 'REYONG_4']
]
// Splits a symbol in a tone (pitch letter + octave character) and the rest (remaining characters).
const splitTone = (symbol: string): string[] => {
    // const regExp = RegExp(_.escapeRegExp('^([aeiours-\.][,<]{0,1})(.*)$'), 'g')
    const regExp = /^([abeiourstxABEIOURSX\-\.][,<]{0,1})(.*)$/g
    const match = symbol.matchAll(regExp)
    return [...match.map((el) => [el[1], el[2]])].flat(1)
}

function selectRule(position: Position, group: Position[], castingInstructions?: CastingInstruction[]): CastingRule {
    if (!castingRules[position]) return castingRules.DEFAULT.default

    // Do not cast notes to the kempyung equivalent if the group occurs in `nokempyung`.
    if (nokempyung.some((nkgroup) => group.every((pos) => nkgroup.includes(pos))))
        return castingRules[position].nokempyung!

    const posRuleset = castingRules[position]
    if (castingInstructions) {
        for (const instruction of castingInstructions) {
            switch (instruction.type) {
                case 'nokempyung':
                    if (!instruction.positions || instruction.positions.includes(position)) {
                        return posRuleset!.nokempyung || posRuleset!.default
                    }
                    break
                default:
            }
        }
    }
    return posRuleset.default
}

// Casts the measure to the given position:
// converts the notation to the position's range and polos/sangsih type,
// assuming that the measure is a basic (polos) melody.
// measureId starts with 0
export function castNotation(
    notation: string[],
    position: Position,
    group: Position[],
    measureId: number,
    castingInstructions?: CastingInstruction[]
): string[] {
    const conversion: CastingRule = selectRule(position, group, castingInstructions)

    var updatedNotation = [...notation]

    // Apply pokok rules
    if (onlyOddMeasures.includes(position) && (measureId + 1) % 2 == 0) {
        // Clear even numbered measures. Note that measure numbering starts with 0.
        updatedNotation = updatedNotation.map((_) => '-')
        debug(`${position}: onlyOddMeasures, result = ${updatedNotation}`)
    }
    if (onlyOddNotes.includes(position)) {
        updatedNotation = updatedNotation.map((sym, idx) =>
            // Remove even numbered notes.
            (idx + 1) % 2 == 0 ? '-' : sym
        )
        debug(`${position}: onlyOddNotes, result = ${updatedNotation}`)
    }
    if (onlyFirstNote.includes(position)) {
        updatedNotation = updatedNotation.map((sym, idx) =>
            // Remove all but first note.
            idx > 0 ? '-' : sym
        )
        debug(`${position}: onlyFirstNote, result = ${updatedNotation}`)
    }

    // Apply casting rules
    const result = updatedNotation.map((symbol) => {
        const [tone, rest] = splitTone(symbol)
        var cast = conversion[tone]
        const newSymbol = cast ? cast + rest : ' '
        return newSymbol
    })
    return result
}
