// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import fs from 'fs'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { dynamicsToNumber } from '../config/config.ts'
import type {
    DynamicsItem,
    DynamicsValue,
    ExecutionItem,
    ExecutionItemType,
    GotoItem,
    LoopItem,
    Measure,
    Position,
    Score,
    SequenceItem,
    Staffs,
    SuppressItem,
    System,
    TempoItem
} from '../typing/types.ts'
import { executionItemSeqId, executionItemTooltip } from '../utils/executionItems.ts'
import { scoreToFormattedJson } from '../utils/objectUtils.ts'
import { parser } from './grammars/tabuh/tabuh.ts'
import { tagLookup } from './notationUtils.ts'

type ValueType =
    | 'IntegerValue'
    | 'FloatValue'
    | 'StringValue'
    | 'BooleanValue'
    | 'DynamicsLiteral'
    | 'ExecutionValue'
    | 'OnOffValue'
    | 'ScopeValue'
    | 'GonganTypeValue'
type ListType = 'IntegerList' | 'StringList' | 'ExecutionList'

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

    const postProcessingInstructions: PostProcessing[] = []

    var gonganCounter = 0

    const traverse = (node: SyntaxNode) => {
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
                const systemuuid = uuidv4()
                const staffs = getStaffs(node, content)
                const metaData = getMetadata(node, systemuuid, content)
                const system = {
                    uuid: systemuuid,
                    id: gonganCounter,
                    index: gonganCounter - 1,
                    grouped: [],
                    staffs: staffs,
                    colWidths: getColwidths(staffs),
                    label: undefined,
                    execution: metaData.filter((item) => item.type == 'executionitem').map((item) => item.value)
                } as System
                metaData
                    .filter((item) => item.type == 'attribute')
                    .forEach((item) => {
                        const attributeOf: Attribute = item.value as Attribute
                        if (attributeOf.system) Object.assign(system, attributeOf.system)
                        if (attributeOf.score) Object.assign(score, attributeOf.score)
                    })
                postProcessingInstructions.push(
                    ...(metaData
                        .filter((item) => item.type == 'postprocessing')
                        .map((item) => item.value) as PostProcessing[])
                )
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

    // Postprocessing
    score.positions = getAllPositions(score)
    // TODO: Further postprocessing:
    // - in metadata: fill in targetuuid (GOTO, SEQUENCE)
    // - Process copy and autokempyung postProcessingInstructions

    doLogging(score, postProcessingInstructions)
    return score
}

function doLogging(score: Score, postProcessingInstructions: PostProcessing[]) {
    const json = scoreToFormattedJson(score)
    console.log(JSON.stringify(postProcessingInstructions))
    fs.writeFileSync('./src/scoreparsers/grammars/tabuh/parsed_score.json', json)
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
        case 'GonganTypeValue':
        case 'ScopeValue':
        default:
            return strValue as string
        case 'IntegerValue': {
            const intVal = Number.parseInt(strValue)
            return Number.isNaN(intVal) ? undefined : intVal
        }
        case 'FloatValue': {
            const intVal = Number.parseFloat(strValue)
            return Number.isNaN(intVal) ? undefined : intVal
        }
        case 'BooleanValue':
        case 'OnOffValue': {
            return ['true', 'on'].includes(strValue.toLowerCase())
                ? true
                : ['false', 'off'].includes(strValue.toLowerCase())
                  ? false
                  : undefined
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

// Converts a list of position tags to a list of Position values.
// Position tags are used at the start of each stave and in the `positions=` parameter of metadata items.
function tagsToPositions(tags: string[]): Position[] {
    return tags.reduce((aggr, tag) => aggr.concat(tagLookup[tag] || []), [] as Position[])
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
        const positions = tagsToPositions(positionTag.split('/'))
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

// Returns a list of ProcessingInstruction objects for the given gongan node.
// Grammar: Gongan { EmptyLine+ (MetadataLine | StaveLine)+ }
//          MetadataLine {tab lbrace space* Metadata rbrace Eol}
function getMetadata(gonganNode: SyntaxNode | null, systemuuid: string, content: string): ProcessingInstruction[] {
    const metaData: ProcessingInstruction[] = []
    if (gonganNode == undefined) return metaData

    const metadataNodes = gonganNode.getChildren('MetadataLine')
    metadataNodes.forEach((child, index) => {
        const metaDataItem = child.getChild('Metadata')
        if (metaDataItem) {
            const item = parseMetadata(metaDataItem, index + 1, systemuuid, content)
            if (item) metaData.push(item)
        }
    })
    return metaData
}

interface Attribute {
    score?: { parts: string[] }
    system?: { copyfrom: string } | { label: string }
}
interface PostProcessing {
    copy?: { label: string; targetuuid: string; include?: ExecutionItemType[] }
    autokempyung?: { apply: boolean; positions?: Position[]; scope?: 'score' | 'system' }
}
interface ProcessingInstruction {
    type: 'attribute' | 'executionitem' | 'postprocessing'
    value: ExecutionItem | Attribute | PostProcessing
}
// Metadata can contain Execution items, System/Score attributes or instructions for the postprocessing step.
// Grammar: Metadata { TempoMetadata |  DynamicsMetadata | ... }
function parseMetadata(
    metadataNode: SyntaxNode,
    seqNr: number,
    systemuuid: string,
    content: string
): ProcessingInstruction | undefined {
    if (!metadataNode) return undefined
    const node = metadataNode.firstChild
    if (!node) return undefined

    switch (node.name) {
        case 'AutokempyungMetadata': {
            const parameters = { apply: getValue<boolean>(node, 'OnOffValue', content) || false } // value might be undefined
            Object.assign(parameters, getMetadataParameters(node, ['positions', 'scope'], content))
            return { type: 'postprocessing', value: { autokempyung: parameters } } as ProcessingInstruction
        }
        case 'CopyMetadata': {
            const parameters = { label: getValue<string>(node, 'StringValue', content) }
            Object.assign(parameters, getMetadataParameters(node, ['include'], content))
            return {
                type: 'postprocessing',
                value: { copy: parameters, targetuuid: systemuuid }
            } as ProcessingInstruction
        }
        case 'DynamicsMetadata': {
            const baseAttr = { type: 'dynamics' }
            const value = getGradualValues(node.getChild('DynamicsValue'), 'DynamicsLiteral', content)
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
            const parameters = Object.assign(
                getGradualBeatsParameters(node, content),
                getMetadataParameters(node, ['passes', 'iterations', 'nthpass', 'positions'], content)
            )
            const gradualoverride = { isGradual: value.isGradual || parameters.isGradual }
            const item = Object.assign(baseAttr, dynamicsvalues, parameters, gradualoverride) as DynamicsItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'GonganMetadata': {
            const gongantype = getValue<string>(node, 'GonganTypeValue', content) || 'none'
            if (!['gineman', 'genderan', 'kebyar'].includes(gongantype.toLowerCase())) break
            const baseAttr = { type: 'suppress' }
            const value = { positions: ['KEMPLI'] as Position[] }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as SuppressItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'GotoMetadata': {
            const baseAttr = { type: 'goto' }
            const value = { targetname: getValue<string>(node, 'StringValue', content), targetuuid: '' }
            const parameters = getMetadataParameters(node, ['passes', 'nthpass'], content)
            const item = Object.assign(baseAttr, value, parameters) as GotoItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'KempliMetadata': {
            // Do nothing if value is ON (true)
            if (getValue<boolean>(node, 'OnOffValue', content)) break
            const baseAttr = { type: 'suppress' }
            const value = { positions: ['KEMPLI'] as Position[] }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as SuppressItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'LabelMetadata': {
            const item: Attribute = { system: { label: getValue<string>(node, 'StringValue', content) as string } }
            return { type: 'attribute', value: item } as ProcessingInstruction
        }
        case 'LoopMetadata': {
            const baseAttr = { type: 'loop' }
            const value = { count: getValue<number>(node, 'IntegerValue', content) }
            const parameters = getMetadataParameters(node, ['passes', 'nthpass'], content)
            const item = Object.assign(baseAttr, value, parameters) as LoopItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'SequenceMetadata': {
            const baseAttr = { type: 'sequence', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const value = { labels: getValueList<string>(node, 'StringList', content), uuids: [] }
            const item = Object.assign(baseAttr, value) as SequenceItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'SuppressMetadata': {
            const baseAttr = { type: 'suppress' }
            const value = { positions: getValueList<string>(node, 'StringList', content) }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as SuppressItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'TempoMetadata': {
            const baseAttr = { type: 'tempo' }
            const valueNode = node.getChild('TempoValue')
            const value = getGradualValues(valueNode, 'IntegerValue', content)
            if (value.value == undefined) {
                console.error('No values found for gradual TEMPO value')
                return undefined
            }
            const parameters = Object.assign(
                getGradualBeatsParameters(node, content),
                getMetadataParameters(node, ['passes', 'nthpass', 'iterations'], content)
            )
            const gradualoverride = { isGradual: value.isGradual || parameters.isGradual }
            const item = Object.assign(baseAttr, value, parameters, gradualoverride) as TempoItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'WaitMetadata': {
            const baseAttr = { type: 'wait' }
            const value = { count: getValue<number>(node, 'FloatValue', content) }
            const parameters = getMetadataParameters(node, ['passes', 'nthpass'], content)
            const item = Object.assign(baseAttr, value, parameters) as LoopItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        default: {
            console.log(`${node.name}: ${getText(node, content)}`)
        }
    }
    return undefined
}

// Returns the requested parameters of a metadata item
// metadatanode: root node of the metadata item
// paramList: list of parameter names. Each parameter will be returned as a pair `paramName`: `paramvalue`
function getMetadataParameters(metadatanode: SyntaxNode, paramList: string[], content: string): Record<string, any> {
    const parameters: Record<string, string> = {}
    for (const paramName of paramList) {
        var param: any
        switch (paramName) {
            case 'beats':
                param = { beats: getValueList<number>(metadatanode.getChild('BeatsParameter'), 'IntegerList', content) }
                break
            case 'include':
                param = {
                    include: getValueList<string>(
                        metadatanode.getChild('IncludeExecutionTypesParameter'),
                        'ExecutionList',
                        content
                    )
                }
                break
            case 'iterations':
                param = {
                    iterations: getValueList<number>(
                        metadatanode.getChild('IterationsParameter'),
                        'IntegerList',
                        content
                    )
                }
                break
            case 'loops':
                param = { loops: getValueList<number>(metadatanode.getChild('LoopsParameter'), 'IntegerList', content) }
                break
            case 'nthpass':
                param = {
                    nthpass: getValue<boolean>(metadatanode.getChild('NthpassParameter'), 'BooleanValue', content)
                }
                break
            case 'passes':
                param = {
                    passes: getValueList<number>(metadatanode.getChild('PassesParameter'), 'IntegerList', content)
                }
                break
            case 'positions':
                const posTags = getValueList<string>(metadatanode.getChild('PositionsParameter'), 'StringList', content)
                const positions = posTags ? tagsToPositions(posTags) : undefined
                param = { positions: positions }
                break
            case 'scope':
                param = {
                    scope: getValue<string>(
                        metadatanode.getChild('ScopeParameter'),
                        'ScopeValue',
                        content
                    )?.toLowerCase()
                }
                break
            case 'score':
                param = {
                    scope: getValue<string>(
                        metadatanode.getChild('ScopeParameter'),
                        'ScopeValue',
                        content
                    )?.toLowerCase()
                }
                break
        }
        Object.assign(parameters, param)
    }
    return parameters
}

function updateSeqAndTooltips(item: ExecutionItem) {
    item.seqId = executionItemSeqId(item)
    item.tooltip = executionItemTooltip(item, 'long')
    item.tooltipshort = executionItemTooltip(item, 'short')
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

interface BeatsParameter {
    fromSection: number | undefined
    section: number
    isGradual: boolean
}
// Grammar definition:
// BeatsParameter { ("beat=" | "beats=") IntegerValue (Arrow IntegerValue)?}
function getGradualBeatsParameters(node: SyntaxNode, content: string): BeatsParameter {
    const values = getGradualValues(node.getChild('BeatsParameter'), 'IntegerValue', content)
    const param: BeatsParameter = {
        fromSection: values.fromValue as number,
        section: (values.value as number) || 1,
        isGradual: values.isGradual
    }
    return param
}
