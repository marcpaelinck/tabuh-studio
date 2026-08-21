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

/**
 * The orchestra's full position set arranged by `custom` order (positions only). Any custom entry
 * that isn't part of the orchestra is dropped; any orchestra position missing from `custom` is
 * appended in the system-default order. With no/empty `custom`, returns the system default order.
 */
export function orderedPositions(orchestra: Orchestra | undefined | null, custom?: Position[] | null): Position[] {
    const all = orchestraPositions(orchestra)
    if (!custom || custom.length === 0) return all
    const allSet = new Set(all)
    const seen = new Set<Position>()
    const ordered: Position[] = []
    for (const p of custom) if (allSet.has(p) && !seen.has(p)) (seen.add(p), ordered.push(p))
    for (const p of all) if (!seen.has(p)) ordered.push(p)
    return ordered
}

/**
 * Sort items carrying a `positions` list (e.g. a system's notation groups) by a position `order`.
 * A group's rank is the lowest rank among its positions, so a group follows its earliest position.
 * Stable: items with equal rank keep their relative order.
 */
export function sortByPositionOrder<T extends { positions: Position[] }>(items: T[], order: Position[]): T[] {
    const rank = new Map(order.map((p, i) => [p, i] as const))
    const groupRank = (positions: Position[]) =>
        positions.length ? Math.min(...positions.map((p) => rank.get(p) ?? Number.MAX_SAFE_INTEGER)) : Number.MAX_SAFE_INTEGER
    return [...items].sort((a, b) => groupRank(a.positions) - groupRank(b.positions))
}
