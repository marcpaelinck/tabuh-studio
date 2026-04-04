// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import _ from 'lodash'
import type { DynamicsItem, ExecutionItem, Measure, Position, Score, Staffs, TempoItem } from '../typing/types.ts'
import { parser } from './grammars/tabuh/tabuh.ts'
import { tagLookup } from './notationUtils.ts'

type ValueType = 'IntegerValue' | 'StringValue' | 'DynamicsLiteral'
type ListType = 'IntegerList' | 'StringList'

// Returns a Score object
// Grammar: @top Document { InfoMetadataLine Gongan+ }
//          InfoMetadataLine {tab lbrace space* InfoMetadata rbrace Eol}
export function parseNotation(content: string): Score | undefined {
    const tree = parser.parse(content)

    const traverse = (node: SyntaxNode) => {
        var value = '--none--'
        if ('from' in node && 'to' in node) value = getText(node, content)

        switch (node.name) {
            case 'InfoMetadata': {
                console.log(`${node.name}: ${getText(node, content)}`)
                break
            }
            case 'Gongan': {
                // console.log(`${node.name}: ${value}`)
                const staffs: Staffs = getStaffs(node, content)
                const executionItems: ExecutionItem[] | undefined = getMetadata(node, content)
                console.log(`METADATA: ${JSON.stringify(executionItems)}`)
                console.log(`${node.name}: ${JSON.stringify(staffs)}`)
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
function unquote(str: string): string {
    const match = str.match(/^(["'])(.*)\1$/s)
    return match ? match[2] : str
}
// Returns the text that corresponds with the node
function getText(node: SyntaxNode | null, content: string): string {
    return unquote(node && 'from' in node ? content.slice(node.from, node.to) : '')
}

// Casts a string value to the js type that corresponds with the given ValueType.
// A ListType is passed if strValue is an element of a list.
function cast(strValue: string, type: ValueType | ListType) {
    var returnVal: string | number | undefined = undefined

    if (['StringValue', 'StringList', 'DynamicsLiteral'].includes(type)) returnVal = strValue
    else if (['IntegerValue', 'IntegerList'].includes(type)) {
        returnVal = Number.parseInt(strValue)
        if (Number.isNaN(returnVal)) returnVal = undefined
    }
    return returnVal
}

// Returns the value of the first child of node having the given ValueType as name.
function getValue<T>(node: SyntaxNode | null, type: ValueType, content: string): T | undefined {
    if (node) {
        const child = node.getChild(type)
        return cast(getText(child, content), type) as T
    }
    return undefined
}

// Returns the values of all childnodes of `node` having the given ValueType as name.
// If valueType is a ListType, a child of `node` with that name will be used as starting point
// instead of `node`.
// includeUndefined: if true, undefined values are included in the list.
function getValueList<T>(node: SyntaxNode | null, valueType: ValueType | ListType, content: string): T[] | undefined {
    if (!node) return undefined

    var returnList: (T | undefined)[] = []

    // If valueType is a ListType, find the node's child with that name.
    const listNode = valueType.endsWith('List') ? node.getChild(valueType) : node
    if (!listNode) return undefined

    if (listNode) {
        const children = node.getChildren(valueType)
        if (!children || children.length == 0) return undefined
        children.forEach((child) => {
            const value = cast(getText(child, content), valueType)
            if (value != undefined) returnList.push(cast(getText(child, content), valueType) as T)
        })
    }

    // Return undefined if the list is empty
    return returnList.length > 0 ? (returnList as T[]) : undefined
}

// GONGAN

// Creates a Staffs object from the given node's children
// Grammar: Gongan { EmptyLine+ (MetadataLine | StaffLine)+ }
//          StaffLine { PositionLabel Measure+ Eol }
//          Measure { tab Note* }
function getStaffs(gonganNode: SyntaxNode | null, content: string): Staffs {
    if (gonganNode == undefined) return {}
    const staffList: [Position, Measure[]][] = []
    const staffNodes = gonganNode.getChildren('StaveLine')
    for (const child of staffNodes) {
        var staff: Measure[] = []
        const positionTag = getText(child.getChild('PositionLabel'), content)
        const tags = positionTag.split('/')
        const positions = tags.reduce((aggr, tag) => aggr.concat(tagLookup[tag] || []), [] as Position[])
        var measureNodes = child.getChildren('Measure')
        for (const measureNode of measureNodes) {
            const measure: Measure = { notation: [] }
            var noteNode = measureNode.getChild('Note')
            while (noteNode) {
                measure.notation.push(getText(noteNode, content))
                noteNode = noteNode.nextSibling
            }
            staff.push(measure)
        }
        positions.forEach((position) => staffList.push([position, staff]))
    }
    return _.fromPairs(staffList)
}

// METADATA

// Returns a list of ExecutionItem objects for the given gongan node.
// Grammar: Gongan { EmptyLine+ (MetadataLine | StaveLine)+ }
//          MetadataLine {tab lbrace space* Metadata rbrace Eol}
function getMetadata(gonganNode: SyntaxNode | null, content: string): ExecutionItem[] | undefined {
    if (gonganNode == undefined) return undefined

    const itemList: ExecutionItem[] = []
    const metadataNodes = gonganNode.getChildren('MetadataLine')
    metadataNodes.forEach((child, index) => {
        const metaDataItem = child.getChild('Metadata')
        if (metaDataItem) {
            const item = parseMetadata(metaDataItem, index + 1, content)
            if (item) itemList.push(item)
        }
    })
    return itemList
}

// Grammar: Metadata { TempoMetadata |  DynamicsMetadata | ... }
function parseMetadata(metadataNode: SyntaxNode, seqNr: number, content: string): ExecutionItem | undefined {
    if (!metadataNode) return undefined
    const node = metadataNode.firstChild
    if (!node) return undefined

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
            const passParam = { passes: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content) }
            const loopParam = { loops: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content) }
            const cycle = getValue<number>(node.getChild('CycleParameter'), 'IntegerValue', content)
            const cycleParam = { nthpass: cycle ? true : undefined }
            const gradualAttr = { isGradual: values.isGradual || beatParam.isGradual }
            const returnValue: TempoItem = Object.assign(
                baseAttr,
                values,
                beatParam,
                passParam,
                loopParam,
                gradualAttr,
                cycleParam
            )
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
            const passParam = { passes: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content) }
            const loopParam = { loops: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content) }
            const cycle = getValue<number>(node.getChild('CycleParameter'), 'IntegerValue', content)
            const cycleParam = { nthpass: cycle ? true : undefined }
            // const positionParam = getPositionParameter(node, content)
            const gradualAttr = { isGradual: values.isGradual || beatParam.isGradual }
            const returnValue: DynamicsItem = Object.assign(
                baseAttr,
                values,
                beatParam,
                passParam,
                loopParam,
                gradualAttr,
                cycleParam
            )
            return returnValue
        }
        default: {
            console.log(`${node.name}: ${getText(node, content)}`)
        }
    }
    return undefined
}

interface GenericGradualValue {
    value: number | string | undefined
    fromValue: number | string | undefined
    isGradual: boolean
}
function getGradualValues(node: SyntaxNode | null, type: ValueType, content: string): GenericGradualValue {
    const returnVal: GenericGradualValue = { fromValue: undefined, value: undefined, isGradual: false }

    if (node && getText(node, content)) {
        var values: (number | string | undefined)[] | undefined = getValueList(node, type, content)
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
