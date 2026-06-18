// Compact -> expanded notation pipeline.
//
// This module owns the entire transform from grouped/shorthand ("compact") notation
// to explicit per-position ("expanded") notation. It was extracted verbatim from the
// tabuhParser so that BOTH the parser and the live editor run identical code:
//
//   expandGroupedNotation = castGroupedNotationToPositions  (casting rules)
//                         -> applyPatterns                  (shorthand expansion, e.g. norot)
//                         -> pad beats to equal column width (vertical alignment)
//                         -> flatten beats into one Staff per position
//
// `deriveKempli` reproduces the kempli-frequency/state derivation that depends on the
// computed column widths.
//
// NOTE: the norot space-consuming / cut-off alignment policy is intentionally NOT
// implemented here yet — this module preserves the parser's current behaviour exactly
// (norot expands to a fixed-size sequence and beats are padded to equal width). The
// space-eating refinement is planned for the compact editor (see CLAUDE.dual-editor.md).

import { NoteObject } from '@tabuhstudio/shared'
import { SPACE_CHAR } from '@tabuhstudio/shared/noteChars'
import _ from 'lodash'
import type { Position } from '../typing/basetypes.ts'
import type { ExecutionItem, KempliItem } from '../typing/execution.ts'
import type { GroupedNotation, KempliSetting, Staff, Staffs, System } from '../typing/score.ts'
import { castNotation, type CastingInstruction } from './castingRulesManager.ts'
import { applyPatterns, notationWidth } from './patternManager.ts'

// Intermediate type: array of beat-grouped staffs per position (used only during expansion).
export type ParsedStaffs = Partial<Record<Position, Staff[]>>

// When a staff notation applies to a group of positions, this function converts
// the common staff notation to individual staff notation for each position, using 'casting' rules.
// groupedNotation: groups of positions with corresponding notation (one Staff per kempli beat)
// castInstructions: contains AUTOKEMPYUNG metadata which indicates whether homophonic notation
//                   should be converted to kempyung equivalent for sangsih positions.
export function castGroupedNotationToPositions(
    groupedNotations: GroupedNotation[],
    castInstructions: CastingInstruction[]
): ParsedStaffs {
    const staffs: ParsedStaffs = {}
    for (const group of groupedNotations) {
        if (group.positions.length == 1) {
            // Single position: leave notation unchanged
            staffs[group.positions[0]] = group.staff
        } else if (group.positions.length > 1) {
            // Multiple positions: cast notation to each position
            group.positions.forEach((position, posIdx) => {
                const beats: Staff[] = []
                var measureIdx = 0
                for (const beat of group.staff) {
                    const objNotation = castNotation(
                        beat.objNotation,
                        group.positions,
                        measureIdx,
                        posIdx,
                        castInstructions
                    )
                    const strNotation = objNotation.map((note) => note.toString())
                    if (group.positions.length > 1) {
                        beats.push({ notation: strNotation, objNotation: objNotation })
                    } else beats.push({ ...beat })
                    measureIdx++
                }
                staffs[position] = beats
            })
        }
    }
    return staffs
}

// Flattens an array of beat-grouped staffs into a single flat Staff per position.
function flattenParsedStaffs(parsedStaffs: ParsedStaffs): Staffs {
    const staffs: Staffs = {}
    for (const [pos, beats] of Object.entries(parsedStaffs)) {
        if (!beats) continue
        const notation = beats.flatMap((beat) => beat.notation)
        const objNotation = notation.map((symbol) => new NoteObject(symbol, pos as Position))
        staffs[pos as Position] = { notation: notation, objNotation: objNotation }
    }
    return staffs
}

// Returns the maximum width of vertically aligned sections.
// Takes ParsedStaffs (Staff[] per position) as input.
export function getColwidths(parsedStaffs: ParsedStaffs): number[] {
    const sizes = _.entries(parsedStaffs)
        .filter(([_position, beats]) => beats != undefined)
        .map(([position, beats]) => beats!.map((beat) => notationWidth(beat.objNotation, position as Position)))
    // Transpose to get widths per column
    const widthsByColumn = _.zip(...sizes)
    const columnWidths: number[] = widthsByColumn.map((widths) =>
        widths.reduce((max, width) => Math.max(max || 0, width || 0), 0)
    ) as number[]
    return columnWidths
}

// Expands shorthand pattern symbols, pads all beats to a common per-column width and
// flattens the result into one Staff per position. MUTATES the given parsedStaffs
// (replaces each position's beats with the expanded+padded version) and returns the
// flattened staffs together with the computed column widths.
export function expandParsedStaffs(parsedStaffs: ParsedStaffs): { staffs: Staffs; colWidths: number[] } {
    // Step 1: Expand shorthand pattern symbols (e.g. norot) within each beat
    _.entries(parsedStaffs).forEach(([position, beats]) => {
        if (beats) parsedStaffs[position as Position] = applyPatterns(position as Position, beats)
    })

    // Step 2: Compute column widths (max notation width per beat across all positions) and pad beats
    const colWidths = getColwidths(parsedStaffs)
    _.entries(parsedStaffs).forEach(([position, beats]) => {
        if (!beats) return
        beats.forEach((beat, colIdx) => {
            const diff = (colWidths[colIdx] ?? 0) - beat.notation.length
            if (diff > 0) {
                const padding = Array(diff).fill(SPACE_CHAR)
                beat.notation.push(...padding)
                beat.objNotation.push(...padding.map((symbol) => new NoteObject(symbol, position as Position)))
            }
        })
    })

    // Step 4: Flatten beats into a single Staff per position
    const staffs = flattenParsedStaffs(parsedStaffs)
    return { staffs, colWidths }
}

// Full compact -> expanded transform: cast grouped notation to per-position notation,
// then expand/pad/flatten. This is the entry point intended for reuse by the live editor.
export function expandGroupedNotation(
    groupedNotations: GroupedNotation[],
    castInstructions: CastingInstruction[]
): { staffs: Staffs; colWidths: number[] } {
    return expandParsedStaffs(castGroupedNotationToPositions(groupedNotations, castInstructions))
}

// Re-derives a system's expanded `staffs` (the cache) and `kempli` from its canonical
// compact `groups`. Mutates and returns the system. No-op if the system has no groups
// (e.g. legacy/laras scores), so callers can apply it unconditionally.
//
// The compact `measures` are position-independent symbol strings; they are rebuilt into
// NoteObjects (bound to no position, exactly as the parser does) before running the
// shared cast -> expand -> pad -> flatten pipeline, so this reproduces the parser output.
export function expandSystem(system: System): System {
    if (!system.groups || system.groups.length === 0) return system
    const groupedNotations: GroupedNotation[] = system.groups.map((group) => ({
        positions: group.positions,
        staff: group.measures.map((measure) => {
            const objNotation = measure.map((symbol) => new NoteObject(symbol, undefined))
            return { notation: measure.slice(), objNotation } as Staff
        })
    }))
    const hasKempliStaff = system.groups.some((group) => group.positions.includes('KEMPLI'))
    const { staffs, colWidths } = expandGroupedNotation(groupedNotations, system.castingInstructions ?? [])
    system.kempli = deriveKempli(system.kempli, system.execution, colWidths, hasKempliStaff)
    system.staffs = staffs
    return system
}

// Derives the kempli state/frequency for a system from its execution items and the
// expanded column widths. Returns a new KempliSetting (does not mutate the input).
// `hasKempliStaff` must reflect whether the system has an explicit KEMPLI staff.
export function deriveKempli(
    current: KempliSetting,
    execution: ExecutionItem[] | undefined,
    colWidths: number[],
    hasKempliStaff: boolean
): KempliSetting {
    const kempli: KempliSetting = { ...current }
    kempli.state = 'on'
    if (execution) {
        const kempliItem: KempliItem = execution.find((exec) => exec.type == 'kempli') as KempliItem
        if (kempliItem) {
            if (kempliItem.value == 'off') kempli.state = 'off'
            if (kempliItem.value === 'double') kempli.frequency = kempli.frequency! / 2
        }
    }
    if (kempli.state != 'off') {
        if (colWidths.length == 0 || hasKempliStaff) {
            kempli.state = 'notation'
        } else {
            // Set kempli frequency if all measures have the same duration
            if (colWidths.every((w) => w == colWidths[0])) {
                kempli.frequency = colWidths.length > 0 ? colWidths[0] : 4
            }
        }
    }
    return kempli
}
