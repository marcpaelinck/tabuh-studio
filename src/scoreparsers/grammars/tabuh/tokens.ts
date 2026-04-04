import { ExternalTokenizer } from '@lezer/lr'
import { instrumentTags } from '../../notationConfig.ts'
import { PositionLabel } from './tabuh.terms.ts'

type Position =
    | 'CALUNG'
    | 'CENGCENG'
    | 'GANGSA'
    | 'GANGSA_POLOS'
    | 'GANGSA_SANGSIH'
    | 'GONGS'
    | 'JEGOGAN'
    | 'KANTILAN_POLOS'
    | 'KANTILAN_SANGSIH'
    | 'KANTILAN'
    | 'KEMPLI'
    | 'KENDANG'
    | 'KENDANG_LANANG'
    | 'KENDANG_WADON'
    | 'PEMADE_POLOS'
    | 'PEMADE_SANGSIH'
    | 'PEMADE'
    | 'PENYACAH'
    | 'REYONG_1'
    | 'REYONG_2'
    | 'REYONG_3'
    | 'REYONG_4'
    | 'REYONG_12'
    | 'REYONG_13'
    | 'REYONG_23'
    | 'REYONG_24'
    | 'REYONG'
    | 'UGAL'

const separators = ['', ' ', '_']
const newLine = 10,
    carriageReturn = 13,
    tab = 9,
    slash = 47

function createTagLookup(tagTable: Array<Record<string, string | string[]>>) {
    const tagLookup: Record<string, string> = {}
    tagTable.forEach((record) => {
        const tags = record['tag'] as string[]
        const additions = record['addition'] as string[]
        const position = record['position'] as string
        tags.forEach((tag) =>
            additions.forEach((add) =>
                separators.forEach((sep) => {
                    tagLookup[tag + sep + add] = position
                })
            )
        )
    })
    return tagLookup
}

// const instrumentTags = readTsvFile('./instrumenttags.tsv')
const tagLookup = createTagLookup(instrumentTags)
const validTags = Object.keys(tagLookup)

const stopChars = [newLine, carriageReturn, tab]

// A PositionLabel is returned if it matches an element of validTags
// or multiple validTags elements separated by slash characters.
export const positionLabel = new ExternalTokenizer((input) => {
    var tag = ''
    for (let i = 0; i < 10 && !stopChars.includes(input.next); i++) {
        if (input.next == slash) {
            tag = ''
        } else tag += String.fromCharCode(input.next)
        if (!validTags.some((tag) => tag.startsWith(tag))) {
            return
        }
        input.advance()
    }
    if (input.next != tab) {
        return
    }
    input.acceptToken(PositionLabel)
})
