// Parser for imported scores with Laras formatting.

import type { SyntaxNode } from '@lezer/common'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import type { EditorMeasure, EditorScore, EditorSystem, Position, TempoItem } from '../typing/types'
import { labelToPosition, symbolLookup } from './grammars/laras/config'
import { parser } from './grammars/laras/laras'

function parseStave(position: Position, stave: string): EditorMeasure[] {
    var tabuhNotation: string[] = []
    for (const char of stave) {
        tabuhNotation.push(symbolLookup[position][char] || '-')
    }
    return [{ notation: tabuhNotation }]
}

function postProcess(score: EditorScore): EditorScore {
    score.systems.forEach((system: EditorSystem) => {
        _.keys(system.staffs).forEach((pos) => {
            if (!score.positions.includes(pos as Position)) score.positions.push(pos as Position)
        })
        system.colWidths = [Object.values(system.staffs)[0][0].notation.length]
    })

    // Add missing positions
    score.systems.forEach((system: EditorSystem) => {
        score.positions.forEach((pos) => {
            if (!(pos in system.staffs)) {
                const newStaff: EditorMeasure[] = _.cloneDeep(_.values(system.staffs)[0])
                newStaff.forEach((measure) => (measure.notation = measure.notation.map(() => '-')))
                system.staffs[pos] = newStaff
            }
        })
    })

    return score
}

export function parseLaras(content: string): EditorScore | undefined {
    const tree = parser.parse(content)
    console.log(tree)

    const score: EditorScore = {
        uuid: uuidv4(),
        title: '',
        composer: '',
        instrumenttype: 'GONG_KEBYAR',
        systems: [],
        positions: [],
        parts: {},
        hasCycle: false
    }
    let currentSystem: EditorSystem | null = null

    const getText = (node: SyntaxNode): string => content.slice(node.from, node.to)
    const cleanString = (str: string): string => str.slice(1, -1)
    const cleanCode = (str: string): string => str.slice(1, -1)
    var currTempo: number = 60

    const traverse = (node: SyntaxNode) => {
        console.log(`NAME: ${node.name}`)
        switch (node.name) {
            case 'MetadataValue': {
                const name = getText(node.getChild('Name')!).toLowerCase()
                const value = cleanString(getText(node.getChild('String')!))
                if (name === 'title') score.title = value
                if (name === 'composer') score.composer = value
                console.log(`TITLE=${score.title}, COMPOSER=${score.composer}`)
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
                    grouped: [],
                    staffs: {},
                    colWidths: [],
                    execution: [
                        {
                            type: 'tempo',
                            toSection: 1,
                            toValue: currTempo,
                            seqId: 1,
                            tooltip: `tempo ${currTempo} BPM beat 1`,
                            tooltipshort: `${currTempo} BPM`
                        } as TempoItem
                    ]
                }
                console.log(`SYSTEM=${JSON.stringify(currentSystem)}`)
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
                const measureData: EditorMeasure[] = parseStave(positions[0], notation)
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
    console.log(processedScore)

    return processedScore
}
