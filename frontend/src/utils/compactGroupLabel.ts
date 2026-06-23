// Produces a short label and a full tooltip for a compact notation group.
//
// MVP heuristic (proper tag-based labels — e.g. "ga/ugal", "reyong13" — and the
// list of *valid* combinations come in Step 4 of the dual-editor work):
//   - exact match of an instrument's position set  -> that instrument's name (e.g. "Pemade")
//   - a single position                            -> its position name
//   - otherwise                                    -> first name + " +N"
// The tooltip always lists every position's full name.

import { instrumentConfigs, positionConfigs } from '../config/config'
import type { Position } from '../typing/basetypes'

function sameSet(a: Position[], b: Position[]): boolean {
    if (a.length !== b.length) return false
    const setB = new Set(b)
    return a.every((p) => setB.has(p))
}

export function compactGroupLabel(positions: Position[]): { label: string; tooltip: string } {
    const names = positions.map((p) => positionConfigs[p]?.name ?? p)
    const tooltip = names.join(', ')

    if (positions.length === 0) return { label: '(empty)', tooltip: '' }

    const instrument = Object.values(instrumentConfigs).find((cfg) =>
        sameSet(cfg.positions as Position[], positions)
    )
    if (instrument) return { label: instrument.name, tooltip }

    if (positions.length === 1) return { label: names[0], tooltip }

    return { label: `${names[0]} +${positions.length - 1}`, tooltip }
}
