// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import type { EditorScore } from '../typing/types.ts'
import { parser } from './grammars/tabuh/tabuh.ts'

export function parseNotation(content: string): EditorScore | undefined {
    const tree = parser.parse(content)
    // console.log(tree)

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
    // let currentSystem: EditorSystem | null = null

    const getText = (node: SyntaxNode | null): string =>
        node && 'from' in node ? content.slice(node.from, node.to) : '-?-'
    const cleanString = (str: string): string => str.slice(1, -1)
    const cleanCode = (str: string): string => str.slice(1, -1)
    var currTempo: number = 60

    const traverse = (node: SyntaxNode) => {
        var value = '--none--'
        if ('from' in node && 'to' in node) value = getText(node)
        switch (node.name) {
            case '⚠':
            case 'Notation':
            case 'PositionLabel':
            case 'Measure':
            case 'Note':
            case 'MLEol':
            case 'SLEol':
            case 'Eol':
            case 'MetadataLine':
            case 'Metadata':
                // case 'StaveLine':
                break
            case 'StaveLine': {
                var staveArr: string[][] = []
                const position = getText(node.getChild('PositionLabel'))
                var measureNodes = node.getChildren('Measure')
                for (const measureNode of measureNodes) {
                    var measureArray: string[] = []
                    staveArr.push(measureArray)
                    var noteNode = measureNode.getChild('Note')
                    while (noteNode) {
                        measureArray.push(getText(noteNode))
                        noteNode = noteNode.nextSibling
                    }
                }
                const stave = _.fromPairs([[position, staveArr]])
                console.log(`${node.name}: ${JSON.stringify(stave)}`)
                break
            }
            default: {
                console.log(`${node.name}: ${value}`)
            }
        }
        // switch (node.name) {
        //     case 'MetadataValue': {
        //         const name = getText(node.getChild('Name')!).toLowerCase()
        //         const value = cleanString(getText(node.getChild('String')!))
        //         if (name === 'title') score.title = value
        //         if (name === 'composer') score.composer = value
        //         console.log(`TITLE=${score.title}, COMPOSER=${score.composer}`)
        //         break
        //     }
        //     case 'Syste
        // Header': {
        //         const title = cleanString(getText(node.getChild('String')!))
        //         const found = title.match(/(?<partname>[^\[]+) \[\d+\]/)
        //         const partname =
        //             found && found.groups && 'partname' in found.groups ? found.groups['partname'] : undefined
        //         currTempo = parseInt(getText(node.getChild('Number')!))
        //         currentSystem = {
        //             uuid: uuidv4(),
        //             id: score.systems.length + 1,
        //             index: score.systems.length,
        //             grouped: [],
        //             staffs: {},
        //             colWidths: []
        //         }
        //         console.log(`SYSTEM=${JSON.stringify(currentSystem)}`)
        //         score.systems.push(currentSystem)
        //         if (partname) {
        //             if (!(partname in score.parts)) score.parts['partname'] = [partname]
        //             else score.parts['partname'].push(partname)
        //         }
        //         break
        //     }
        //     case 'SectionData': {
        //         if (!currentSystem) return
        //         const label = getText(node.getChild('Name')!)
        //         const positions: Position[] = label in labelToPosition ? labelToPosition[label] : []
        //         const measureData: EditorMeasure[] = [{ notation: [cleanCode(getText(node.getChild('Code')!))] }]
        //         positions.forEach((pos) => (currentSystem!.staffs[pos] = measureData))
        //         console.log(`MEASURE=${JSON.stringify(measureData)}`)
        //         break
        //     }
        // }

        let child = node.firstChild
        while (child) {
            traverse(child)
            child = child.nextSibling
        }
    }

    traverse(tree.topNode)

    return undefined
}
