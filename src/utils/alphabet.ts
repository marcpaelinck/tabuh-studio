import _ from 'lodash'
import { ignoreChars, positionConfigs } from '../config/config'
import type { JsonSymbol } from '../models/types'

export const getValidSymbols = (position: string, includeSilences: boolean = false): string[] => {
    const valids = Object.keys(positionConfigs[position].symbolToNoteNames)
    if (includeSilences) valids.push.apply(valids, ['.', '-'])
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

export function notation2text(notation: JsonSymbol[] | undefined): string {
    if (notation) return notation.map((symbol) => symbol.s).join('')
    else return ''
}

export function parseNotationText(text: string, validRegExpCell: RegExp): string[] {
    const matches = text.matchAll(validRegExpCell)
    const notation = [...matches.map((el) => el[0])]
    if (text && notation.join('') != text) throw new Error(`invalid notation ${text}`)
    return notation
}
