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

import { NoteObject, SPACE_CHAR } from '@tabuhstudio/shared'
import _ from 'lodash'
import type { NoteSymbol, Position } from '../typing/basetypes.ts'
import type { System } from '../typing/score.ts'
import { getBeatSlices } from '../utils/objectUtils.ts'
import { castGroupedNotationToPositions } from './castingRulesManager.ts'
import { applyPatterns } from './patternManager.ts'

// Per-beat column widths counting each symbol (including a norot) as ONE column.
// Used on ALREADY-PADDED measures (e.g. after editing), where a norot's expansion
// spaces are present as explicit entries — so notationWidth would double-count them.
export function entryColWidths(measuresPerGroup: NoteObject[][][]): number[] {
    const widths: number[] = []
    for (const measures of measuresPerGroup) {
        measures.forEach((measure, beatIdx) => {
            widths[beatIdx] = Math.max(widths[beatIdx] ?? 0, measure.length)
        })
    }
    return widths
}

// Pads each measure (entry count) to its column width with spaces and concatenates.
// Use on measures that ALREADY contain a norot's padding spaces (e.g. after editing).
export function flattenCompact(measures: NoteObject[][], colWidths: number[]): NoteSymbol[] {
    return measures.flatMap((measure, beatIdx) => {
        const syms = measure.map((note) => (note.toString() || SPACE_CHAR) as NoteSymbol)
        const pad = Math.max(0, (colWidths[beatIdx] ?? syms.length) - syms.length)
        return [...syms, ...(Array(pad).fill(SPACE_CHAR) as NoteSymbol[])]
    })
}

// Splits a flat notation back into measures using the per-beat column widths.
export function splitFlat(notation: NoteSymbol[], colWidths: number[]): NoteSymbol[][] {
    if (colWidths.length === 0) return notation.length ? [notation.slice()] : []
    const measures: NoteSymbol[][] = []
    let offset = 0
    for (const width of colWidths) {
        measures.push(notation.slice(offset, offset + width))
        offset += width
    }
    if (offset < notation.length) measures.push(notation.slice(offset)) // trailing remainder, if any
    return measures
}

// Re-derives a system's expanded `staffs` (the cache) and `kempli` from its canonical
// compact `groups`. Mutates and returns the system. No-op if the system has no groups
// (e.g. legacy/laras scores), so callers can apply it unconditionally.
//
// The compact `measures` are position-independent symbol strings; they are rebuilt into
// NoteObjects (bound to no position, exactly as the parser does) before running the
// shared cast -> expand -> pad -> flatten pipeline, so this reproduces the parser output.
export function expandSystem(system: System): void {
    if (!system.groups || system.groups.length === 0) return
    system.staffs = castGroupedNotationToPositions(system, system.castingInstructions ?? [])
    const beatSlices = getBeatSlices(system)
    // Expand shorthand pattern symbols (e.g. norot) within each beat
    _.entries(system.staffs).forEach(([position, staff]) => {
        if (staff)
            system.staffs[position as Position] = applyPatterns({
                position: position as Position,
                staff,
                beatSlices,
                eatSpaces: true
            })
    })
}
