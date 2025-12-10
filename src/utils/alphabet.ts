import { positionConfigs } from '../config/config'

export const getValidSymbols = (position: string, includeSilences: boolean = false): string[] => {
    const valids = Object.keys(positionConfigs[position].symbolToNoteNames)
    if (includeSilences) valids.push.apply(valids, ['.', '-'])
    return valids
}
