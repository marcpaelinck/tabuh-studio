import _ from 'lodash'
import { ignoreChars, positionConfigs } from '../config/config'

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
