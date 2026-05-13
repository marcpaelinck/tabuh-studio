import type { Position } from '../typing/instruments.ts'
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
