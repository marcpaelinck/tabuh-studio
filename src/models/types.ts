import type { HTMLAttributes, ReactElement } from 'react'
import * as Tone from 'tone'
import type { BaseNoteTimeObj, MutingType, StrokeType, ToneType } from '../config/config'

// INSTRUMENTS / AUDIO
export type Instrument = { id: string; name: string; alphabet: string[] }

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
    tempo: [number, number]
    velocity: [number, number]
    notes: JsonNote[]
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
    staves: { [position: string]: Measure } //TODO: rename to `measures`. Needs to be renamed in all input files too.
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

export type ScoreInfo = { title: string; instrumentgroup: string; file: string; notationversion: string; pdf: string }

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

// EDIT TABLE: contains system data in a format that can easily be displayed in the editor
export type Staffs = Record<string, Measure[]>

export type EditorSystemData = {
    uuid: string // unique uuid, never changes
    id: number // system id as shown to user, starts with 1, can change when data items are  added / deleted
    index: number // row index, starts with 0, can change when data items are added / deleted
    part: string
    positions: string[] // sorted list of positions ordered as displayed in the editor
    grouped: string[] // positions that are/were grouped in the editor for simultaneous editing using casting rules.
    staffs: Staffs // Contains the notation as a sequence of measures for each position.
    colWidths: number[]
    label?: string
    goto?: string // label or id of system to which the goto points
    gotokey?: string // uuid of system to which the goto points
    copyfrom?: string // label or id of copied system
    copyfromkey?: string // uuid copied system
}

export type EditorScore = { parts: Record<string, string>; systems: EditorSystemData[] }

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
    position: string
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
    position: string
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
    position: string
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
    notation: { [position: string]: ReactElement<HTMLAttributes<HTMLParagraphElement>>[] }
}

// functions that should be called when creating the Tone.Transport schedule
export type ActionFunctions = {
    play: SamplerFunction | null
    animate: AnimationFunction | null
    playercursor?: PlayerCursorFunction | null
    editorcursor?: EditorCursorFunction | null
    generic: GenericFunction | null
}
