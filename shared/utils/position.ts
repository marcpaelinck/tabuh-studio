import { instrumentConfigs, orchestraConfigs } from '../config/position'
import type { Orchestra, Position } from '../types/position'

/**
 * @param orchestra
 * @returns a list of all positions belonging to the given orchestra
 */
export function orchestraPositions(orchestra: Orchestra | undefined | null): Position[] {
    if (!orchestra) return []
    return Array.from(
        new Set(orchestraConfigs[orchestra].instruments.map((instr) => instrumentConfigs[instr].positions).flat())
    )
}
