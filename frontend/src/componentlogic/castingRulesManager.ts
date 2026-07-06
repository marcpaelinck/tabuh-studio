// This module contains the rules that are used for the automatic generation of notation for grouped staves.
// These are staves that stand for multiple instruments or multiple instrument positions.

import { ERROR_PITCH_CHAR, NoteObject } from '@tabuhstudio/shared'
import type { NoteSymbol, Position } from '@tabuhstudio/shared/types/basetypes.ts'
import type { GroupedNotation, Staffs, System } from '../typing/score.ts'

type CastingInstructionType = 'nokempyung' | 'norot'
export interface CastingInstruction {
    type: CastingInstructionType
    positions?: Position[]
    scope?: 'score' | 'system'
}

type RuleName = 'default' | 'nokempyung' | 'norot'
type CastingRule = Record<NoteSymbol, NoteSymbol>
type PositionRuleSet = Partial<Record<RuleName, CastingRule>> & Record<'default', CastingRule>
type CastingRuleSet = Partial<Record<Position, PositionRuleSet>> & Record<'DEFAULT', PositionRuleSet>

// CASTING RULES
// prettier-ignore
const castingRules: CastingRuleSet = {
    JEGOGAN: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', '-': '-', '.': '.', ' ': ' ' }},
    CALUNG: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', '-': '-', '.': '.', ' ': ' ' }},
    PENYACAH: {default: { 'o,': 'o', 'e,': 'e', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', '-': '-', '.': '.', ' ': ' ' }},
    PEMADE_POLOS: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<',
                            'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A',  '-': '-', '.': '.', ' ': ' ' }},
    KANTILAN_POLOS: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<', 
                                'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', '-': '-', '.': '.', ' ': ' ' }},
    PEMADE_SANGSIH: {default: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'A', 'O': 'I', 'E':'I', 'U': 'O', 'A': 'E', '-': '-', '.': '.', ' ': ' ' },
                    nokempyung: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A',  '-': '-', '.': '.', ' ': ' ' }},
    KANTILAN_SANGSIH: {default: { 'o,': 'a,', 'e,': 'i', 'u,': 'o', 'a,': 'e', i: 'u', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'A', 'O': 'I', 'E':'I', 'U': 'O', 'A': 'E',  '-': '-', '.': '.', ' ': ' ' },
                    nokempyung: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<',
                                'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A',  '-': '-', '.': '.', ' ': ' ' }},
    UGAL: {default: { 'o,': 'o,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i<', 
                    'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', '-': '-', '.': '.', ' ': ' ' }},
    REYONG_1: {default: { 'o,':'a,', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'u,', o: 'a,', e: 'e,', u: 'u,', a: 'a,', 'i<':'u,',
                        'I':'A', 'O': 'I', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 't':'t', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
            nokempyung: { 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', 'e': 'e,', 'u': 'u,', 'a': 'a,', 'i<': 'i', 'o<': 'o',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    REYONG_2: {default: { 'o,':'o', 'e,': 'e', 'u,': 'o', 'a,': 'e', i: 'i', o: 'o', e: 'e', u: 'o', a: 'e', 'i<': 'i',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'O', 'A': 'E', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
            nokempyung: { 'a,': 'a,', i: 'i', o: 'o', 'e': 'e', 'u': 'u,', 'a': 'a,', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    REYONG_3: {default: { 'o,':'a', 'e,': 'i<', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<',
                        'I':'I', 'O': 'A', 'E':'I', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
            nokempyung: { 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'o<', 'e': 'e', 'u': 'u', 'a': 'a', 'i<': 'i<', 'o<': 'o<',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    REYONG_4: {default: { 'o,':'o<', 'e,': 'e<', 'u,': 'u<', 'a,': 'e<', i: 'u<', o: 'o<', e: 'e<', u: 'u<', a: 'e<', 'i<': 'u<',
                        'I':'U', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'E', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
            nokempyung: { 'a,': 'a', i: 'i<', o: 'o<', 'e': 'e<', 'u': 'u<', 'a': 'a', 'i<': 'i<', 'o<': 'o<', 'e<': 'e<', 'u<': 'u<',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    DEFAULT: {default: { 'i,':' ', 'o,':' ', 'e,': ' ', 'u,': ' ', 'a,': ' ', i: ' ', o: ' ', e: ' ', u: ' ', a: ' ', 'i<': ' ', 'o<': ' ', 'e<': ' ', 'u<': ' ', 'a<': ' ', '-': '-', '.': '.', ' ': ' ' }
    }
}

// POKOK RULES - the pokok instruments play a selection of the full notation.
// Keep only the first note of a measure. Other notes will be translated to dashes (extension).
// const onlyFirstNote: Partial<Position>[] = ['JEGOGAN', 'CALUNG']
// Keep only the odd numbered notes (1st, 3rd, etc.) of a measure. Other notes will be translated to dashes (extension).
// const onlyOddNotes: Partial<Position>[] = ['PENYACAH']
// Only prcess even numbered measures
// const onlyOddMeasures: Partial<Position>[] = ['JEGOGAN']
// Staves with these position groups should not be converted to kempyung.
// Rationale: the groups contain similar positions so the notation should be interpreted as-is.
const nokempyung: Partial<Position>[][] = [
    ['PEMADE_SANGSIH', 'KANTILAN_SANGSIH'],
    ['REYONG_1', 'REYONG_3'],
    ['REYONG_2', 'REYONG_4']
]

function selectRule(
    position: keyof CastingRuleSet,
    group: Position[],
    castingInstructions?: CastingInstruction[]
): CastingRule {
    if (!castingRules[position]) return castingRules.DEFAULT.default

    // Do not cast notes to the kempyung equivalent if all positions occur in a 'nokempyung' group.
    // In that case they will all have a 'nokempyung'
    const posRuleset = castingRules[position]
    if (castingInstructions) {
        for (const instruction of castingInstructions) {
            switch (instruction.type) {
                case 'nokempyung':
                    if (!instruction.positions || instruction.positions.includes(position as Position)) {
                        return posRuleset!.nokempyung || posRuleset!.default
                    }
                    break
                case 'norot':
                    // Reyong should be cast to octave 1, other positions should not be cast.
                    return posRuleset.norot || posRuleset.nokempyung || posRuleset.default
                default:
            }
        }
    }

    if (nokempyung.some((nkgroup) => group.every((pos) => nkgroup.includes(pos))))
        return castingRules[position].nokempyung!

    return posRuleset.default
}

// When a staff notation applies to a group of positions, this function converts
// the common staff notation to individual staff notation for each position, using 'casting' rules.
// groupedNotation: groups of positions with corresponding notation (one Staff per kempli beat)
// castInstructions: contains AUTOKEMPYUNG metadata which indicates whether homophonic notation
//                   should be converted to kempyung equivalent for sangsih positions.
export function castGroupedNotationToPositions(system: System, castInstructions: CastingInstruction[]): Staffs {
    const staffs: Staffs = {}
    for (const notationGroup of system.groups) {
        // Multiple positions: cast notation to each position
        notationGroup.positions.forEach((position, posIdx) => {
            const objNotation = castNotation(notationGroup, posIdx, castInstructions)
            const strNotation = objNotation.map((note) => note.toString())
            staffs[position] = { notation: strNotation, objNotation: objNotation }
        })
    }
    return staffs
}

// Casts the measure to the given position:
// converts the notation to the position's range and polos/sangsih type,
// assuming that the measure is a basic (polos) melody.
// measureId starts with 0
export function castNotation(
    notationGroup: GroupedNotation,
    posIdx: number,
    castingInstructions?: CastingInstruction[]
): NoteObject[] {
    if (posIdx < 0 || posIdx >= notationGroup.positions.length) {
        console.error(`Instrument index ${posIdx} too large.`)
        return []
    }
    const position = notationGroup.positions[posIdx]

    // No casting if there is only one instrument position
    if (notationGroup.positions.length == 1)
        return notationGroup.notation.map((symbol) => new NoteObject(symbol, position))

    const conversion: CastingRule = selectRule(position, notationGroup.positions, castingInstructions)
    // Norot notes should not be translated to kempyung
    const norotconversion: CastingRule = selectRule(position, notationGroup.positions, [
        { type: 'norot' as CastingInstructionType }
    ])

    const result = notationGroup.notation.map((symbol) => {
        const note: NoteObject = new NoteObject(symbol, position)
        if (note.error !== undefined) return new NoteObject(ERROR_PITCH_CHAR, position)
        const tone = note.symbol.pitch + note.symbol.octave
        const cast = note.pattern.norot ? norotconversion[tone] : conversion[tone]
        if (cast == undefined) {
            console.error(`invalid symbol '${note.canonicalSymbol}' for ${position}`)
        }
        const newSymbol = cast !== undefined ? note.symbol.prefix + cast + note.symbol.modifier : ERROR_PITCH_CHAR

        return new NoteObject(newSymbol, position)
    })

    return result
}
