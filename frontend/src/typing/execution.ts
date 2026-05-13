import type { Position, UUID } from './basetypes'

// EXECUTION
// These objects contain information for playing the notation.
// Flow instructions: determine the playing sequence (goto and loop).
// Expression instructions: contain tempo and dynamics information.

export type ExecutionItemType = 'goto' | 'loop' | 'wait' | 'tempo' | 'dynamics' | 'sequence' | 'suppress' | 'kempli'

export type KempliValue = 'double' | 'off'

export type DynamicsValue = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff'

// Base class

export interface ExecutionItemBase {
    type: ExecutionItemType
    seqId: number // Sequence in the list of Execution items. Used by the item editor.
    passes?: number[] // Pass numbers for which the item applies
    nthpass?: boolean // undefined: no condition. false: item applies to listed passes only.

    //  true: item applies to every nth pass (n in passes list), e.g. every 3rd & 4th pass.
    tooltip: string
    tooltipshort: string
}
// Enables to deviate form the default playing sequence: indicates the next System.

export interface GotoItem extends ExecutionItemBase {
    type: 'goto'
    targetuuid: UUID // next System to play.
    targetname: string // Display name of the target System.
}
// Enables to modify the kempli style.

export interface KempliItem extends ExecutionItemBase {
    type: 'kempli'
    value: KempliValue
    beats?: number[] // List of beats, can be used to limit the scope of the item.
    iterations?: number[] // In case the System has a LoopItem, specifies for which iterations the item applies.
}
// Enables to repeat the current System.

export interface LoopItem extends ExecutionItemBase {
    type: 'loop'
    count: number // Total number of times to play the System consecutively.
}
// Enables to execute gongans in a specific sequence.

export interface SequenceItem extends ExecutionItemBase {
    type: 'sequence'
    labels: string[] // sequence of gongan labels
    uuids: UUID[] // uuids of the gongans in the sequence
}
// Enables to add a pause after the System.

export interface WaitItem extends ExecutionItemBase {
    type: 'wait'
    seconds: number // Number of seconds to wait after playing the System. Rounded off to 1/4 of a second.
}
// Enables to suppress one or more instruments.

export interface SuppressItem extends ExecutionItemBase {
    type: 'suppress'
    beats?: number[] // List of beats, can be used to limit the scope of the item.
    positions?: Position[] // Positions to suppress. Assume all positions if undefined.
    iterations?: number[] // In case the System has a LoopItem, specifies for which iterations the item applies.
}

export interface ExpressionItemBase extends ExecutionItemBase {
    type: ExecutionItemType
    iterations?: number[] // In case the System has a LoopItem, specifies for which iterations the expression applies.
    isGradual: boolean // True: the expression value should increase / decrease over one or more Section.
    fromSection?: number // If isGradual==true: Gradual change starts at the beginning of this Section. Otherwise undefined.
    section: number // If isGradual==true: the gradual change should continue until the end of this section (numbering starts from 1).

    // Otherwise the gradual change should be effective immediately at the start of this section (numbering starts from 1).
    fromValue?: number // If isGradual==true: starting value of the gradual change. Otherwise undefined.
    value: number // If isGradual==true: end value of the gradual change. Otherwise: new immediate value.
}

export interface TempoItem extends ExpressionItemBase {
    type: 'tempo'
}

export interface DynamicsItem extends ExpressionItemBase {
    type: 'dynamics'
    fromDynamics?: DynamicsValue // If isGradual==true: starting value for gradual change. Otherwise undefined.
    dynamics: DynamicsValue // If isGradual==true: end value of the gradual change. Otherwise: new immediate value.
    positions: Position[] // Positions for which the dynamics apply
}

export type FlowItem = GotoItem | LoopItem | SequenceItem | WaitItem

export type ExpressionItem = TempoItem | DynamicsItem

export type ExecutionItem = FlowItem | ExpressionItem | SuppressItem | KempliItem
