// Parser for imported scores with Laras formatting.

import type { SyntaxNode } from '@lezer/common'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import type { Position } from '../typing/basetypes'
import type { TempoItem } from '../typing/execution'
import type { ParserReturnValue } from '../typing/parsers'
import type { Measure, Score, System } from '../typing/score'
import { labelToPosition, symbolLookup } from './grammars/laras/config'
import { parser } from './grammars/laras/laras'

function parseStave(position: Position, stave: string): Measure[] {
    var tabuhNotation: string[] = []
    for (const char of stave) {
        tabuhNotation.push(symbolLookup[position][char] || '-')
    }
    return [{ notation: tabuhNotation }]
}

function postProcess(score: Score): Score {
    score.systems.forEach((system: System) => {
        _.keys(system.staffs).forEach((pos) => {
            if (!score.positions.includes(pos as Position)) score.positions.push(pos as Position)
        })
        system.colWidths = [Object.values(system.staffs)[0][0].notation.length]
    })

    // Add missing positions
    score.systems.forEach((system: System) => {
        score.positions.forEach((pos) => {
            if (!(pos in system.staffs)) {
                const newStaff: Measure[] = _.cloneDeep(_.values(system.staffs)[0])
                newStaff.forEach((measure) => (measure.notation = measure.notation.map(() => '-')))
                system.staffs[pos] = newStaff
            }
        })
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
                    editorGroup: [],
                    staffs: {},
                    colWidths: [],
                    execution: [
                        {
                            type: 'tempo',
                            section: 1,
                            value: currTempo,
                            seqId: 1,
                            tooltip: `tempo ${currTempo} BPM beat 1`,
                            tooltipshort: `${currTempo} BPM`
                        } as TempoItem
                    ]
                }
                score.systems.push(currentSystem)
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
                const notation: string = cleanCode(getText(node.getChild('Code')!))
                const measureData: Measure[] = parseStave(positions[0], notation)
                positions.forEach((pos) => (currentSystem!.staffs[pos] = measureData))
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

    const processedScore = postProcess(score)

    const returnValue: ParserReturnValue = { score, errors: [], postProcessing: [], tree }

    return returnValue
}
