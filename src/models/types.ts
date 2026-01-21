import type { HTMLAttributes, ReactElement } from 'react'
import * as Tone from 'tone'
import type { BaseNoteTimeObj, MutingType, StrokeType, ToneType } from '../config/config'

// INSTRUMENTS / AUDIO
export type Instrument = { id: string; name: string; alphabet: string[] }
export type Position =
    | 'CALUNG'
    | 'CENGCENG'
    | 'GONGS'
    | 'JEGOGAN'
    | 'KANTILAN_POLOS'
    | 'KANTILAN_SANGSIH'
    | 'KEMPLI'
    | 'KENDANG'
    | 'PEMADE_POLOS'
    | 'PEMADE_SANGSIH'
    | 'PENYACAH'
    | 'REYONG_1'
    | 'REYONG_2'
    | 'REYONG_3'
    | 'REYONG_4'
    | 'UGAL'

// NOTATION

export type Note = {
    tone: ToneType // corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
    octave: number | null // Scale always start with DING.
    stroke: StrokeType | null // Striking location or method in case multiple ways exist to strike a key, chime or gong.
    muting: MutingType // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

export type JsonNote = {
    sysUuid: string
    section: number
    s: string
    t: number // attack time in base notes
    ms: number // attack time in ms
    d: number
    v: number // velocity
}

// Used as
export type JsonSymbol = {
    sysUuid: string
    sectionId: number
    s: string
    t: number // attack time in base notes
    d: number
}

// Notation of one section for one instrument position
export type Measure = {
    starttime: number
    tempo: [number, number]
    velocity: [number, number]
    notes?: JsonNote[]
    notation: JsonSymbol[]
    notation_?: JsonSymbol[] // cache used to keep user edits that have not been saved yet
}

// Subdivision of a system, typically spans one kempli beat
export type Section = {
    id: number
    starttime: number // start time in base notes
    starttimeMs: number // start time in ms
    duration: number
    tempo: [number, number]
    staves: Record<Position, Measure> //TODO: rename to `measures`. Needs to be renamed in all input files too.
}

// Subdivision of a score, typically spans one gongan
export type System = {
    uuid: string // unique, fixed uuid.
    id: number // // Sequence number, used as identification in the UI. Can change when systems are added/removed/sorted.
    gongan: number // ID from the `gamelan-notation` python application. Unused in this application.
    starttime: number // start time of first section
    duration: number // sum of section durations
    part: string
    sections: Section[]
}

export type Score = { title: string; composer: string; durationMs: number; systems: System[] }

export type ScoreInfo = {
    title: string
    instrumentgroup: string
    file: string
    notationversion: string
    pdf: string
    format: 'old' | 'new'
}

// NEW SCORE OBJECT DEFINITIONS
//TODO the following definitions will replace Score, System, Section and Measure
// EDIT TABLE: contains system data in a format that can easily be displayed in the editor
// Notation of one section for one instrument position
export type EditorMeasure = {
    starttime: number
    tempo: [number, number]
    velocity: [number, number]
    notation: string[]
    notation_?: string[] // cache used to keep user edits that have not been saved yet
}

// Notation of one instrument position within a System
export type Staffs = Record<Position, EditorMeasure[]>

// Subdivision of a score, typically spans one gongan
export type EditorSystem = {
    uuid: string // unique uuid, never changes
    id: number // system id as shown to user, starts with 1, can change when data items are  added / deleted
    index: number // row index, starts with 0, can change when data items are added / deleted
    starttime: number
    grouped: string[] // positions that are/were grouped in the editor for simultaneous editing using casting rules.
    staffs: Staffs // Contains the notation as a sequence of measures for each position.
    colWidths: number[]
    label?: string
    loop?: LoopItem
    execution?: ExecutionItem[]
    tempo?: TempoItem[]
    dynamics?: TempoItem[]
    copyfrom?: string // label or id of copied system
    copyfromkey?: string // uuid copied system
}

export type EditorScore = {
    title: string
    composer: string
    parts: Record<string, string[]> // <<part name>, <system uuid>[]>
    positions: Position[] // sorted list of positions ordered as displayed in the editor
    systems: EditorSystem[]
}

// ANIMATION

export type XCoordRecord = { [note: string]: number } | null
export type YCoordRecord = { y: number } | null
export type AnimationData = {
    hover_x: number
    hover_y: number
    stroke_x: number
    stroke_y: number
    stroke_rotation: number
    stroke_scale: number[]
} | null

export type SVGInfo = {
    svg: SVGSVGElement | null
    panggul: SVGUseElement | null
    x: XCoordRecord
    y: number | null
    animation: AnimationData
}

// export type NotationType = DetailedReactHTMLElement<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>[]
export type NotationParagraph = ReactElement<HTMLAttributes<HTMLParagraphElement>>

// MENUS

export type menuValueType = string | number | null | (string | number | null)[]

export type MenuInfo = { disabled: Record<MenuName, boolean> }

export type MenuItemInfo = { key: string | number | null; displayValue: string; value: menuValueType }

type MenuName = string

export type MenuCollectionInfo = Record<MenuName, MenuInfo>

export type TextCursorPosition = {
    x: number
    y: number
    leftSymbol: SVGTSpanElement | null
    rightSymbol: SVGTSpanElement | null
}

export type HighlightRange = { line: number; range: number[] }

// EXECUTION
// These objects contain information for playing the notation.
// Flow instructions: determine the playing sequence (goto and loop).
// Expression instructions: contain tempo and dynamics information.

export type ExecutionItemType = 'goto' | 'loop' | 'tempo' | 'dynamics'

// Base class
export interface ExecutionItemBase {
    type: ExecutionItemType
    seqId?: number // Sequence in the list of Execution items. Used by the item editor.
    passes?: number[] // Pass numbers for which the item applies
    each?: boolean // undefined: no condition. false: item applies to listed passes only.
    //  true: item applies to every nth pass (n in passes list), e.g. every 3rd & 4th pass.
    tooltip: string
    tooltipshort: string
}

// Enables to deviate form the default playing sequence: indicates the next System.
export interface GotoItem extends ExecutionItemBase {
    type: 'goto'
    targetuuid: string // next System to play.
    targetname: string // Display name of the target System.
}

// Enables to repeat the current System.
export interface LoopItem extends ExecutionItemBase {
    type: 'loop'
    count: number // Total number of times to play the System consecutively.
}

export interface ExpressionItemBase extends ExecutionItemBase {
    type: ExecutionItemType
    loops?: number[] // In case the System has a LoopItem, specifies for which iterations the expression applies.
    isGradual: boolean // True: the expression value should increase / decrease over one or more Section.
    fromSection?: number // If isGradual==true: Gradual change starts at the beginning of this Section. Otherwise undefined.
    toSection: number // If isGradual==true: the gradual change should continue until the end of this section.
} // Otherwise the gradual change should be effective immediately at the start of this section.

export interface TempoItem extends ExpressionItemBase {
    type: 'tempo'
    fromBPM?: number // If isGradual==true: starting value of the gradual change. Otherwise undefined.
    toBPM: number // If isGradual==true: end value of the gradual change. Otherwise: new immediate value.
}

export type DynamicsValue = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff'

export interface DynamicsItem extends ExpressionItemBase {
    type: 'dynamics'
    fromDynamics?: DynamicsValue // If isGradual==true: starting value for gradual change. Otherwise undefined.
    toDynamics: DynamicsValue // If isGradual==true: end value of the gradual change. Otherwise: new immediate value.
}

export type FlowItem = GotoItem | LoopItem
export type ExpressionItem = TempoItem | DynamicsItem
export type ExecutionItem = FlowItem | ExpressionItem

export type EditorCellCursor = { sysUuid: string; measure: number }

// SCORE PROCESSING AND TIMELINE CREATION

export type GenericFunction = (time: number) => void
export type SamplerFunction = (time: number, action: SamplerAction) => void
export type AnimationFunction = (time: number, action: AnimationAction) => void
export type PlayerCursorFunction = (time: number, action: PlayerCursorAction) => void
export type EditorCursorFunction = (time: number, action: EditorCursorAction) => void

export type GenericAction = { action: GenericFunction; time: BaseNoteTimeObj }

export type TempoAction = { time: BaseNoteTimeObj; bpm: Tone.Unit.NormalRange; duration: BaseNoteTimeObj }

export interface SamplerAction {
    action: SamplerFunction
    time: BaseNoteTimeObj
    position: Position
    cleanedSymbol: string
    bpm: number
    velocity: Tone.Unit.NormalRange
    duration: BaseNoteTimeObj
    isLast: boolean
}

export type AnimationNote = {
    sysUuid: string
    section: number
    time: BaseNoteTimeObj
    keyname: string
    tone: ToneType
    stroke: StrokeType | null
    muting: MutingType
    duration: BaseNoteTimeObj
    isLast: boolean
}

export type AnimationAction = {
    action: AnimationFunction
    time: BaseNoteTimeObj
    position: Position
    prevsysUuid: string | null
    prevsection: number | null
    currnotes: AnimationNote[]
    nextnotes: AnimationNote[]
    timeuntil: BaseNoteTimeObj
    timeuntilMs: number
}

export type PlayerCursorAction = {
    action: PlayerCursorFunction
    time: BaseNoteTimeObj
    position: Position
    section: number
    sysuuid: string
    symbol: string
    line: number
    range: number[]
}

export type EditorCursorAction = {
    action: EditorCursorFunction
    time: BaseNoteTimeObj
    section: number
    prevsysuuid: string | undefined
    sysuuid: string
}

export type TimeLine = {
    totalDurationSec: number
    totalDurationTO: BaseNoteTimeObj // Total duration expressed as BaseNote units
    tempoactions: TempoAction[]
    sampleractions: SamplerAction[]
    animationactions: AnimationAction[]
    playercursoractions: PlayerCursorAction[]
    editorcursoractions: EditorCursorAction[]
    genericactions: GenericAction[]
    initialBPM: number
    notation: Record<Position, ReactElement<HTMLAttributes<HTMLParagraphElement>>[]>
}

// functions that should be called when creating the Tone.Transport schedule
export type ActionFunctions = {
    play: SamplerFunction | null
    animate: AnimationFunction | null
    playercursor?: PlayerCursorFunction | null
    editorcursor?: EditorCursorFunction | null
    generic: GenericFunction | null
}
