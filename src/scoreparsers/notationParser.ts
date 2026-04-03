// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import _ from 'lodash'
import type { ExecutionItem, Score } from '../typing/types.ts'
import { parser } from './grammars/tabuh/tabuh.ts'

export function parseNotation(content: string): Score | undefined {
    const tree = parser.parse(content)

    const getText = (node: SyntaxNode | null): string =>
        node && 'from' in node ? content.slice(node.from, node.to) : ''
    const cleanString = (str: string): string => str.slice(1, -1)
    const cleanCode = (str: string): string => str.slice(1, -1)
    var currTempo: number = 60

    function parseMetadata(node: SyntaxNode, seqNr: number): ExecutionItem | undefined {
        switch (node.name) {
            case 'TempoMetadata': {
                const value = node.getChild('TempoValue')
                var fromValue, toValue: number | undefined
                var arrow: string | undefined
                if (value && getText(value)) {
                    fromValue = Number.parseInt(getText(value.getChild('FromValue'))) || undefined
                    arrow = getText(value.getChild('Arrow')) || undefined
                    toValue = Number.parseInt(getText(value.getChild('ToValue'))) || undefined
                } else {
                    // ERROR
                }
                const beatParameter = node.getChild('BeatParameter')
                var fromSection,
                    toSection: number | undefined = undefined,
                    undefined
                if (beatParameter && getText(beatParameter)) {
                    fromSection = Number.parseInt(getText(beatParameter.getChild('FromSection'))) || undefined
                    arrow = arrow || getText(beatParameter.getChild('Arrow')) || undefined
                    toSection = Number.parseInt(getText(beatParameter.getChild('FromSection'))) || undefined
                }
                const passParameter = node.getChild('PassParameter')
                const passes = []
                if (passParameter) {
                    const passNumbers = passParameter.getChildren('PassNumbers')
                    for (const passNumber of passNumbers) {
                        const pass = Number.parseInt(getText(passNumber))
                        if (pass) passes.push(pass)
                    }
                }
                const loopParameter = node.getChild('LoopParameter')
                const loops = []
                if (loopParameter) {
                    const loopNumbers = loopParameter.getChildren('LoopNumbers')
                    for (const loopNumber of loopNumbers) {
                        const loop = Number.parseInt(getText(loopNumber))
                        if (loop) loops.push(loop)
                    }
                }
                if (toValue == undefined) {
                    return undefined
                }
                return {
                    type: 'tempo',
                    seqId: seqNr,
                    fromValue: fromValue,
                    toValue: toValue,
                    isGradual: arrow != undefined,
                    toSection: toSection || 1,
                    tooltip: '',
                    tooltipshort: '',
                    passes: passes.length ? passes : undefined,
                    iterations: loops.length ? loops : undefined
                }
            }
            default: {
                console.log(`${node.name}: ${getText(node)}`)
            }
        }
        return undefined
    }

    const traverse = (node: SyntaxNode) => {
        var value = '--none--'
        if ('from' in node && 'to' in node) value = getText(node)
        switch (node.name) {
            case 'Metadata': {
                const executionItems: ExecutionItem[] = []
                var metachild = node.firstChild
                var seqNr = 1
                while (metachild) {
                    const item = parseMetadata(metachild, seqNr)
                    if (item) {
                        executionItems.push(item)
                        seqNr++
                    }
                    metachild = metachild.nextSibling
                }
                if (executionItems.length > 0) console.log(`Metadata: ${JSON.stringify(executionItems)}`)
                break
            }
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
            case 'Gongan': {
                console.log(`${node.name}: ${value}`)
                break
            }
            default:
        }

        let child = node.firstChild
        while (child) {
            traverse(child)
            child = child.nextSibling
        }
    }

    traverse(tree.topNode)

    return undefined
}
