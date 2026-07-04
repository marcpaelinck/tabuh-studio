import type { Position } from '../typing/basetypes.ts'
import type { ExecutionItem, KempliItem } from '../typing/execution.ts'
import type { KempliSetting } from '../typing/score.ts'
import { instrumentTags, separators } from './tabuhConfig.ts'

function createTagLookup(tagTable: Array<Record<string, string | string[]>>): Record<string, Position[]> {
    const tagLookup: Record<string, Position[]> = {}
    tagTable.forEach((record) => {
        const tags = record['instr_tag'] as string[]
        const additions = record['pos_tag'] as string[]
        const positions = record['positions'] as Position[]
        tags.forEach((tag) =>
            additions.forEach((add) =>
                separators.forEach((sep) => {
                    tagLookup[tag + sep + add] = positions
                })
            )
        )
    })
    return tagLookup
}

export const tagLookup: Record<string, Position[]> = createTagLookup(instrumentTags)

// Returns the number of lines contained in `str` up to `position`.
export function lineNr(str: string, position: number): number {
    return str.slice(0, position).split(String.fromCharCode(13)).length
}

// Determines if the columns have different widths.
function varying(colWidths: number[]): boolean {
    return Math.max(...colWidths) != Math.min(...colWidths)
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
        if (colWidths.length == 0 || varying(colWidths) || hasKempliStaff) {
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
