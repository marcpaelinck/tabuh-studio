import type { Position } from '../typing/types.ts'
import { instrumentTags } from './notationConfig.ts'

const separators = ['', ' ', '_', '-'] // Separators

function createTagLookup(tagTable: Array<Record<string, string | string[]>>): Record<string, Position[]> {
    const tagLookup: Record<string, Position[]> = {}
    tagTable.forEach((record) => {
        const tags = record['pos_tag'] as string[]
        const additions = record['specification_tag'] as string[]
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
