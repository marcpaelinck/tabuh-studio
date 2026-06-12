import type { Tree } from '@lezer/common'
import type { CastingInstruction } from '../componentlogic/castingRulesManager'
import type { UUID } from './basetypes'
import type { ExecutionItem, ExecutionItemType } from './execution'
import type { Score } from './score'

export interface Attribute {
    score?: { parts: string[] }
    system?: { copyfrom: string } | { label: string }
}

export interface ProcessingInstruction {
    type: 'attribute' | 'executionitem' | 'postprocessing' | 'castinginstruction'
    value: ExecutionItem | Attribute | PostProcessing | CastingInstruction
}
interface CopyInstruction {
    label: string
    targetid: number
    targetuuid: string
    include?: ExecutionItemType[]
}

export interface PartInstruction {
    name: string
    systemid: number
    systemuuid: UUID
}

export interface PostProcessing {
    copy?: CopyInstruction
    part?: PartInstruction
}

export interface PostProcessing {
    copy?: CopyInstruction
    part?: PartInstruction
}

export interface ParserReturnValue {
    score?: Score
    errors: string[]
    postProcessing: PostProcessing[]
    tree?: Tree
}
