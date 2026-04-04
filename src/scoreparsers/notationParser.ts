// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { dynamicsToNumber } from '../config/config.ts'
import type {
    DynamicsItem,
    DynamicsValue,
    ExecutionItem,
    GotoItem,
    LoopItem,
    Measure,
    Position,
    Score,
    SequenceItem,
    Staffs,
    System,
    TempoItem
} from '../typing/types.ts'
import { parser } from './grammars/tabuh/tabuh.ts'
import { tagLookup } from './notationUtils.ts'

type ValueType = 'IntegerValue' | 'FloatValue' | 'StringValue' | 'BooleanValue' | 'DynamicsLiteral'
type ListType = 'IntegerList' | 'StringList'

// Returns a Score object
// Grammar: @top Document { InfoMetadataLine Gongan+ }
//          InfoMetadataLine {tab lbrace space* InfoMetadata rbrace Eol}
export function parseNotation(content: string): Score | undefined {
    const tree = parser.parse(content)

    const score = {
        uuid: uuidv4(),
        title: '',
        composer: '',
        instrumenttype: '',
        parts: {},
        positions: [],
        systems: [],
        hasCycle: false
    } as Score

    var gonganCounter = 0

    const traverse = (node: SyntaxNode) => {
        var value = '--none--'
        if ('from' in node && 'to' in node) value = getText(node, content)

        switch (node.name) {
            case 'InfoMetadata': {
                const scoreSettings = {
                    title: getValue<string>(node.getChild('TitleParameter'), 'StringValue', content),
                    composer: getValue<string>(node.getChild('ComposerParameter'), 'StringValue', content),
                    instrumenttype: getValue<string>(node.getChild('InstrumentGroupParameter'), 'StringValue', content)
                }
                Object.assign(score, scoreSettings)
                break
            }
            case 'Gongan': {
                gonganCounter++
                const staffs = getStaffs(node, content)
                const metaData = getMetadata(node, content)
                const system = {
                    uuid: uuidv4(),
                    id: gonganCounter,
                    index: gonganCounter - 1,
                    grouped: [],
                    staffs: staffs,
                    colWidths: getColwidths(staffs),
                    label: undefined,
                    execution: metaData.execution
                } as System
                metaData.systemattr.forEach((attribute) => (system[attribute.attribute] = attribute.value as string))
                score.systems.push(system)
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
    score.positions = getAllPositions(score)
    doLogging(score)
    // TODO: in metadata: set tooltip, tooltipshort, targetuuid (GOTO)
    return score
}

function doLogging(score: Score) {
    score.systems.forEach((sys) => {
        console.log(`label: ${sys.label}`)
        sys.execution?.forEach((exec) => console.log(JSON.stringify(exec)))
    })
}
/********************
 AUXILIARY FUNCTIONS
********************/

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
function cast(strValue: string, type: ValueType) {
    switch (type) {
        case 'StringValue':
        case 'DynamicsLiteral':
        default:
            return strValue as string
        case 'IntegerValue':
        case 'FloatValue': {
            const intVal = Number.parseInt(strValue)
            return Number.isNaN(intVal) ? undefined : intVal
        }
        case 'BooleanValue': {
            return strValue.toLowerCase() == 'true' ? true : strValue.toLowerCase() == 'true' ? false : undefined
        }
    }
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
    var listNode: SyntaxNode | null
    var elementType: ValueType
    if (valueType.endsWith('List')) {
        listNode = node.getChild(valueType)
        elementType = valueType.replace('List', 'Value') as ValueType
    } else {
        listNode = node
        elementType = valueType as ValueType
    }
    if (!listNode) return undefined

    if (listNode) {
        const children = listNode.getChildren(elementType)
        if (!children || children.length == 0) return undefined
        children.forEach((child) => {
            const value = cast(getText(child, content), elementType)
            if (value != undefined) returnList.push(cast(getText(child, content), elementType) as T)
        })
    }

    // Return undefined if the list is empty
    return returnList.length > 0 ? (returnList as T[]) : undefined
}

/***********
   GONGAN   
***********/

// Creates a Staffs object from the given node's children
// Grammar: Gongan { EmptyLine+ (MetadataLine | StaffLine)+ }
//          StaffLine { PositionLabel Measure+ Eol }
//          Measure { tab Note* }
function getStaffs(gonganNode: SyntaxNode | null, content: string): Staffs {
    if (gonganNode == undefined) return {}
    const staffList: [Position, Measure[]][] = []
    const staffNodes = gonganNode.getChildren('StaffLine')
    for (const child of staffNodes) {
        var staff: Measure[] = []
        const positionTag = getText(child.getChild('PositionLabel'), content)
        const tags = positionTag.split('/')
        const positions = tags.reduce((aggr, tag) => aggr.concat(tagLookup[tag] || []), [] as Position[])
        const measureNodes = child.getChildren('Measure')
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

// Returns the maximum width of vertically aligned sections.
function getColwidths(staffs: Staffs) {
    const colWidths = _.values(staffs).reduce((aggr: number[] | undefined, measures: (Measure | undefined)[]) => {
        const widths = measures.map((measure: Measure | undefined) => (measure ? measure.notation.length : 0))
        if (widths) {
            if (aggr)
                return _.zip(aggr, widths).map(([el1, el2]) =>
                    el1 && el2 ? Math.max(el1, el2) : el1 ? el1 : el2 ? el2 : 0
                )
        }
        return widths
    }, undefined)
    return colWidths
}

function getAllPositions(score: Score): Position[] {
    const positionSet = score.systems.reduce((aggr, system) => aggr.union(new Set(_.keys(system.staffs))), new Set())
    return Array.from(positionSet) as Position[]
}

/***********
  METADATA 
***********/

// Returns a list of ExecutionItem objects for the given gongan node.
// Grammar: Gongan { EmptyLine+ (MetadataLine | StaveLine)+ }
//          MetadataLine {tab lbrace space* Metadata rbrace Eol}
function getMetadata(
    gonganNode: SyntaxNode | null,
    content: string
): { execution: ExecutionItem[]; systemattr: SystemAttribute[]; scoreattr: ScoreAttribute[] } {
    const metaData = {
        execution: [] as ExecutionItem[],
        systemattr: [] as SystemAttribute[],
        scoreattr: [] as ScoreAttribute[]
    }
    if (gonganNode == undefined) return metaData

    const metadataNodes = gonganNode.getChildren('MetadataLine')
    metadataNodes.forEach((child, index) => {
        const metaDataItem = child.getChild('Metadata')
        if (metaDataItem) {
            const item = parseMetadata(metaDataItem, index + 1, content)
            if (item) {
                if ('attribute' in item) {
                    if (item.parent == 'system') metaData.systemattr.push(item)
                    else if (item.parent == 'score') metaData.scoreattr.push(item)
                } else metaData.execution.push(item as unknown as ExecutionItem)
            }
        }
    })
    return metaData
}

interface ScoreAttribute {
    attribute: 'part'
    parent: 'score'
    value: string
}
interface SystemAttribute {
    attribute: 'label'
    parent: 'system'
    value: boolean | string
}
// Metadata can contain Execution items, System attributes and Score attributes (part info)
// Grammar: Metadata { TempoMetadata |  DynamicsMetadata | ... }
function parseMetadata(
    metadataNode: SyntaxNode,
    seqNr: number,
    content: string
): ScoreAttribute | SystemAttribute | ExecutionItem | undefined {
    if (!metadataNode) return undefined
    const node = metadataNode.firstChild
    if (!node) return undefined

    switch (node.name) {
        case 'DynamicsMetadata': {
            const baseAttr = { type: 'dynamics', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const valueNode = node.getChild('DynamicsValue')
            const value = getGradualValues(valueNode, 'DynamicsLiteral', content)
            const dynamicsvalues = {
                dynamics: value.value,
                fromDynamics: value.fromValue,
                value: dynamicsToNumber[value.value as DynamicsValue],
                fromValue: value.fromValue ? dynamicsToNumber[value.fromValue as DynamicsValue] : undefined,
                isGradual: value.isGradual
            }
            if (value.value == undefined) {
                console.error('No values found for gradual DYNAMICS value')
                return undefined
            }
            const parameters = Object.assign(getBeatParameters(node, content), {
                passes: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content),
                loops: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content),
                nthpass: getValue<boolean>(node.getChild('NthpassParameter'), 'BooleanValue', content),
                positions: getValueList<string>(node.getChild('PositionParameter'), 'StringList', content)
            })
            const gradualoverride = { isGradual: value.isGradual || parameters.isGradual }
            return Object.assign(baseAttr, dynamicsvalues, parameters, gradualoverride) as DynamicsItem
        }
        case 'GotoMetadata': {
            const baseAttr = { type: 'goto', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const value = {
                targetname: getValue<string>(node, 'StringValue', content),
                targetuuid: '' // Will be determined later
            }
            const parameters = {
                passes: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content),
                nthpass: getValue<boolean>(node.getChild('NthpassParameter'), 'BooleanValue', content)
            }
            return Object.assign(baseAttr, value, parameters) as GotoItem
        }
        case 'LabelMetadata': {
            return {
                attribute: 'label',
                parent: 'system',
                value: getValue<string>(node, 'StringValue', content)
            } as SystemAttribute
        }
        case 'LoopMetadata': {
            const baseAttr = { type: 'loop', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const value = { count: getValue<number>(node, 'IntegerValue', content) }
            const parameters = {
                passes: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content),
                nthpass: getValue<boolean>(node.getChild('NthpassParameter'), 'BooleanValue', content)
            }
            return Object.assign(baseAttr, value, parameters) as LoopItem
        }
        case 'TempoMetadata': {
            const baseAttr = { type: 'tempo', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const valueNode = node.getChild('TempoValue')
            const value = getGradualValues(valueNode, 'IntegerValue', content)
            if (value.value == undefined) {
                console.error('No values found for gradual TEMPO value')
                return undefined
            }
            const parameters = Object.assign(getBeatParameters(node, content), {
                passes: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content),
                loops: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content),
                nthpass: getValue<boolean>(node.getChild('NthpassParameter'), 'BooleanValue', content)
                    ? true
                    : undefined
            })
            const gradualoverride = { isGradual: value.isGradual || parameters.isGradual }
            return Object.assign(baseAttr, value, parameters, gradualoverride) as TempoItem
        }
        case 'SequenceMetadata': {
            const baseAttr = { type: 'sequence', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const value = { labels: getValueList<string>(node, 'StringList', content), uuids: [] }
            return Object.assign(baseAttr, value) as SequenceItem
        }
        case 'WaitMetadata': {
            const baseAttr = { type: 'wait', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const value = { count: getValue<number>(node, 'IntegerValue', content) }
            const parameters = {
                passes: getValueList<number>(node.getChild('PassParameter'), 'IntegerList', content),
                nthpass: getValue<boolean>(node.getChild('NthpassParameter'), 'BooleanValue', content)
            }
            return Object.assign(baseAttr, value, parameters) as LoopItem
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

/***********
 PARAMETERS
***********/

interface BeatParameter {
    fromSection: number | undefined
    section: number
    isGradual: boolean
}
// Grammar definition:
// BeatParameter { ("beat=" | "beats=") IntegerValue (Arrow IntegerValue)?}
function getBeatParameters(node: SyntaxNode, content: string): BeatParameter {
    const values = getGradualValues(node.getChild('BeatParameter'), 'IntegerValue', content)
    const param: BeatParameter = {
        fromSection: values.fromValue as number,
        section: (values.value as number) || 1,
        isGradual: values.isGradual
    }
    return param
}
