import type { NoteObject } from '@tabuhstudio/shared/NoteObject'
import type { CastingInstruction } from '../componentlogic/castingRulesManager'
import type { InstrumentType, MutingType, NoteSymbol, Position, StrokeLocation, ToneType, UUID } from './basetypes'
import type { ExecutionItem } from './execution'

export type Note = {
    tone: ToneType // corresponds with a specific key, chime, gong or (in case of a kendang) stroke type.
    octave: number | null // 0, 1 or 2: relative to the instrument. Scale always start with DING.
    stroke: StrokeLocation | null // Striking location or method in case multiple ways exist to strike a key, chime or gong.
    muting: MutingType // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

// 'JSON': standard score format (loaded from server/database)
// 'JSON-file': standard score format loaded from a local file chosen by the user
// 'Laras'or 'Notation': text versions that can be imported. Each format needs its own parser.
export type ScoreFormat = 'JSON' | 'JSON-file' | 'Laras' | 'Notation'
// 'on': kempli will be added during playback. 'notation': system contains a kempli staff.
// See https://stackoverflow.com/questions/54607961/how-to-define-a-type-based-on-values-of-an-array
export const kempliStates = ['on', 'off', 'notation']
export type KempliState = (typeof kempliStates)[number]
// if state is 'on', frequency must be given.
export interface KempliSetting {
    state: KempliState
    frequency?: number
    beatAtEnd?: boolean
}

// Notation of one instrument position within a System (flat, not subdivided into measures)
// 'notation' and 'notation_' are kept for backward compatibility until the entire codebase has been
// refactored to use the NoteObject class exclusively.
export interface Staff {
    notation: NoteSymbol[]
    notation_?: NoteSymbol[] // cache used to keep user edits that have not been saved yet. Enables to revert changes.
    objNotation: NoteObject[]
    objNotation_?: NoteObject[]
}

export type Staffs = Partial<Record<Position, Staff>>

// Used during parsing only: staff is an array of Staffs, one per kempli beat (measure).
// After parsing, these are flattened into a single Staff per position.
export interface GroupedNotation {
    positions: Position[]
    staff: Staff[]
}

// Canonical "compact" notation group — the source of truth for the dual editor.
// `measures` holds position-independent compact symbols per kempli beat (one inner
// array per beat) and may contain shorthand symbols (e.g. norot). The expanded,
// per-position `staffs` are DERIVED from a system's groups via expandSystem()
// (see componentlogic/expandNotation.ts).
export interface NotationGroup {
    id: string
    positions: Position[] // 1..n; a single-position group is a "solo" line
    measures: NoteSymbol[][] // compact symbols per kempli beat
}
// Subdivision of a score, typically spans one gongan

export type System = {
    uuid: UUID // unique uuid, never changes
    id: number // system id as shown to user, starts with 1, can change when data items are  added / deleted
    index: number // row index, starts with 0, can change when data items are added / deleted
    line?: number // in case the score was parsed from a text file, the first line of the system
    notationGroups?: GroupedNotation[] // DEPRECATED: superseded by `groups`; no longer populated.
    editorGroup: string[] // positions that are/were grouped in one line in the editor.
    groups?: NotationGroup[] // CANONICAL compact notation (source of truth for the dual editor).
    castingInstructions?: CastingInstruction[] // system-wide casting context (e.g. AUTOKEMPYUNG=off) used to re-derive staffs.
    staffs: Partial<Record<Position, Staff>> // Derived (cache) flat notation for each position.
    kempli: KempliSetting
    label?: string
    execution?: ExecutionItem[]
    staffs_?: Staffs // Reserved to contain the original staffs of a copied system
    copyFrom?: string // Label of the system of which the current system is a copy
    copyFromUuid?: string // UUID of the system of which the current system is a copy
}

export type Score = {
    uuid: UUID
    title: string
    composer: string
    instrumenttype: InstrumentType
    parts: Record<string, UUID[]>
    positions: Position[]
    systems: System[]
}

// Return type for the validation of a Score object
export interface ValidationResult {
    isValid: boolean
    hasCycle: boolean
    message: string
}
