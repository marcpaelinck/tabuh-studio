// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import _ from 'lodash'
import type { DynamicsItem, ExecutionItem, Score, TempoItem } from '../typing/types.ts'
import { parser } from './grammars/tabuh/tabuh.ts'

export function parseNotation(content: string): Score | undefined {
    const tree = parser.parse(content)

    const traverse = (node: SyntaxNode) => {
        var value = '--none--'
        if ('from' in node && 'to' in node) value = getText(node, content)
        const executionItems: ExecutionItem[] = []

        switch (node.name) {
            case 'Metadata': {
                var metachild = node.firstChild
                var seqNr = 1
                while (metachild) {
                    const item = parseMetadata(metachild, seqNr, content)
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
                const position = getText(node.getChild('PositionLabel'), content)
                var measureNodes = node.getChildren('Measure')
                for (const measureNode of measureNodes) {
                    var measureArray: string[] = []
                    staveArr.push(measureArray)
                    var noteNode = measureNode.getChild('Note')
                    while (noteNode) {
                        measureArray.push(getText(noteNode, content))
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

// AUXILIARY FUNCTIONS

function getText(node: SyntaxNode | null, content: string): string {
    return node && 'from' in node ? content.slice(node.from, node.to) : ''
}

// METADATA

function parseMetadata(node: SyntaxNode, seqNr: number, content: string): ExecutionItem | undefined {
    switch (node.name) {
        case 'TempoMetadata': {
            const baseAttr = { type: 'tempo', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const valueNode = node.getChild('TempoValue')
            const values = getGradualValues(valueNode, 'IntegerValue', content)
            if (values.value == undefined) {
                console.error('No values found for gradual TEMPO value')
                return undefined
            }
            const beatParam = getBeatParameter(node, content)
            const passParam = getPassParameter(node, content)
            const loopParam = getLoopParameter(node, content)
            const gradualAttr = { isGradual: values.isGradual || beatParam.isGradual }
            const returnValue: TempoItem = Object.assign(baseAttr, values, beatParam, passParam, loopParam, gradualAttr)
            return returnValue
        }
        case 'DynamicsMetadata': {
            const baseAttr = { type: 'dynamics', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const valueNode = node.getChild('DynamicsValue')
            const values = getGradualValues(valueNode, 'DynamicsLiteral', content)
            if (values.value == undefined) {
                console.error('No values found for gradual DYNAMICS value')
                return undefined
            }
            const beatParam = getBeatParameter(node, content)
            const passParam = getPassParameter(node, content)
            const loopParam = getLoopParameter(node, content)
            // const positionParam = getPositionParameter(node, content)
            const gradualAttr = { isGradual: values.isGradual || beatParam.isGradual }
            const returnValue: DynamicsItem = Object.assign(
                baseAttr,
                values,
                beatParam,
                passParam,
                loopParam,
                gradualAttr
            )
            return returnValue
        }
        default: {
            console.log(`${node.name}: ${getText(node, content)}`)
        }
    }
    return undefined
}

// Generic functions

function cast(strValue: string, type: ValueType) {
    var returnVal: string | number | undefined = undefined

    if (type == 'StringValue' || type == 'DynamicsLiteral') returnVal = strValue
    else if (type == 'IntegerValue') {
        returnVal = Number.parseInt(strValue)
        if (Number.isNaN(returnVal)) returnVal = undefined
    }
    return returnVal
}

function getValue(node: SyntaxNode | null, type: ValueType, content: string): string | number | undefined {
    if (node) {
        const child = node.getChild(type)
        return cast(getText(child, content), type)
    }
    return undefined
}

function getValues(
    node: SyntaxNode | null,
    type: ValueType,
    keepUndefined: boolean,
    content: string
): (string | number | undefined)[] | undefined {
    const returnList: (string | number | undefined)[] = []
    if (node) {
        const children = node.getChildren(type)
        if (!children || children.length == 0) return undefined
        children.forEach((child) => {
            const value = cast(getText(child, content), type)
            if (keepUndefined || value != undefined) returnList.push(cast(getText(child, content), type))
        })
    }
    return returnList
}

type ValueType = 'IntegerValue' | 'StringValue' | 'DynamicsLiteral'
interface GenericGradualValue {
    value: number | string | undefined
    fromValue: number | string | undefined
    isGradual: boolean
}
function getGradualValues(node: SyntaxNode | null, type: ValueType, content: string): GenericGradualValue {
    const returnVal: GenericGradualValue = { fromValue: undefined, value: undefined, isGradual: false }

    if (node && getText(node, content)) {
        var values: (number | string | undefined)[] | undefined = getValues(node, type, false, content)
        if (!values || values.length == 0) return returnVal
        const arrow = getText(node.getChild('Arrow'), content) || undefined
        const gradual = arrow != undefined && arrow != ''

        if (values.length == 2) [returnVal.fromValue, returnVal.value] = [values[0], values[1]]
        else if (values.length == 1) returnVal.value = values[0]

        returnVal.isGradual = gradual
    }
    return returnVal
}

// Parameters

interface BeatParameter {
    fromSection: number | undefined
    section: number
    isGradual: boolean
}
// Grammar definition:
// BeatParameter { ("beat=" | "beats=") IntegerValue (Arrow IntegerValue)?}
function getBeatParameter(node: SyntaxNode, content: string): BeatParameter {
    const values = getGradualValues(node.getChild('BeatParameter'), 'IntegerValue', content)
    const param: BeatParameter = {
        fromSection: values.fromValue as number,
        section: (values.value as number) || 1,
        isGradual: values.isGradual
    }
    return param
}

// Grammar definition:
// PassParameter { ("pass=" | "passes=") (IntegerValue | "[" IntegerValue ("," " "? IntegerValue)* "]")}
interface PassParameter {
    passes: number[] | undefined
}
function getPassParameter(node: SyntaxNode, content: string): PassParameter {
    const values = getValues(node.getChild('PassParameter'), 'IntegerValue', false, content) as number[]
    const param: PassParameter = { passes: values && values.length > 0 ? values : undefined }
    return param
}

// Grammar definition:
// LoopParameter { ("loop=" | "loops=") (IntegerValue | "[" IntegerValue ("," " "? IntegerValue)* "]")}
interface LoopParameter {
    loops: number[] | undefined
}
function getLoopParameter(node: SyntaxNode, content: string): LoopParameter {
    const values = getValues(node.getChild('LoopParameter'), 'IntegerValue', false, content) as number[]
    const param: LoopParameter = { loops: values && values.length > 0 ? values : undefined }
    return param
}
