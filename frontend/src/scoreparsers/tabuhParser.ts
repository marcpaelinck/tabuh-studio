// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import { KEMPLI_BEAT_CHAR, NoteObject, SPACE_CHAR, type Position } from '@tabuhstudio/shared'
import type { NoteSymbol, UUID } from '@tabuhstudio/shared/types/basetypes.ts'
import type { InstrumentGroup } from '@tabuhstudio/shared/types/position'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { type CastingInstruction } from '../componentlogic/castingRulesManager.ts'
import { notationWidth } from '../componentlogic/patternManager.ts'
import { dynamicsToNumber } from '../config/config.ts'
import type {
    DynamicsItem,
    DynamicsValue,
    ExecutionItem,
    GotoItem,
    KempliItem,
    KempliValue,
    LoopItem,
    SequenceItem,
    SuppressItem,
    TempoItem,
    WaitItem
} from '../typing/execution.ts'
import type { Attribute, ParserReturnValue, PostProcessing, ProcessingInstruction } from '../typing/parsers.ts'
import type { GroupedNotation, Score, System } from '../typing/score.ts'
import { debug } from '../utils/debugger.ts'
import { executionItemSeqId, executionItemTooltip } from '../utils/executionItems.ts'
import { parser } from './grammars/tabuh/tabuh.ts'
import { deriveKempli, lineNr, tagLookup } from './tabuhUtils.ts'

type ValueType =
    | 'BooleanValue'
    | 'FloatValue'
    | 'IntegerValue'
    | 'StringValue'
    | 'DynamicsLiteral'
    | 'ExecutionValue'
    | 'GonganTypeValue'
    | 'KempliValue'
    | 'OnOffValue'
    | 'ScopeValue'
type ListType = 'IntegerList' | 'StringList' | 'ExecutiontypeList'

// The following interfaces are used to keep the measure information
// for the postprocessing step.
interface ScoreByMeasure extends Omit<Score, 'systems'> {
    systems: SystemByMeasure[]
}
interface SystemByMeasure extends Omit<System, 'groups'> {
    groups: GroupedNotationByMeasure[]
}
export interface GroupedNotationByMeasure extends Omit<GroupedNotation, 'notation'> {
    notation: NoteSymbol[][]
}

// Returns a Score object
// Grammar: @top Document { InfoMetadataLine Gongan+ }
//          InfoMetadataLine {tab lbrace space* InfoMetadata rbrace Eol}
export function parseNotation(content: string): ParserReturnValue {
    const tree = parser.parse(content)

    const errors: string[] = []

    const scoreByMeasure = {
        uuid: '',
        title: '',
        composer: '',
        instrumenttype: 'UNDEFINED',
        positions: [],
        systems: []
    } as ScoreByMeasure

    const postProcessing: PostProcessing[] = []

    var gonganCounter = 0

    const traverse = (node: SyntaxNode) => {
        switch (node.name) {
            case 'InfoMetadata': {
                const scoreSettings = {
                    uuid: getValue<string>(node.getChild('UuidParameter'), 'StringValue', content) ?? uuidv4(),
                    title: getValue<string>(node.getChild('TitleParameter'), 'StringValue', content),
                    composer: getValue<string>(node.getChild('ComposerParameter'), 'StringValue', content) || '',
                    instrumenttype: getValue<string>(node.getChild('InstrumentgroupParameter'), 'StringValue', content)
                }
                if (scoreSettings.title == undefined) errors.push('INFO: Missing or incorrectly formatted title')
                if (scoreSettings.instrumenttype == undefined)
                    errors.push('INFO: Missing or incorrectly formatted instrumenttype')
                Object.assign(scoreByMeasure, scoreSettings)
                break
            }
            case 'Gongan': {
                gonganCounter++
                const systemuuid = uuidv4()
                const metaData = getMetadata(node, gonganCounter, systemuuid, scoreByMeasure.instrumenttype, content)
                const notationByMeasure: GroupedNotationByMeasure[] = getNotationByMeasure(node, content)
                const systemByMeasure: SystemByMeasure = {
                    uuid: systemuuid,
                    id: gonganCounter,
                    index: gonganCounter - 1,
                    line: lineNr(content, node.from),
                    groups: notationByMeasure,
                    staffs: {},
                    kempli: { state: 'on' },
                    label: undefined,
                    execution: metaData.filter((item) => item.type == 'executionitem').map((item) => item.value)
                } as SystemByMeasure
                metaData
                    .filter((item) => item.type == 'attribute')
                    .forEach((item) => {
                        const attributeOf: Attribute = item.value as Attribute
                        if (attributeOf.system) Object.assign(systemByMeasure, attributeOf.system)
                        if (attributeOf.score) Object.assign(scoreByMeasure, attributeOf.score)
                    })
                postProcessing.push(
                    ...(metaData
                        .filter((item) => item.type == 'postprocessing')
                        .map((item) => item.value) as PostProcessing[])
                )

                scoreByMeasure.systems.push(systemByMeasure)
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

    const score: Score = postProcess(scoreByMeasure, postProcessing)

    return { score, errors, postProcessing, tree }
}

/********************
 POSTPROCESSING
********************/

function addKempliNotationByMeasure(system: SystemByMeasure, colWidths: number[]) {
    debug(`system ${system.id}, colwidths=${JSON.stringify(colWidths)}`)
    const notation: string[][] = colWidths.map((w) => [KEMPLI_BEAT_CHAR].concat(_.fill(Array(w - 1), SPACE_CHAR)))
    system.groups.push({ id: uuidv4(), positions: ['KEMPLI'], notation })
}

function postProcess(scoreByMeasure: ScoreByMeasure, postProcessingInstructions: PostProcessing[]): Score {
    scoreByMeasure.positions = getAllPositions(scoreByMeasure)

    // fill in targetuuid of GOTO
    for (const system of scoreByMeasure.systems) {
        const gotoItems: GotoItem[] = (system.execution?.filter((item) => item.type == 'goto') || []) as GotoItem[]
        for (const gotoItem of gotoItems) {
            const target: SystemByMeasure | undefined = getSystemByLabel(
                gotoItem.targetname,
                scoreByMeasure,
                system.id,
                'GOTO'
            ) as SystemByMeasure | undefined
            if (target) gotoItem.targetuuid = target.uuid
        }
    }

    // fill in uuids of SEQUENCE
    for (const system of scoreByMeasure.systems) {
        const seqItems: SequenceItem[] = (system.execution?.filter((item) => item.type == 'sequence') ||
            []) as SequenceItem[]
        for (const seqItem of seqItems) {
            for (const label of seqItem.labels) {
                const target: SystemByMeasure | undefined = getSystemByLabel(
                    label,
                    scoreByMeasure,
                    system.id,
                    'SEQUENCE'
                ) as SystemByMeasure | undefined
                if (target) seqItem.uuids.push(target.uuid)
            }
        }
    }

    // Process COPY postProcessingInstructions
    const copyInstructions: PostProcessing[] =
        postProcessingInstructions.filter((instr) => instr.copy != undefined) || []
    for (const instr of copyInstructions) {
        const copyInstr = instr.copy!
        const target: SystemByMeasure | undefined = getSystemByUuid(
            copyInstr.targetuuid,
            scoreByMeasure,
            copyInstr.targetid,
            'COPY'
        ) as SystemByMeasure | undefined
        const source: SystemByMeasure | undefined = getSystemByLabel(
            copyInstr.label,
            scoreByMeasure,
            copyInstr.targetid,
            'COPY'
        ) as SystemByMeasure | undefined
        if (source && target) {
            // Remove positions from source that are in target
            const targetPositions = new Set(target.groups.map((group) => group.positions).flat())
            const sourceGroupsToCopy = source.groups
                .map((group) => {
                    return {
                        id: uuidv4(),
                        positions: group.positions.filter((pos) => !targetPositions.has(pos)),
                        notation: group.notation
                    }
                })
                .filter((group) => group.positions.length)
            // Merge selected source groups with target
            target.groups = sourceGroupsToCopy.concat(target.groups)
            // COPY is not yet represented in the canonical `groups` store. Mark the target
            // so the groups-based re-derivation (expandSystem) is skipped on load and the
            // cached staffs are used instead. COPY-at-group-level is a planned follow-up.
            target.copyFrom = source.label
            target.copyFromUuid = source.uuid
            // Also copy the kempli state
            target.kempli = source.kempli
            debug(`INCLUDE source=${source.label ?? source.id} include=${JSON.stringify(copyInstr.include ?? [])}`)
            if (copyInstr.include && source.execution) {
                const copyItems: ExecutionItem[] = source.execution.filter((item) =>
                    copyInstr.include!.includes(item.type)
                )
                target.execution = target.execution || []
                target.execution.push(...copyItems)
            }
        }
    }

    // Ensure that all measures in the same beat have the same length by padding them with space symbols.
    scoreByMeasure.systems.forEach((system) => {
        debug(`system ${system.id}`)
        const columnWidths = getColumnWidths(system.groups)
        system.groups = PadMeasures(system.groups, columnWidths)
    })

    // Set the kempli state ('on', 'notation' or 'off').
    // 'notation' is selected if the beats vary in length. In that case, add a kempli staff if missing.
    for (const system of scoreByMeasure.systems) {
        const hasKempliNotation = system.groups.some((group) => group.positions.includes('KEMPLI'))
        const colWidths = system.groups[0].notation.map((measure) => measure.length)
        system.kempli = deriveKempli(system.kempli, system.execution, colWidths, hasKempliNotation)
        // ensure that there is a kempli staff if the kempli state is 'notation'.
        if (system.kempli.state == 'notation' && !hasKempliNotation) addKempliNotationByMeasure(system, colWidths)
    }

    // Finally, flatten the notation from measure based to system based
    const flattenedSystems: System[] = scoreByMeasure.systems.map(
        (system) =>
            _.assign(system, {
                groups: system.groups.map(
                    (group) => _.assign(group, { notation: group.notation.flat() as NoteSymbol[] }) as GroupedNotation
                ) as GroupedNotation[]
            }) as System
    )
    const score: Score = _.assign(scoreByMeasure, { systems: flattenedSystems as System[] })

    return score as Score
}

function getAllPositions(score: Score | ScoreByMeasure): Position[] {
    const positionSet = score.systems.reduce(
        (aggr, system) => aggr.union(new Set(system.groups.map((group) => group.positions).flat())),
        new Set()
    )
    return Array.from(positionSet) as Position[]
}

// Returns the system with the given label.
// sourceId and metaItem are given to specify potential error message.
function getSystemByLabel(
    label: string,
    score: Score | ScoreByMeasure,
    sourceId: number,
    metaItem: string
): System | SystemByMeasure | undefined {
    const target: System | SystemByMeasure | undefined = score.systems.find((system) => system.label == label)
    if (target) return target
    else console.error(`${metaItem} of system ${sourceId}: could not find system with label ${label}.`)
    return undefined
}

// Returns the system with the given label.
// sourceId and metaItem are given to specify potential error message.
function getSystemByUuid(
    uuid: UUID,
    score: Score | ScoreByMeasure,
    sourceId: number,
    metaItem: string
): System | SystemByMeasure | undefined {
    const target: System | SystemByMeasure | undefined = score.systems.find((system) => system.uuid == uuid)
    if (target) return target
    else console.error(`${metaItem} of system ${sourceId}: could not find system with uuid ${uuid}.`)
    return undefined
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
            var value = undefined
            if (['true', 'on'].includes(strValue.toLowerCase())) value = true
            if (['false', 'off'].includes(strValue.toLowerCase())) value = false
            return value
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

// Creates a GroupedNotation object list from the given node's children
// Returns a list of position groups if some position tags refer to multiple positions.
// Grammar: Gongan { EmptyLine+ (MetadataLine | StaffLine)+ }
//          StaffLine { PositionLabel Measure+ Eol }
//          Measure { tab Note* }
function getNotationByMeasure(gonganNode: SyntaxNode | null, content: string): GroupedNotationByMeasure[] {
    if (gonganNode == undefined) return []
    const groupedNotationByMeasures: GroupedNotationByMeasure[] = []
    const staffNodes = gonganNode.getChildren('StaffLine')

    for (const child of staffNodes) {
        var notationByMeasure: NoteSymbol[][] = []
        const positionTag = getText(child.getChild('PositionLabel'), content)
        const positions = tagsToPositions(positionTag.split('/'))
        var notationMeasures: GroupedNotationByMeasure
        const measureNodes = child.getChildren('Measure')
        for (const measureNode of measureNodes) {
            const measure: NoteSymbol[] = []
            var noteNode = measureNode.getChild('Note')
            while (noteNode) {
                measure.push(getText(noteNode, content))
                noteNode = noteNode.nextSibling
            }
            notationByMeasure.push(measure)
        }
        notationMeasures = { positions, notation: notationByMeasure } as GroupedNotationByMeasure
        groupedNotationByMeasures.push(notationMeasures)
    }
    // Ensure that all staffs have the same number of measures. Add empty measures where necessary.
    const maxMeasures = Math.max(...groupedNotationByMeasures.map((group) => group.notation.length))
    for (const group of groupedNotationByMeasures) {
        const shortage = maxMeasures - group.notation.length
        if (shortage > 0) group.notation.push(...Array(shortage).fill([]))
    }
    return groupedNotationByMeasures
}

function getColumnWidths(groupedNotationByMeasures: GroupedNotationByMeasure[]): number[] {
    // First calculate the maximum width of the columns. `notationWidth` returns the unabbreviated width
    // for 'shorthand' notation such as norot.
    const measureWidths = groupedNotationByMeasures.map((group) =>
        group.notation.map((m) => notationWidth(NoteObject.fromNotation(m)))
    )
    return _.zip(...measureWidths).map((col) => Math.max(...col.map((n) => n || 0)))
}

function PadMeasures(
    groupedNotationByMeasures: GroupedNotationByMeasure[],
    columnWidths: number[]
): GroupedNotationByMeasure[] {
    // Pad measures with space characters where needed to normalize the measure lengths.

    // First calculate the maximum width of the columns. `notationWidth` returns the unabbreviated width
    // for 'shorthand' notation such as norot.

    // Now pad measures up to the maximum width of the column.
    const groupedNotationArray: GroupedNotationByMeasure[] = []
    groupedNotationByMeasures.forEach((group) => {
        group.notation.forEach((measure, colIdx) => {
            const diff = (columnWidths[colIdx] ?? 0) - measure.length
            if (diff > 0) {
                const padding = Array(diff).fill(SPACE_CHAR)
                measure.push(...padding)
            }
        })
        const groupedNotation: GroupedNotationByMeasure = {
            id: uuidv4(),
            positions: group.positions,
            notation: group.notation
        }
        groupedNotationArray.push(groupedNotation)
    })

    // Join the measures into a single notation array.

    return groupedNotationArray
}

/***********
  METADATA
***********/

// Returns a list of ProcessingInstruction objects for the given gongan node.
// Grammar: Gongan { EmptyLine+ (MetadataLine | StaveLine)+ }
//          MetadataLine {tab lbrace space* Metadata rbrace Eol}
function getMetadata(
    gonganNode: SyntaxNode | null,
    systemid: number,
    systemuuid: string,
    orchestra: InstrumentGroup,
    content: string
): ProcessingInstruction[] {
    const metaData: ProcessingInstruction[] = []
    if (gonganNode == undefined) return metaData

    const metadataNodes = gonganNode.getChildren('MetadataLine')
    metadataNodes.forEach((child, index) => {
        const metaDataItem = child.getChild('Metadata')
        if (metaDataItem) {
            const item = parseMetadata(metaDataItem, index + 1, systemid, systemuuid, orchestra, content)
            if (item) metaData.push(item)
        }
    })
    return metaData
}

// Metadata can contain Execution items, System/Score attributes or instructions for the postprocessing step.
// Grammar: Metadata { TempoMetadata |  DynamicsMetadata | ... }
function parseMetadata(
    metadataNode: SyntaxNode,
    seqNr: number,
    systemid: number,
    systemuuid: string,
    orchestra: InstrumentGroup,
    content: string
): ProcessingInstruction | undefined {
    if (!metadataNode) return undefined
    const node = metadataNode.firstChild
    if (!node) return undefined

    switch (node.name) {
        case 'AutokempyungMetadata': {
            // Default value for autokempyung is 'on'. Only generate casting instruction if metadata value is 'off'
            if (getValue<boolean>(node, 'OnOffValue', content) == false) {
                const castingInstruction = { type: 'nokempyung' }
                Object.assign(castingInstruction, getMetadataParameters(node, ['positions', 'scope'], content))
                return {
                    type: 'castinginstruction',
                    value: castingInstruction as CastingInstruction
                } as ProcessingInstruction
            }
            break
        }
        case 'CopyMetadata': {
            const parameters = {
                targetid: systemid,
                targetuuid: systemuuid,
                label: getValue<string>(node, 'StringValue', content)
            }
            Object.assign(parameters, getMetadataParameters(node, ['include'], content))
            return {
                type: 'postprocessing',
                value: { copy: parameters, targetuuid: systemuuid } as PostProcessing
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
                getGradualBeatsParameters(node, content, value.isGradual),
                getMetadataParameters(node, ['passes', 'iterations', 'nthpass', 'positions'], content)
            )
            const gradualoverride = { isGradual: value.isGradual || parameters.isGradual }
            const item = Object.assign(baseAttr, dynamicsvalues, parameters, gradualoverride) as DynamicsItem
            updateSeqAndTooltips(item, orchestra)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'GonganMetadata': {
            const gongantype = getValue<string>(node, 'GonganTypeValue', content) || 'none'
            if (!['gineman', 'genderan', 'kebyar'].includes(gongantype.toLowerCase())) break
            const baseAttr = { type: 'kempli' }
            const value = { value: 'off' as KempliValue }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as KempliItem
            updateSeqAndTooltips(item, orchestra)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'GotoMetadata': {
            const baseAttr = { type: 'goto' }
            const value = { targetname: getValue<string>(node, 'StringValue', content), targetuuid: '' }
            const parameters = getMetadataParameters(node, ['passes', 'nthpass'], content)
            const item = Object.assign(baseAttr, value, parameters) as GotoItem
            updateSeqAndTooltips(item, orchestra)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'KempliMetadata': {
            const value = { value: getValue<string>(node, 'KempliValue', content) }
            const baseAttr = { type: 'kempli' }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as KempliItem
            updateSeqAndTooltips(item, orchestra)
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
            updateSeqAndTooltips(item, orchestra)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'SequenceMetadata': {
            const baseAttr = { type: 'sequence', seqId: seqNr, tooltip: '', tooltipshort: '' }
            const value = { labels: getValueList<string>(node, 'StringList', content), uuids: [] }
            const item = Object.assign(baseAttr, value) as SequenceItem
            updateSeqAndTooltips(item, orchestra)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'SuppressMetadata': {
            const baseAttr = { type: 'suppress' }
            const value = { positions: tagsToPositions(getValueList<string>(node, 'StringList', content) || []) }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as SuppressItem
            updateSeqAndTooltips(item, orchestra)
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
                getGradualBeatsParameters(node, content, value.isGradual),
                getMetadataParameters(node, ['passes', 'nthpass', 'iterations'], content)
            )
            const gradualoverride = { isGradual: value.isGradual || parameters.isGradual }
            const item = Object.assign(baseAttr, value, parameters, gradualoverride) as TempoItem
            updateSeqAndTooltips(item, orchestra)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'WaitMetadata': {
            const baseAttr = { type: 'wait' }
            const value = { seconds: getValue<number>(node, 'FloatValue', content) }
            const parameters = getMetadataParameters(node, ['passes', 'nthpass'], content)
            const item = Object.assign(baseAttr, value, parameters) as WaitItem
            updateSeqAndTooltips(item, orchestra)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        default: {
            break
        }
    }
    return undefined
}

// Returns the requested parameters of a metadata item
// metadatanode: root node of the metadata item
// paramList: list of parameter names. Each parameter will be returned as a pair `paramName`: `paramvalue`
function getMetadataParameters(metadatanode: SyntaxNode, paramList: string[], content: string): Record<string, any> {
    const parameters: Record<string, any> = {}
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
                        'ExecutiontypeList',
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
    if (parameters.passes && !parameters.nthpass) parameters.nthpass = false
    return parameters
}

function updateSeqAndTooltips(item: ExecutionItem, orchestra: InstrumentGroup) {
    item.seqId = executionItemSeqId(item)
    item.tooltip = executionItemTooltip(item, 'long', orchestra)
    item.tooltipshort = executionItemTooltip(item, 'short', orchestra)
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
    fromBeat: number | undefined
    toBeat: number | undefined
    isGradual: boolean
}
// Grammar definition:
// BeatsParameter { ("beat=" | "beats=") IntegerValue (Arrow IntegerValue)?}
// valueGradual: whether the (dynamics or tempo) value is gradual (contains a `->`).
// For non-gradual items: fromBeat = apply-at beat (defaults to 1), toBeat = undefined.
// For gradual items: fromBeat = start beat, toBeat = end beat.
function getGradualBeatsParameters(node: SyntaxNode, content: string, valueGradual: boolean): BeatsParameter {
    const values = getGradualValues(node.getChild('BeatsGradualParameter'), 'IntegerValue', content)
    const gradual: boolean = valueGradual || values.isGradual
    const param: BeatsParameter = gradual
        ? {
              fromBeat: (values.fromValue as number | undefined) ?? (values.value as number | undefined) ?? 1,
              toBeat: values.value as number | undefined,
              isGradual: true
          }
        : { fromBeat: (values.value as number | undefined) ?? 1, toBeat: undefined, isGradual: false }
    return param
}
