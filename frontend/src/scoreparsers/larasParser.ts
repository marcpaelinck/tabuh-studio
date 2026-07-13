// Parser for imported scores with Laras formatting.

import type { SyntaxNode } from '@lezer/common'
import { KEMPLI_BEAT_CHAR, SILENCE_EXTENDING_CHARS, SPACE_CHAR, type Position } from '@tabuhstudio/shared'
import { SILENCE_CHARS } from '@tabuhstudio/shared/constants/noteChars'
import type { NoteSymbol } from '@tabuhstudio/shared/types/basetypes'
import { v4 as uuidv4 } from 'uuid'
import type { BeatSliceInfo, TempoItem } from '../typing/execution'
import type { ParserReturnValue } from '../typing/parsers'
import type { KempliSetting, Score, System } from '../typing/score'
import { getBeatSlicesFromKempliNotation } from '../utils/objectUtils'
import { labelToPosition, symbolLookup } from './grammars/laras/config'
import { parser } from './grammars/laras/laras'

function parseNotation(position: Position, stave: string): NoteSymbol[] {
    var notation: string[] = []
    for (const char of stave) {
        notation.push(symbolLookup[position][char] || SPACE_CHAR)
    }
    return notation
}

// Detects whether there is a kempli beat and whether it is regular
function detectKempliSetting(kempliNotation: NoteSymbol[], beatSlices: BeatSliceInfo[]): KempliSetting {
    const allowed = [KEMPLI_BEAT_CHAR].concat([...SILENCE_CHARS])
    // State remains notation if kempli contains non-beat symbols
    if (!kempliNotation.every((sym) => allowed.includes(sym))) return { state: 'notation' }
    // State is 'off' if no beat is detected
    if (!kempliNotation.some((sym) => sym == KEMPLI_BEAT_CHAR)) return { state: 'off', frequency: 4 }
    else {
        // Detect a regular beat
        const beatLengths = new Set(beatSlices.map((slice) => slice.end - slice.start))
        if (beatLengths.size == 1) {
            return { state: 'on', frequency: [...beatLengths][0] }
        } else {
            return { state: 'notation' }
        }
    }
}

function postProcess(score: Score): Score {
    // Assign score.position
    score.systems.forEach((system: System) => {
        system.groups.forEach((group) => {
            group.positions.forEach((position) => {
                if (!score.positions.includes(position)) score.positions.push(position as Position)
            })
        })
    })

    // Remove empty staffs
    score.systems.forEach((system: System) => {
        system.groups = system.groups.filter((group) =>
            group.notation.some((symbol) => !SILENCE_EXTENDING_CHARS.has(symbol))
        )
    })

    // Set kempli to 'on' or 'off' if possible. In that case, remove the kempli staff.
    score.systems.forEach((system: System) => {
        const kempliNotation: NoteSymbol[] =
            system.groups.find((group) => group.positions.includes('KEMPLI'))?.notation || ([] as NoteSymbol[])
        system.beatSlices = getBeatSlicesFromKempliNotation(kempliNotation, kempliNotation.length)
        system.kempli = detectKempliSetting(kempliNotation, system.beatSlices)
        if (['on', 'off'].includes(system.kempli.state))
            // Remove kempli staff
            system.groups = system.groups.filter((group) => !group.positions.includes('KEMPLI'))
    })

    return score
}

export function parseLaras(content: string): ParserReturnValue {
    const tree = parser.parse(content)

    const score: Score = {
        uuid: uuidv4(),
        title: '',
        composer: '',
        instrumenttype: 'GONG_KEBYAR',
        systems: [],
        positions: [],
        parts: {}
    }
    let currentSystem: System | null = null

    const getText = (node: SyntaxNode): string => content.slice(node.from, node.to)
    const cleanString = (str: string): string => str.slice(1, -1)
    const cleanCode = (str: string): string => str.slice(1, -1)
    var currTempo: number = 60

    const traverse = (node: SyntaxNode) => {
        switch (node.name) {
            case 'MetadataValue': {
                const name = getText(node.getChild('Name')!).toLowerCase()
                const value = cleanString(getText(node.getChild('String')!))
                if (name === 'title') score.title = value
                if (name === 'composer') score.composer = value
                break
            }
            case 'SystemHeader': {
                const title = cleanString(getText(node.getChild('String')!))
                const found = title.match(/(?<partname>[^\[]+) \[\d+\]/)
                const partname =
                    found && found.groups && 'partname' in found.groups ? found.groups['partname'] : undefined
                currTempo = parseInt(getText(node.getChild('Number')!))
                currentSystem = {
                    uuid: uuidv4(),
                    id: score.systems.length + 1,
                    index: score.systems.length,
                    groups: [],
                    staffs: {},
                    beatSlices: [],
                    kempli: { state: 'notation' },
                    execution: [
                        {
                            type: 'tempo',
                            isGradual: false,
                            fromBeat: 1,
                            value: currTempo,
                            seqId: 1,
                            tooltip: `tempo ${currTempo} BPM beat 1`,
                            tooltipshort: `${currTempo} BPM`
                        } as TempoItem
                    ]
                }
                score.systems.push(currentSystem!)
                if (partname) {
                    if (!(partname in score.parts)) score.parts['partname'] = [partname]
                    else score.parts['partname'].push(partname)
                }
                break
            }
            case 'SectionData': {
                if (!currentSystem) return
                const label = getText(node.getChild('Name')!)
                const positions: Position[] = label in labelToPosition ? labelToPosition[label] : []
                const larasNotation: string = cleanCode(getText(node.getChild('Code')!))
                const notation = parseNotation(positions[0], larasNotation)
                currentSystem.groups.push({ id: uuidv4(), positions, notation })
                break
            }
        }

        let child = node.firstChild
        while (child) {
            traverse(child)
            child = child.nextSibling
        }
    }

    traverse(tree.topNode)
    const finalScore = postProcess(score)
    return { score: finalScore, errors: [], postProcessing: [], tree }
}
