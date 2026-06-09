// Parser for imported scores with `Notation` formatting
import type { SyntaxNode } from '@lezer/common'
import { NoteObject } from '@tabuhstudio/shared'
import { SPACE_CHAR } from '@tabuhstudio/shared/noteChars'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { castNotation, type CastingInstruction } from '../componentlogic/castingRulesManager.ts'
import { applyPatterns, notationWidth } from '../componentlogic/patternManager.ts'
import { dynamicsToNumber } from '../config/config.ts'
import type { Position, UUID } from '../typing/basetypes.ts'
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
import type {
    Attribute,
    ParserReturnValue,
    PartInstruction,
    PostProcessing,
    ProcessingInstruction
} from '../typing/parsers.ts'
import type { GroupedNotation, Score, Staff, Staffs, System } from '../typing/score.ts'
import { executionItemSeqId, executionItemTooltip } from '../utils/executionItems.ts'
import { parser } from './grammars/tabuh/tabuh.ts'
import { lineNr, tagLookup } from './tabuhUtils.ts'

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
type ListType = 'IntegerList' | 'StringList' | 'ExecutionList'

// Returns a Score object
// Grammar: @top Document { InfoMetadataLine Gongan+ }
//          InfoMetadataLine {tab lbrace space* InfoMetadata rbrace Eol}
export function parseNotation(content: string): ParserReturnValue {
    const tree = parser.parse(content)

    const errors: string[] = []

    const parsedScore = {
        uuid: uuidv4(),
        title: '',
        composer: '',
        instrumenttype: 'UNDEFINED',
        parts: {},
        positions: [],
        systems: []
    } as Score

    const postProcessing: PostProcessing[] = []

    var gonganCounter = 0

    const traverse = (node: SyntaxNode) => {
        switch (node.name) {
            case 'InfoMetadata': {
                const scoreSettings = {
                    title: getValue<string>(node.getChild('TitleParameter'), 'StringValue', content),
                    composer: getValue<string>(node.getChild('ComposerParameter'), 'StringValue', content) || '',
                    instrumenttype: getValue<string>(node.getChild('InstrumentgroupParameter'), 'StringValue', content)
                }
                if (scoreSettings.title == undefined) errors.push('INFO: Missing or incorrectly formatted title')
                if (scoreSettings.instrumenttype == undefined)
                    errors.push('INFO: Missing or incorrectly formatted instrumenttype')
                Object.assign(parsedScore, scoreSettings)
                break
            }
            case 'Gongan': {
                gonganCounter++
                const systemuuid = uuidv4()
                const groupedNotation = getNotation(node, content)
                const metaData = getMetadata(node, gonganCounter, systemuuid, content)
                const system = {
                    uuid: systemuuid,
                    id: gonganCounter,
                    index: gonganCounter - 1,
                    line: lineNr(content, node.from),
                    notationGroups: groupedNotation.filter((group) => group.positions.length > 1),
                    staffs: {},
                    kempli: { state: 'on' },
                    label: undefined,
                    execution: metaData.filter((item) => item.type == 'executionitem').map((item) => item.value)
                } as System
                metaData
                    .filter((item) => item.type == 'attribute')
                    .forEach((item) => {
                        const attributeOf: Attribute = item.value as Attribute
                        if (attributeOf.system) Object.assign(system, attributeOf.system)
                        if (attributeOf.score) Object.assign(parsedScore, attributeOf.score)
                    })
                postProcessing.push(
                    ...(metaData
                        .filter((item) => item.type == 'postprocessing')
                        .map((item) => item.value) as PostProcessing[])
                )
                const castInstructions: CastingInstruction[] = metaData
                    .filter((item) => item.type == 'castinginstruction')
                    .map((item) => item.value) as CastingInstruction[]
                const parsedStaffs = castGroupedNotationToPositions(groupedNotation, castInstructions)
                system.staffs = parsedStaffs as Staffs // temporarily holds Staff[] per position until postProcess
                parsedScore.systems.push(system)
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

    const score: Score = postProcess(parsedScore, postProcessing)

    return { score, errors, postProcessing, tree }
}

// Intermediate type: array of beat-grouped staffs per position (used only during parsing).
type ParsedStaffs = Partial<Record<Position, Staff[]>>

// When a staff notation applies to a group of positions, this function converts
// the common staff notation to individual staff notation for each position, using 'casting' rules.
// groupedNotation: groups of positions with corresponding notation (one Staff per kempli beat)
// castInstructions: contains AUTOKEMPYUNG metadata which indicates whether homophonic notation
//                   should be converted to kempyung equivalent for sangsih positions.
function castGroupedNotationToPositions(
    groupedNotations: GroupedNotation[],
    castInstructions: CastingInstruction[]
): ParsedStaffs {
    const staffs: ParsedStaffs = {}
    for (const group of groupedNotations) {
        if (group.positions.length == 1) {
            // Single position: leave notation unchanged
            staffs[group.positions[0]] = group.staff
        } else if (group.positions.length > 1) {
            // Multiple positions: cast notation to each position
            group.positions.forEach((position, posIdx) => {
                const beats: Staff[] = []
                var measureIdx = 0
                for (const beat of group.staff) {
                    const objNotation = castNotation(
                        beat.objNotation,
                        group.positions,
                        measureIdx,
                        posIdx,
                        castInstructions
                    )
                    const strNotation = objNotation.map((note) => note.toString())
                    if (group.positions.length > 1) {
                        beats.push({ notation: strNotation, objNotation: objNotation })
                    } else beats.push({ ...beat })
                    measureIdx++
                }
                staffs[position] = beats
            })
        }
    }
    return staffs
}

// Flattens an array of beat-grouped staffs into a single flat Staff per position.
function flattenParsedStaffs(parsedStaffs: ParsedStaffs): Staffs {
    const staffs: Staffs = {}
    for (const [pos, beats] of Object.entries(parsedStaffs)) {
        if (!beats) continue
        const notation = beats.flatMap((beat) => beat.notation)
        const objNotation = notation.map((symbol) => new NoteObject(symbol, pos as Position))
        staffs[pos as Position] = { notation: notation, objNotation: objNotation }
    }
    return staffs
}

/********************
 POSTPROCESSING
********************/

function postProcess(score: Score, postProcessingInstructions: PostProcessing[]): Score {
    score.positions = getAllPositions(score)

    // fill in targetuuid of GOTO
    for (const system of score.systems) {
        const gotoItems: GotoItem[] = (system.execution?.filter((item) => item.type == 'goto') || []) as GotoItem[]
        for (const gotoItem of gotoItems) {
            const target: System | undefined =
                getSystemByLabel(gotoItem.targetname, score, system.id, 'GOTO') || undefined
            if (target) gotoItem.targetuuid = target.uuid
        }
    }

    // fill in uuids of SEQUENCE
    for (const system of score.systems) {
        const seqItems: SequenceItem[] = (system.execution?.filter((item) => item.type == 'sequence') ||
            []) as SequenceItem[]
        for (const seqItem of seqItems) {
            for (const label of seqItem.labels) {
                const target: System | undefined = getSystemByLabel(label, score, system.id, 'SEQUENCE') || undefined
                if (target) seqItem.uuids.push(target.uuid)
            }
        }
    }

    // Process COPY postProcessingInstructions
    const copyInstructions: PostProcessing[] =
        postProcessingInstructions.filter((instr) => instr.copy != undefined) || []
    for (const instr of copyInstructions) {
        const copyInstr = instr.copy!
        const target: System | undefined = getSystemByUuid(copyInstr.targetuuid, score, copyInstr.targetid, 'COPY')
        const source: System | undefined = getSystemByLabel(copyInstr.label, score, copyInstr.targetid, 'COPY')
        if (source && target) {
            // Target staffs should be applied to the copy of source
            target.staffs = { ...source.staffs, ...target.staffs }
            if (copyInstr.include && target.execution) {
                const copyItems: ExecutionItem[] = target.execution.filter((item) =>
                    copyInstr.include!.includes(item.type)
                )
                target.execution = target.execution || []
                target.execution.push(...copyItems)
            }
        }
    }

    // At this point system.staffs temporarily holds Staff[] per position (ParsedStaffs).
    // We need to: (1) expand pattern symbols, (2) pad beats to equal width, (3) set kempli, (4) flatten to Staff.
    for (const system of score.systems) {
        // Cast to ParsedStaffs for intermediate processing
        const parsedStaffs = system.staffs as unknown as ParsedStaffs

        // Step 1: Expand shorthand pattern symbols (e.g. norot) within each beat
        _.entries(parsedStaffs).forEach(([position, beats]) => {
            if (beats) parsedStaffs[position as Position] = applyPatterns(position as Position, beats)
        })

        // Step 2: Compute column widths (max notation width per beat across all positions) and pad beats
        const colWidths = getColwidths(parsedStaffs)
        _.entries(parsedStaffs).forEach(([position, beats]) => {
            if (!beats) return
            beats.forEach((beat, colIdx) => {
                const diff = (colWidths[colIdx] ?? 0) - beat.notation.length
                if (diff > 0) {
                    const padding = Array(diff).fill(SPACE_CHAR)
                    beat.notation.push(...padding)
                    beat.objNotation.push(...padding.map((symbol) => new NoteObject(symbol, position as Position)))
                }
            })
        })

        // Step 3: Set kempli frequency from the beat width and apply kempli execution items
        // Default value
        system.kempli.state = 'on'
        if (system.execution) {
            const kempliItem: KempliItem = system.execution.find((exec) => exec.type == 'kempli') as KempliItem
            if (kempliItem) {
                if (kempliItem.value == 'off') system.kempli.state = 'off'
                if (kempliItem.value === 'double') system.kempli.frequency = system.kempli.frequency! / 2
            }
        }
        if (system.kempli.state != 'off') {
            if (colWidths.length == 0 || 'KEMPLI' in system.staffs) {
                system.kempli.state = 'notation'
            } else {
                // Set kempli frequency if all measures have the same duration
                if (colWidths.every((w) => w == colWidths[0])) {
                    system.kempli.frequency = colWidths.length > 0 ? colWidths[0] : 4
                }
            }
        }

        // Step 4: Flatten beats into a single Staff per position
        system.staffs = flattenParsedStaffs(parsedStaffs)
    }

    // Generate and assign the score's `parts` attribute.
    // Parts instructions only contain the first system of the part. Assume that
    // each part should be extended until the next part or the end of the score.
    const partPostProcessing: PostProcessing[] =
        postProcessingInstructions.filter((instr) => instr.part != undefined) || []
    // Extract the part definitions (PartInstruction) and sort them by system ID.
    const partsInstr = partPostProcessing
        .map((instr) => instr.part!)
        .sort((part1, part2) => part1.systemid - part2.systemid) as PartInstruction[]
    // Create [part, next part] pairs
    const pairs = _.zip(
        partsInstr,
        partsInstr
            .toSpliced(0, 1)
            .concat([{ name: '', systemid: Number.MAX_SAFE_INTEGER, systemuuid: '' } as PartInstruction])
    )

    for (const [part, next] of pairs) {
        if (!part || !next) continue
        const partSystems = score.systems.filter((system) => system.id >= part?.systemid && system.id < next.systemid)
        score.parts[part.name] = partSystems.map((system) => system.uuid)
    }

    return score
}

function getAllPositions(score: Score): Position[] {
    const positionSet = score.systems.reduce((aggr, system) => aggr.union(new Set(_.keys(system.staffs))), new Set())
    return Array.from(positionSet) as Position[]
}

// Returns the system with the given label.
// sourceId and metaItem are given to specify potential error message.
function getSystemByLabel(label: string, score: Score, sourceId: number, metaItem: string): System | undefined {
    const target: System | undefined = score.systems.find((system) => system.label == label)
    if (target) return target
    else console.error(`${metaItem} of system ${sourceId}: could not find system with label ${label}.`)
    return undefined
}

// Returns the system with the given label.
// sourceId and metaItem are given to specify potential error message.
function getSystemByUuid(uuid: UUID, score: Score, sourceId: number, metaItem: string): System | undefined {
    const target: System | undefined = score.systems.find((system) => system.uuid == uuid)
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
function getNotation(gonganNode: SyntaxNode | null, content: string): GroupedNotation[] {
    if (gonganNode == undefined) return []
    const notationGroups: GroupedNotation[] = []
    const staffNodes = gonganNode.getChildren('StaffLine')

    for (const child of staffNodes) {
        var staff: Staff[] = []
        const positionTag = getText(child.getChild('PositionLabel'), content)
        const positions = tagsToPositions(positionTag.split('/'))
        var groupedNotation: GroupedNotation
        const measureNodes = child.getChildren('Measure')
        for (const measureNode of measureNodes) {
            const beat: Staff = { notation: [], objNotation: [] }
            var noteNode = measureNode.getChild('Note')
            while (noteNode) {
                // The NoteObject is not bound to any instrument
                const note = new NoteObject(getText(noteNode, content).trim(), undefined)
                beat.notation.push(note.toString())
                beat.objNotation.push(note)
                noteNode = noteNode.nextSibling
            }
            staff.push(beat)
        }
        groupedNotation = { positions: positions, staff: staff } as GroupedNotation
        notationGroups.push(groupedNotation)
    }
    // Ensure that all staffs have the same number of measures. Add empty measures where necessary.
    const maxMeasures = Math.max(...notationGroups.map((ng) => ng.staff.length))
    for (const ng of notationGroups) {
        const shortage = maxMeasures - ng.staff.length
        if (shortage > 0) ng.staff.push(...(Array(shortage).fill({ notation: [], objNotation: [] }) as Staff[]))
    }

    return notationGroups
}

// Returns the maximum width of vertically aligned sections.
// Takes ParsedStaffs (Staff[] per position) as input — only valid during parsing.
function getColwidths(parsedStaffs: ParsedStaffs): number[] {
    const sizes = _.entries(parsedStaffs)
        .filter(([_position, beats]) => beats != undefined)
        .map(([position, beats]) => beats!.map((beat) => notationWidth(beat.objNotation, position as Position)))
    // Transpose to get widths per column
    const widthsByColumn = _.zip(...sizes)
    const columnWidths: number[] = widthsByColumn.map((widths) =>
        widths.reduce((max, width) => Math.max(max || 0, width || 0), 0)
    ) as number[]
    return columnWidths
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
    content: string
): ProcessingInstruction[] {
    const metaData: ProcessingInstruction[] = []
    if (gonganNode == undefined) return metaData

    const metadataNodes = gonganNode.getChildren('MetadataLine')
    metadataNodes.forEach((child, index) => {
        const metaDataItem = child.getChild('Metadata')
        if (metaDataItem) {
            const item = parseMetadata(metaDataItem, index + 1, systemid, systemuuid, content)
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
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'GonganMetadata': {
            const gongantype = getValue<string>(node, 'GonganTypeValue', content) || 'none'
            if (!['gineman', 'genderan', 'kebyar'].includes(gongantype.toLowerCase())) break
            const baseAttr = { type: 'kempli' }
            const value = { value: 'off' as KempliValue }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as KempliItem
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
            const value = { value: getValue<string>(node, 'KempliValue', content) }
            const baseAttr = { type: 'kempli' }
            const parameters = getMetadataParameters(node, ['beats', 'passes', 'nthpass', 'iterations'], content)
            const item = Object.assign(baseAttr, value, parameters) as KempliItem
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
        case 'PartMetadata': {
            const partName: string = getValue<string>(node, 'StringValue', content) as string
            return {
                type: 'postprocessing',
                value: { part: { name: partName, systemid: systemid, systemuuid: systemuuid } } as PostProcessing
            } as ProcessingInstruction
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
                getGradualBeatsParameters(node, content, value.isGradual),
                getMetadataParameters(node, ['passes', 'nthpass', 'iterations'], content)
            )
            const gradualoverride = { isGradual: value.isGradual || parameters.isGradual }
            const item = Object.assign(baseAttr, value, parameters, gradualoverride) as TempoItem
            updateSeqAndTooltips(item)
            return { type: 'executionitem', value: item } as ProcessingInstruction
        }
        case 'WaitMetadata': {
            const baseAttr = { type: 'wait' }
            const value = { seconds: getValue<number>(node, 'FloatValue', content) }
            const parameters = getMetadataParameters(node, ['passes', 'nthpass'], content)
            const item = Object.assign(baseAttr, value, parameters) as WaitItem
            updateSeqAndTooltips(item)
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
    if (parameters.passes && !parameters.nthpass) parameters.nthpass = false
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
              fromBeat: (values.fromValue as number | undefined) ?? 1,
              toBeat: values.value as number | undefined,
              isGradual: true
          }
        : { fromBeat: (values.value as number | undefined) ?? 1, toBeat: undefined, isGradual: false }
    return param
}
