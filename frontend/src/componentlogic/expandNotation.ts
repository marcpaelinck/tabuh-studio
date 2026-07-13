// Compact -> expanded notation pipeline.
//
// `expandSystem` re-derives a system's expanded per-position `staffs` (the cache),
// its `beatSlices`, and its kempli from the canonical compact `groups`:
//
//   castGroupedNotationToPositions  (casting rules, flat)
//   -> getBeatSlices                 (beat boundaries from kempli / notation)
//   -> applyPatterns                 (shorthand expansion, e.g. norot, with space-eating)
//
// Both the parser and the live editor call this so they produce identical output.

import type { Position } from '@tabuhstudio/shared'
import _ from 'lodash'
import type { System } from '../typing/score.ts'
import { getBeatSlices } from '../utils/objectUtils.ts'
import { castGroupedNotationToPositions } from './castingRulesManager.ts'
import { applyPatterns } from './patternManager.ts'

// Re-derives a system's expanded `staffs`, `beatSlices` and `kempli` from its canonical
// compact `groups`. Mutates the system in place. No-op if it has no groups (e.g.
// legacy/laras scores), so callers can apply it unconditionally.
export function expandSystem(system: System): void {
    if (!system.groups || system.groups.length === 0) return
    system.staffs = castGroupedNotationToPositions(system, system.castingInstructions ?? [])
    const beatSlices = getBeatSlices(system)
    system.beatSlices = beatSlices
    // Expand shorthand pattern symbols (e.g. norot) within each beat.
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
