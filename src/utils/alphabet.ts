import { ignoreChars, positionConfigs } from '../config/config'

export const getValidSymbols = (position: string, includeSilences: boolean = false): string[] => {
    const valids = Object.keys(positionConfigs[position].symbolToNoteNames)
    if (includeSilences) valids.push.apply(valids, ['.', '-'])
    return valids
}

// Remove chars that should be ignored. See remark in configs.ts
export const cleanSymbol = (symbol: string) => ignoreChars.reduce((sym, char) => sym.replace(char, ''), symbol)
