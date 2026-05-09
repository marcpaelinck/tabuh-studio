import type { MutingType, StrokeType, ToneType } from '../config/config'
import type { NoteSymbol, UUID } from './basetypes'
import type { ExecutionItem } from './execution'
import type { InstrumentType, Position } from './instruments'

export type Note = {
    tone: ToneType // corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
    octave: number | null // Scale always start with DING.
    stroke: StrokeType | null // Striking location or method in case multiple ways exist to strike a key, chime or gong.
    muting: MutingType // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

// JSON: standard score format
// Laras, Notation: text versions that can be imported. Each format needs its own parser.
export type ScoreFormat = 'JSON' | 'Laras' | 'Notation'
export type KempliState = 'on' | 'off' | 'notation'
export interface KempliSetting {
    state: KempliState
    frequency?: number
}

// SCORE OBJECT DEFINITIONS

export type Measure = {
    notation: NoteSymbol[]
    notation_?: NoteSymbol[] // cache used to keep user edits that have not been saved yet
}

// Notation of one instrument position within a System
export type Staffs = Partial<Record<Position, Measure[]>>

export interface GroupedNotation {
    positions: Position[]
    staff: Measure[]
}
// Subdivision of a score, typically spans one gongan

export type System = {
    uuid: UUID // unique uuid, never changes
    id: number // system id as shown to user, starts with 1, can change when data items are  added / deleted
    index: number // row index, starts with 0, can change when data items are added / deleted
    line?: number // in case the score was parsed from a text file, the first line of the system
    notationGroups?: GroupedNotation[] // Staves of an imported Notation assigned to multiple positions.
    editorGroup: string[] // positions that are/were grouped in one line in the editor.
    staffs: Staffs // Contains the notation as a sequence of measures for each position.
    kempli: KempliSetting
    colWidths: number[]
    label?: string
    execution?: ExecutionItem[]
    copyfrom?: string // label or id of copied system
    copyfromkey?: UUID // uuid copied system
}

export type Score = {
    uuid: UUID
    title: string
    composer: string
    instrumenttype: InstrumentType
    parts: Record<string, UUID[]> // <`part name`, `system uuid`[]>
    positions: Position[] // sorted list of positions ordered as displayed in the editor
    systems: System[]
}
