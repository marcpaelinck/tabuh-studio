import type { BPM, Position, UUID } from './basetypes'
import type { Staff, System } from './score'

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
    isGradual: boolean // True: the expression value should increase / decrease over one or more kempli beats.
    fromBeat?: number // isGradual=false: the beat where the change takes effect (1-based). isGradual=true: first beat of the gradual ramp.
    toBeat?: number // isGradual=true only: last beat of the gradual ramp (1-based). Undefined for immediate changes.
    fromValue?: number // isGradual=true: starting value of the gradual change. If undefined, the current value is used.
    value: number // isGradual=true: end value of the gradual change. isGradual=false: new immediate value.
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

export interface BeatSliceInfo {
    start: number
    end: number
}

// Keeps track of pass and iteration counters for each system. Also contains lists of
// directives (goto, loop, tempo and dynamics), sorted by priority.
export interface FlowInfoTable {
    [idx: string]: {
        system: System
        beatSlices: BeatSliceInfo[]
        pass: number
        iteration: number
        executionItems: Record<ExecutionItemType, ExecutionItem[]>
    }
}

// Keeps track of the 'current' cursor position
export interface FlowCursor {
    systemIdx: number // Index of the current system (numbering starts at 0)
    beatIdx: number // Index of the current kempli beat (numbering starts at 0)
    newSystem: boolean // True if this system is different than that of the previous step
    systemStart: boolean // True if this is the first section of the system
    lastBeat: boolean // True if this is the last kempli beat of the current system
    sequence: UUID[] | undefined // Currently active sequence (UUIDs of systems to be performed in the given order)
    sequenceIdx: number | undefined // Current index of the active sequence
}

// Returned by function nextInFlow.
// Contains information about the FlowCursor's current system.
export interface FlowStep {
    id: number
    system: System
    systemIdx: number
    beatSlices: BeatSliceInfo[]
    beatIdx: number
    beats: Partial<Record<Position, Staff>>
    duration: number // Total duration of the beat (excluding optional WAIT item)
    pass: number // Current pass count
    iteration: number // current iteration count
    positions: Partial<Position>[]
    tempo: BPM[]
    dynamics: number[]
    lastSystem: boolean
    lastBeat: boolean
    waitMsAfter: number // Delay after the end of the current section in milliseconds
    sequence?: UUID[] // Currently active sequence (UUIDs of systems to be performed in the given order)
    sequenceIdx?: number // Current index of the active sequence
}

export type FlowItem = GotoItem | LoopItem | SequenceItem | WaitItem

export type ExpressionItem = TempoItem | DynamicsItem

export type ExecutionItem = FlowItem | ExpressionItem | SuppressItem | KempliItem
