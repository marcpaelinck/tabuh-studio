import { ExternalTokenizer } from '@lezer/lr'
import * as fs from 'fs'
import { instrumentTags } from './config.js'
import { PositionLabel } from './tabuh.terms.js'

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

function readTsvFile(filePath: string): Record<string, string | string[]>[] {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter((line) => line.trim())
    const headers = lines[0].split('\t')

    return lines.slice(1).map((line) => {
        const values = line.split('\t')
        return Object.fromEntries(
            headers.map((header, i) => {
                let stringValue: string = values[i]
                let outputValue: string | string[] = ''
                if (['tag', 'addition'].includes(stringValue)) {
                    outputValue = stringValue.split('|').map((v) => v.trim())
                } else outputValue = stringValue
                return [header, outputValue]
            })
        )
    })
}

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
