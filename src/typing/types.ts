import type { HTMLAttributes, ReactElement } from 'react'
import * as Tone from 'tone'
import type { TimeObject } from 'tone/build/esm/core/type/Units'
import type { MutingType, StrokeType, ToneType } from '../config/config'

// INSTRUMENTS / AUDIO
export type Instrument = { id: string; name: string; alphabet: string[] }
export type Position =
    | 'CALUNG'
    | 'CENGCENG'
    | 'GENDER_RAMBAT'
    | 'GONGS'
    | 'JEGOGAN'
    | 'KANTILAN_POLOS'
    | 'KANTILAN_SANGSIH'
    | 'KEMPLI'
    | 'KENDANG'
    | 'KENDANG_LANANG'
    | 'KENDANG_WADON'
    | 'PEMADE_POLOS'
    | 'PEMADE_SANGSIH'
    | 'PENYACAH'
    | 'REYONG_1'
    | 'REYONG_2'
    | 'REYONG_3'
    | 'REYONG_4'
    | 'TROMPONG'
    | 'UGAL'

export type UUID = string

// NOTATION

export type NoteSymbol = string
export type BPM = number
export type TimeInBasenoteEquiv = number
export type DurationInBasenoteEquiv = number

export type Note = {
    tone: ToneType // corresponds with a specific key, chime, gong or (in case of a kendang) type of stroke.
    octave: number | null // Scale always start with DING.
    stroke: StrokeType | null // Striking location or method in case multiple ways exist to strike a key, chime or gong.
    muting: MutingType // whether and how the key, chime or gong is muted (OPEN, ABBREVIATED or MUTED)
}

export type JsonNote = {
    sysUuid: UUID
    section: number
    s: NoteSymbol
    t: number // attack time in base notes
    ms: number // attack time in ms
    d: number
    v: number // velocity
}

// Used as
export type JsonSymbol = {
    sysUuid: UUID
    sectionId: number
    s: NoteSymbol
    t: number // attack time in base notes
    d: number
}

export type ScoreFormat = 'JSON' | 'Laras' | 'Notation'

export type ScoreInfo = {
    title: string
    uuid: UUID
    instrumentgroup: string
    file: string
    notationversion: string
    pdf: string
}

// NEW SCORE OBJECT DEFINITIONS
//TODO the following definitions will replace Score, System, Section and Measure
// EDIT TABLE: contains system data in a format that can easily be displayed in the editor
// Notation of one section for one instrument position
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
    notationGroups?: GroupedNotation[] // Staves of an imported Notation assigned to multiple positions.
    editorGroup: string[] // positions that are/were grouped in one line in the editor.
    staffs: Staffs // Contains the notation as a sequence of measures for each position.
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
    instrumenttype: string
    parts: Record<string, UUID[]> // <<part name>, <system uuid>[]>
    positions: Position[] // sorted list of positions ordered as displayed in the editor
    systems: System[]
    hasCycle: boolean
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

// SCORE MENU

export interface ScoreMenuOption {
    value: ScoreInfo
    label: string
}

export type menuValueType = string | number | null | (string | number | null)[] | ScoreInfo | undefined

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

export interface HighlightRange {
    line: number
    range: number[]
}
export type HilightRangeFunction = (hlRange: HighlightRange) => void

// EXECUTION
// These objects contain information for playing the notation.
// Flow instructions: determine the playing sequence (goto and loop).
// Expression instructions: contain tempo and dynamics information.

export type ExecutionItemType = 'goto' | 'loop' | 'wait' | 'tempo' | 'dynamics' | 'sequence' | 'suppress'

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

// Enables to repeat the current System.
export interface LoopItem extends ExecutionItemBase {
    type: 'loop'
    count: number // Total number of times to play the System consecutively.
}

// Enables to execute gongans in a specific sequence.
export interface SequenceItem extends ExecutionItemBase {
    type: 'sequence'
    labels: string[] // sequence of gongan labels
    uuids: string[] // uuids of the gongans in the sequence
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

export type DynamicsValue = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff'

export interface DynamicsItem extends ExpressionItemBase {
    type: 'dynamics'
    fromDynamics?: DynamicsValue // If isGradual==true: starting value for gradual change. Otherwise undefined.
    dynamics: DynamicsValue // If isGradual==true: end value of the gradual change. Otherwise: new immediate value.
    positions: Position[] // Positions for which the dynamics apply
}

export type FlowItem = GotoItem | LoopItem | SequenceItem | WaitItem
export type ExpressionItem = TempoItem | DynamicsItem
export type ExecutionItem = FlowItem | ExpressionItem | SuppressItem

export type EditorCellCursor = { sysUuid: UUID; measure: number }

// SCORE PROCESSING AND TIMELINE CREATION

export type PlaybackFunctionName = ''

export type GenericFunction = (time: number, params: {}) => void
export type GenericAction = { time: TimeObject; function: GenericFunction; params: {} }

export interface TempoFunctionParameters {
    bpm: Tone.Unit.NormalRange
    pbSpeed: number
}
export type TempoFunction = (time: number, params: TempoFunctionParameters) => void
export interface PlaybackTempoAction {
    time: TimeObject
    function: TempoFunction
    params: TempoFunctionParameters
}

export interface SamplerFunctionParameters {
    position: Position
    symbol: NoteSymbol
    bpm: number
    velocity: Tone.Unit.NormalRange
    duration: TimeObject
    isLast: boolean
    isLastOfPattern: boolean
}
export type SamplerFunction = (time: number, params: SamplerFunctionParameters) => void
export interface PlaybackSamplerAction {
    time: TimeObject
    timeMs: number
    function: SamplerFunction
    params: SamplerFunctionParameters
}

export interface AnimationNote {
    time: TimeObject
    keyname: string
    tone: ToneType
    stroke: StrokeType | null
    muting: MutingType
    duration: TimeObject
    isLast: boolean
}
export interface AnimmationFunctionParameters {
    position: Position
    currnotes: AnimationNote[]
    nextnotes: AnimationNote[]
    timeuntilMs: number
}
export type AnimationFunction = (time: number, params: AnimmationFunctionParameters) => void
export interface PlaybackAnimationAction {
    time: TimeObject
    function: AnimationFunction
    params: AnimmationFunctionParameters
}
export interface PlayerCursorParameters {
    position: Position
    section: number
    sysuuid: UUID
    symbol: NoteSymbol
    line: number
    range: number[]
}
export type PlayerCursorFunction = (time: number, params: PlayerCursorParameters) => void
export type PlaybackPlayerCursorAction = {
    time: TimeObject
    functionName: string
    function: PlayerCursorFunction
    params: PlayerCursorParameters
}

export interface EditorCursorParameters {
    prevsysuuid: UUID | undefined
    sysuuid: UUID
    section: number
}
export type EditorCursorFunction = (time: number, params: EditorCursorParameters) => void
export type PlaybackEditorCursorAction = {
    time: TimeObject
    function: EditorCursorFunction
    params: EditorCursorParameters
}

export type ProgressFunction = (time: number, params: {}) => void
export type PlaybackProgressFunctionAction = { time: TimeObject; function: ProgressFunction; params: {} }

// Callback functions used when creating a playback schedule in Tone.Transport
export interface PlaybackCallbackFunctions {
    tempo: TempoFunction
    play: SamplerFunction
    animate: AnimationFunction
    playercursor: PlayerCursorFunction
    editorcursor: EditorCursorFunction
    progress: ProgressFunction
    generic: GenericFunction
}

// PLAYBACK SCHEDULING

export type TimeLine = {
    totalDurationMs: number
    totalDurationTO: TimeObject // Total duration expressed as BaseNote units
    tempoactions: PlaybackTempoAction[]
    sampleractions: PlaybackSamplerAction[]
    animationactions: PlaybackAnimationAction[]
    playercursoractions: PlaybackPlayerCursorAction[]
    editorcursoractions: PlaybackEditorCursorAction[]
    genericactions: GenericAction[]
    notation: Partial<Record<Position, ReactElement<HTMLAttributes<HTMLParagraphElement>>[]>>
}

// WordPress API
export type WpUserRecord = {
    ID: string
    user_login?: string
    user_nicename?: string
    user_email?: string
    user_registered?: string
    user_status?: string
    display_name: string
    roles: string[]
}

export type WpUserReturnValue = { logged_in: boolean; user: WpUserRecord; nonce: string } | undefined
export type WpDatabaseReturnValue = { success: boolean; result: any[]; nonce: string } | undefined
