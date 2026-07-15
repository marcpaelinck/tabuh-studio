import type { NoteObject, Position } from '@tabuhstudio/shared'
import type {
    InstrumentGroup,
    MutingType,
    NoteSymbol,
    StrokeLocation,
    ToneType,
    UUID
} from '@tabuhstudio/shared/types/basetypes'
import type { CastingInstruction } from '../componentlogic/castingRulesManager'
import type { BeatSliceInfo, ExecutionItem } from './execution'

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

// Canonical "compact" notation group — the source of truth for the dual editor.
// Like a Staff, `notation` is a single FLAT list of position-independent compact
// symbols (may contain shorthand such as norot). It is built by padding each measure
// with spaces up to the per-beat column width (`System.beatColWidths`) and
// concatenating, so the compact columns line up 1:1 with the expanded notation.
// The expanded per-position `staffs` are DERIVED from a system's groups via
// expandSystem() (see componentlogic/expandNotation.ts).
export interface GroupedNotation {
    id: string
    positions: Position[] // 1..n; a single-position group is a "solo" line
    notation: NoteSymbol[] // flat, space-padded compact symbols (measures concatenated)
}
// Subdivision of a score, typically spans one gongan

export type System = {
    uuid: UUID // unique uuid, never changes
    id: number // system id as shown to user, starts with 1, can change when data items are  added / deleted
    index: number // row index, starts with 0, can change when data items are added / deleted
    line?: number // in case the score was parsed from a text file, the first line of the system
    groups: GroupedNotation[] // CANONICAL compact notation (source of truth for the dual editor).
    staffs: Partial<Record<Position, Staff>> // Derived (cache) flat notation for each position.
    beatSlices: BeatSliceInfo[]
    castingInstructions?: CastingInstruction[] // system-wide casting context (e.g. AUTOKEMPYUNG=off) used to re-derive staffs.
    kempli: KempliSetting
    label?: string
    execution?: ExecutionItem[]
    copyFrom?: string // Label of the system of which the current system is a copy
    copyFromUuid?: string // UUID of the system of which the current system is a copy
}

export type Score = {
    uuid: UUID
    title: string
    composer: string
    instrumenttype: InstrumentGroup
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
