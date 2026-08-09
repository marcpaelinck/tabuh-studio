// Produces a short label and a full tooltip for a compact notation group.
//
// The label greedily covers the group's position set with the largest matching
// `positionGroups` entries and renders each covered piece (plus any leftover single
// positions) via `positionGroups` name, joined with '/'. E.g. GANGSA + UGAL -> "ga/ug",
// REYONG_1 + REYONG_3 -> "rey13". The tooltip always lists every position's full name.

import type { Position, PositionGroup } from '@tabuhstudio/shared'
import { positionConfigs, positionGroups } from '@tabuhstudio/shared/config/position'

type PositionGroupKey = keyof typeof positionGroups

export function compactGroupLabel(
    positions: Position[],
    positionGrouping: Record<PositionGroupKey, Position[]> | null,
    toLower: boolean = false
): { label: string; tooltip: string } {
    const groupEntries = (positionGrouping ? Object.entries(positionGrouping) : []) as [PositionGroupKey, Position[]][]
    const names = positions.map((p) => positionConfigs[p]?.name ?? p)
    const tooltip = names.join(', ')
    if (positions.length === 0) return { label: '(empty)', tooltip: '' }

    const covered = new Array(positions.length).fill(false)
    const parts: { abbr: string; firstIdx: number }[] = []

    // Cover with named position groups, largest first, so e.g. GANGSA wins over PEMADE.
    for (const [key, members] of [...groupEntries].sort((a, b) => b[1].length - a[1].length)) {
        const indices = members.map((m) => positions.indexOf(m))
        const fullyPresent = indices.every((i) => i >= 0 && !covered[i])
        if (!fullyPresent) continue
        indices.forEach((i) => (covered[i] = true))
        parts.push({ abbr: positionGroups[key]?.name ?? key, firstIdx: Math.min(...indices) })
    }

    // Leftover single positions.
    positions.forEach((p, i) => {
        if (!covered[i])
            parts.push({ abbr: positionGroups[p as PositionGroup]?.name ?? positionConfigs[p]?.name ?? p, firstIdx: i })
    })

    parts.sort((a, b) => a.firstIdx - b.firstIdx)
    return { label: parts.map((x) => (toLower ? x.abbr.toLowerCase() : x.abbr)).join('/'), tooltip }
}
