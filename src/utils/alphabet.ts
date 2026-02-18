import _ from 'lodash'
import { ExtensionChars, ignoreChars, MutingChars, positionConfigs } from '../config/config'
import type { NoteSymbol, Position } from '../models/types'

export const getValidSymbols = (
    position: Position,
    includeSilences: boolean = false,
    includePatterns: boolean = false
): string[] => {
    const valids = _.concat(
        Object.keys(positionConfigs[position].symbolToNoteNames),
        includePatterns ? positionConfigs[position].validPatterns : [],
        includeSilences ? _.concat(MutingChars, ExtensionChars) : []
    )
    return valids
}

// Remove chars that should be ignored. See remark in configs.ts
export const cleanSymbol = (symbol: string) => ignoreChars.reduce((sym, char) => sym.replace(char, ''), symbol)

type RegExpDict = Record<string, string>
// Return values:
// regExp: regular expression for all valid symbols
// regExpByLength: regular expressions for valid symbols, grouped by symbol length
// keystrokes: list of unique individual chars occurring in valid symbols
export function getValids(validSymbols: string[]): [RegExp, RegExpDict, string[]] {
    const lengths = [...new Set(validSymbols.map((sym) => sym.length))]
    const regexpEntries: [number, string][] = lengths.map((len) => [
        len,
        validSymbols
            .filter((sym) => sym.length == len || len == 0)
            .map((sym) => _.escapeRegExp(sym))
            .join('|')
    ])
    const regExpByLength: RegExpDict = Object.fromEntries(regexpEntries.filter(([key, _]) => key > 0))
    const regExp: RegExp = RegExp(validSymbols.map((sym) => _.escapeRegExp(sym)).join('|'))
    const keystrokes = [...new Set(validSymbols.join(''))] // set of unique characters
    return [regExp, regExpByLength, keystrokes]
}

type ValidsReturnValues = {
    validRegExpSymbol: RegExp
    validRegExpCell: RegExp
    validKeystrokes: string[]
    validRegExpByLength: Record<string, string>
}
// Return values:
// validRegExpSymbol: regular expression for all valid symbols
// validRegExpCell: regular expression to parse an entire cell into valid symbols
// validRegExpByLength: regular expressions for valid symbols, grouped by symbol length
// validKeystrokes: list of unique individual chars occurring in valid symbols
export function symbolValidationUtils(validSymbols: string[]): ValidsReturnValues {
    const lengths = [...new Set(validSymbols.map((sym) => sym.length))]
    const regexpEntries: [number, string][] = lengths.map((len) => [
        len,
        validSymbols
            .filter((sym) => sym.length == len || len == 0)
            .map((sym) => _.escapeRegExp(sym))
            .join('|')
    ])
    const validRegExpByLength: Record<string, string> = Object.fromEntries(regexpEntries.filter(([key, _]) => key > 0))
    // RegExp to match any valid symbol. The RegExp will match symbol containing the most characters first.
    const strExpr = validSymbols
        .sort((sym1, sym2) => sym2.length - sym1.length)
        .map((sym) => _.escapeRegExp(sym))
        .join('|')
    const validRegExpSymbol: RegExp = RegExp(strExpr)
    // const validRegExpCell: RegExp = RegExp('^(' + strExpr + ')*$', 'g')
    const validRegExpCell: RegExp = RegExp(strExpr, 'g')
    const validKeystrokes = [...new Set(validSymbols.join(''))] // set of unique characters
    return { validRegExpSymbol, validRegExpCell, validRegExpByLength, validKeystrokes }
}

export function notation2text(notation: string[] | undefined): string {
    if (notation) return notation.map((symbol) => symbol).join('')
    else return ''
}

export function parseNotationText(text: string, validRegExpCell: RegExp): string[] {
    const matches = text.matchAll(validRegExpCell)
    const notation = [...matches.map((el) => el[0])]
    if (text && notation.join('') != text) throw new Error(`invalid notation ${text}`)
    return notation
}

export function sortNotes(values: NoteSymbol[], ascending: boolean = true) {
    const order = ['i,', 'o,', 'e,', 'u,', 'a,', 'i', 'o', 'e', 'u', 'a', 'i>', 'o>', 'e>', 'u>', 'a>']
    const compare = (n1: string, n2: string) => {
        n1 = n1.length == 1 ? n1 : n1[1] in [',', '<'] ? n1.slice(0, 2) : n1[0]
        n2 = n1.length == 1 ? n2 : n2[1] in [',', '<'] ? n2.slice(0, 2) : n2[0]
        if (!(n1 in order && n2 in order)) return 0
        return ascending ? order.indexOf(n1) - order.indexOf(n2) : order.indexOf(n2) - order.indexOf(n1)
    }
    return values.sort(compare)
}

export function noteRange(position: Position, invert: boolean = false) {
    const range = _.keys(positionConfigs[position].symbolToNoteNames).filter((sym) => /^[aeiou][,<]{0,1}$/.test(sym))
    return sortNotes(range)
}
