// This module contains the rules that are used for the automatic generation of notation for grouped staves.
// These are staves that stand for multiple instruments or multiple instrument positions.

import { ERROR_PITCH_CHAR, NoteObject, SPACE_CHAR, type Position } from '@tabuhstudio/shared'
import type { NoteSymbol } from '@tabuhstudio/shared/types/basetypes'
import type { InstrumentGroup } from '@tabuhstudio/shared/types/position'
import _ from 'lodash'
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
            nokempyung: {'o,':'o', 'e,': 'e,', 'u,': 'u,', 'a,': 'a,', i: 'i', o: 'o', 'e': 'e,', 'u': 'u,', 'a': 'a,', 'i<': 'i', 'o<': 'o',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    REYONG_2: {default: { 'o,':'o', 'e,': 'e', 'u,': 'o', 'a,': 'e', i: 'i', o: 'o', e: 'e', u: 'o', a: 'e', 'i<': 'i',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'O', 'A': 'E', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
            nokempyung: { 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a,', i: 'i', o: 'o', 'e': 'e', 'u': 'u,', 'a': 'a,', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    REYONG_3: {default: { 'o,':'a', 'e,': 'i<', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'a', e: 'i<', u: 'u', a: 'a', 'i<': 'i<',
                        'I':'I', 'O': 'A', 'E':'I', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
            nokempyung: {'o,':'o<', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i<', o: 'o<', 'e': 'e', 'u': 'u', 'a': 'a', 'i<': 'i<', 'o<': 'o<',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    REYONG_4: {default: { 'o,':'o<', 'e,': 'e<', 'u,': 'u<', 'a,': 'e<', i: 'u<', o: 'o<', e: 'e<', u: 'u<', a: 'e<', 'i<': 'u<',
                        'I':'U', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'E', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
            nokempyung: { 'o,':'o<', 'e,': 'e<', 'u,': 'u<', 'a,': 'a', i: 'i<', o: 'o<', 'e': 'e<', 'u': 'u<', 'a': 'a', 'i<': 'i<', 'o<': 'o<', 'e<': 'e<', 'u<': 'u<',
                        'I':'I', 'O': 'O', 'E':'E', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' },
                norot: { 'i,':'i', 'o,':'o', 'e,': 'e', 'u,': 'u', 'a,': 'a', i: 'i', o: 'o', e: 'e', u: 'u', a: 'a', 'i<': 'i', 'o<': 'o', 'e<': 'e', 'u<': 'u', 'a<': 'a'}},
    REYONGB_1: {default: { 'o,': 'o', 'e,': 'e', 'O': 'O', 'E': 'E', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' }},
    REYONGB_2: {default: { 'u,': 'u', 'a,': 'a', 'U': 'U', 'A': 'A', 'B': 'B', 'X': 'X', 'b':'b', 'x':'x', '-': '-', '.': '.', ' ': ' ' }},
    CENGCENG_P: {default: {x: 'x', '-': '-', '.': '.', ' ': ' ' }},
    CENGCENG_S: {default: {x: 'x', '-': '-', '.': '.', ' ': ' ' }},
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

export const allowedPositionGroups: Record<InstrumentGroup, Position[][]> = {
    GONG_KEBYAR: [
        [
            'PEMADE_POLOS',
            'PEMADE_SANGSIH',
            'KANTILAN_POLOS',
            'KANTILAN_SANGSIH',
            'REYONG_1',
            'REYONG_2',
            'REYONG_3',
            'REYONG_4',
            'UGAL',
            'PENYACAH',
            'CALUNG',
            'JEGOGAN'
        ],
        ['KEMPLI', 'CENGCENG', 'REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4']
    ],
    BALEGANJUR: [
        ['REYONGB_1', 'REYONGB_2'],
        ['CENGCENG_P', 'CENGCENG_S']
    ],
    UNDEFINED: []
}

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

// --- Dual-editor group-membership helpers -------------------------------------

// Which positions may be ADDED to a group. `available` is already the system-wide
// universe minus the positions in use. A candidate `p` is allowed only if the
// resulting set `group ∪ {p}` fits inside a single `allowedGroups` array (so only
// valid aggregations can be formed). An empty group accepts any available position.
export function candidatesFor(
    groupPositions: Position[],
    available: Position[],
    orchestra: InstrumentGroup
): Position[] {
    if (groupPositions.length === 0) return available
    return available.filter((p) =>
        allowedPositionGroups[orchestra].some((grp) => [...groupPositions, p].every((x) => grp.includes(x)))
    )
}

// Splits a position `p` out of a multi-position group into its own solo staff,
// carrying the notation `p` currently has (the cast result), so it keeps playing.
export function castGroupToSolo(
    groupPositions: Position[],
    notation: NoteObject[],
    p: Position,
    castingInstructions?: CastingInstruction[]
): NoteObject[] {
    const posIdx = groupPositions.indexOf(p)
    if (posIdx < 0) return notation
    const flat = notation.map((note) => (note.toString() || SPACE_CHAR) as NoteSymbol)
    return castNotation({ id: '', positions: groupPositions, notation: flat }, posIdx, castingInstructions)
}

// ______________ AGGREGATION RULES _______________

// Aggregation rules determine which rule to apply for each possible combination of instruments.
// Only these combinations may be aggregated. Aggregation should be tried in the sequence in which
// they occur here.
const aggregationRules: { group: Position[]; rules: RuleName[] }[] = [
    {
        group: [
            'PEMADE_POLOS',
            'KANTILAN_POLOS',
            'PEMADE_SANGSIH',
            'KANTILAN_SANGSIH',
            'UGAL',
            'REYONG_1',
            'REYONG_2',
            'REYONG_3',
            'REYONG_4'
        ],
        rules: ['default', 'default', 'default', 'default', 'default', 'default', 'default', 'default', 'default']
    },
    {
        group: ['PEMADE_POLOS', 'KANTILAN_POLOS', 'PEMADE_SANGSIH', 'KANTILAN_SANGSIH', 'UGAL'],
        rules: ['default', 'default', 'default', 'default', 'default']
    },
    {
        group: [
            'PEMADE_POLOS',
            'KANTILAN_POLOS',
            'PEMADE_SANGSIH',
            'KANTILAN_SANGSIH',
            'REYONG_1',
            'REYONG_2',
            'REYONG_3',
            'REYONG_4'
        ],
        rules: ['default', 'default', 'default', 'default', 'default', 'default', 'default', 'default']
    },
    { group: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4'], rules: ['default', 'default', 'default', 'default'] },
    { group: ['PEMADE_POLOS', 'KANTILAN_POLOS'], rules: ['default', 'default'] },
    { group: ['PEMADE_SANGSIH', 'KANTILAN_SANGSIH'], rules: ['nokempyung', 'nokempyung'] },
    { group: ['PEMADE_POLOS', 'PEMADE_SANGSIH'], rules: ['default', 'default'] },
    { group: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'], rules: ['default', 'default'] },
    { group: ['REYONG_1', 'REYONG_3'], rules: ['nokempyung', 'nokempyung'] },
    { group: ['REYONG_2', 'REYONG_4'], rules: ['nokempyung', 'nokempyung'] }
]

type InverseCastingRule = Record<NoteSymbol, NoteSymbol[]>
type InversePositionRuleSet = Partial<Record<RuleName, InverseCastingRule>>
type InverseCastingRuleSet = Partial<Record<Position, InversePositionRuleSet>>

// Inverts the casting rules. The result maps position notes to a list of corresponding grouped notation notes.
const inverseCastingRules: InverseCastingRuleSet = _.fromPairs(
    _.entries(castingRules).map(([position, rule]) => [
        position,
        _.fromPairs(
            _.entries(rule).map(([name, mapping]) => [
                name,
                _.entries(mapping).reduce(
                    (aggr, [a, b]) => {
                        if (!(b in aggr)) aggr[b] = []
                        aggr[b].push(a)
                        return aggr
                    },
                    {} as Record<string, string[]>
                )
            ])
        )
    ])
)

// This function performs the opposite of `castNotation`: it tries to group separate notations.
// Returns a new notation if aggregation is possible, otherwise undefined.
export function aggregateNotation(groups: Partial<Record<Position, NoteSymbol[]>>): GroupedNotation | undefined {
    // Create a mapping: position -> rule
    const positions = _.keys(groups)
    const groupRules = aggregationRules.find((grouping) => _.difference(grouping.group, positions).length == 0)
    if (!groupRules) return undefined
    const ruleMap: Partial<Record<Position, RuleName>> = _.fromPairs(_.zip(groupRules.group, groupRules.rules))

    // Create staffs where each item of the notation contains all possible grouped notation equivalents
    const alternatives = _.entries(groups).map(([pos, notation]) =>
        notation.map((note) => {
            const mapping: InverseCastingRule | undefined =
                inverseCastingRules[pos as Position]![ruleMap[pos as Position] as RuleName]
            return mapping ? (mapping[note] ?? []) : []
        })
    )
    // Create a grouped notation by selecting a symbol for each column that occurs in all alternatives in that column.
    const nrColumns = Math.max(...alternatives.map((notation) => notation.length))
    const notation: NoteSymbol[] = []
    var valid = true
    for (var col = 0; col < nrColumns && valid; col++) {
        const column: NoteSymbol[][] = alternatives.map((notation) => notation[col] ?? [])
        const options = new Set(column.flat()) // The candidates to consider as grouped notation for this column
        for (const symbol of options) {
            if (column.every((alt) => alt.includes(symbol as NoteSymbol))) {
                notation[col] = symbol
                break
            }
        }
        valid = false
    }
}
