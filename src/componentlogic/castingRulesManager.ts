// This module contains the rules that are used for the automatic generation of notation for grouped staves.

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
const castingRules: CastingRuleSet = {
    // prettier-ignore
    JEGOGAN: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i'  , '-': '-', '.': '.' }},
    // prettier-ignore
    CALUNG: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i'  , '-': '-', '.': '.' }},
    // prettier-ignore
    PENYACAH: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i'  , '-': '-', '.': '.' }},
    // prettier-ignore
    PEMADE_POLOS: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' }},
    // prettier-ignore
    KANTILAN_POLOS: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' }},
    // prettier-ignore
    PEMADE_SANGSIH: {default: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' },
                     nokempyung: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' }},
    // prettier-ignore
    KANTILAN_SANGSIH: {default: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<' , '-': '-', '.': '.' },
                       nokempyung: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' }},
    // prettier-ignore
    UGAL: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<'  , '-': '-', '.': '.' }},
    // prettier-ignore
    REYONG_1: {default: { 'o,': 'a,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'u,', o: 'a,', e: 'e,', u: 'u,', a: 'a,', 'i<': 'u,' , '-': '-', '.': '.' }},
    // prettier-ignore
    REYONG_2: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'o', 'a,': 'e', i: 'i', o: 'o', e: 'e', u: 'o', a: 'e', 'i<': 'i' , '-': '-', '.': '.' }},
    // prettier-ignore
    REYONG_3: {default: { 'o,': 'a', 'e,': 'i<', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<' , '-': '-', '.': '.' }},
    // prettier-ignore
    REYONG_4: {default: { 'o,': 'o<', 'e,': 'e<', 'u,': 'u<', 'a,': 'e<', i: 'u<', o: 'o<', e: 'e<', u: 'u<', a: 'e<', 'i<': 'u<' , '-': '-', '.': '.' }},
    // prettier-ignore
    DEFAULT: {default: { 'o,': ' ', 'e,': ' ', 'u,': ' ', 'a,': ' ', i: ' ', o: ' ', e: ' ', u: ' ', a: ' ', 'i<': ' ', '-': '-', '.': '.' }}
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

function selectRule(position: Position, castingInstructions?: CastingInstruction[]): CastingRule {
    if (!castingRules[position]) return castingRules.DEFAULT.default

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
    measureId: number,
    castingInstructions?: CastingInstruction[]
): string[] {
    const conversion: CastingRule = selectRule(position, castingInstructions)

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
