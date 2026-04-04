import type { Position } from '../typing/types.ts'
import { instrumentTags } from './notationConfig.ts'

const separators = ['', ' ', '_']

function createTagLookup(tagTable: Array<Record<string, string | string[]>>): Record<string, Position[]> {
    const tagLookup: Record<string, Position[]> = {}
    tagTable.forEach((record) => {
        const tags = record['tag'] as string[]
        const additions = record['addition'] as string[]
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
