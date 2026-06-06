import type { NoteObject } from '@tabuhstudio/shared'
import type { HTMLAttributes, ReactElement } from 'react'
import * as Tone from 'tone'
import type { TimeObject } from 'tone/build/esm/core/type/Units'
import type { MutingType, Position, StrokeLocation, ToneType, UUID } from './basetypes'
import type { Score } from './score'

// PLAYBACK SCHEDULING

export type PlaybackType = 'single' | 'multiple' | 'none'

export type GenericFunction = (time: number, params: {}) => void

export type GenericAction = { time: TimeObject; params: {} }

export interface TempoFunctionParameters {
    bpm: Tone.Unit.NormalRange
    pbSpeed: number
}

export type TempoFunction = (time: number, params: TempoFunctionParameters) => void

export interface PlaybackTempoAction {
    time: TimeObject
    params: TempoFunctionParameters
}

export interface SamplerFunctionParameters {
    position: Position
    note: NoteObject
    bpm: number
    velocity: Tone.Unit.NormalRange
    duration: TimeObject
    isLast: boolean
    isLastOfMotif: boolean
}

export type SamplerFunction = (time: number, params: SamplerFunctionParameters) => void

export interface PlaybackSamplerAction {
    time: TimeObject
    timeMs: number
    ismuted: boolean
    params: SamplerFunctionParameters
}

export interface AnimationNote {
    time: TimeObject
    keyname: string
    tone: ToneType
    stroke: StrokeLocation | null
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
    params: AnimmationFunctionParameters
}

export interface PlayerCursorParameters {
    position: Position
    beat: number
    sysuuid: UUID
    line: number
    range: number[]
}

export type PlayerCursorFunction = (time: number, params: PlayerCursorParameters) => void

export type PlaybackPlayerCursorAction = { time: TimeObject; functionName: string; params: PlayerCursorParameters }

export interface EditorCursorParameters {
    prevsysuuid: UUID | undefined
    sysuuid: UUID
    beat: number
}

export type PlaybackEditorCursorAction = { time: TimeObject; params: EditorCursorParameters }

export interface DashboardParameters {
    system: number | undefined
    pass: number
    iteration: number
    tempo: number
    dynamics: number // TODO: DynamicsValue
}

export type EditorCursorFunction = (time: number, params: EditorCursorParameters) => void

export type DashboardFunction = (time: number, params: DashboardParameters) => void

export type PlaybackDashboardAction = { time: TimeObject; params: DashboardParameters }

export type ProgressFunction = (time: number, params: {}) => void

export type PlaybackProgressFunctionAction = { time: TimeObject; params: {} }

// Callback functions used when creating a playback schedule in Tone.Transport
export interface PlaybackCallbackFunctions {
    tempo: TempoFunction
    play: SamplerFunction
    animate: AnimationFunction
    playercursor: PlayerCursorFunction
    editorcursor: EditorCursorFunction
    updatedashboard: DashboardFunction
    progress: ProgressFunction
    generic: GenericFunction
}

export type TimeLine = {
    playbackAction: PlaybackAction
    totalDurationMs: number
    totalDurationTO: TimeObject // Total duration expressed as BaseNote units
    tempoactions: PlaybackTempoAction[]
    sampleractions: PlaybackSamplerAction[]
    animationactions: PlaybackAnimationAction[]
    playercursoractions: PlaybackPlayerCursorAction[]
    editorcursoractions: PlaybackEditorCursorAction[]
    dashboardactions: PlaybackDashboardAction[]
    genericactions: GenericAction[]
    notation: Partial<Record<Position, ReactElement<HTMLAttributes<HTMLParagraphElement>>[]>>
}

// PLAYBACK REDUCER

export type ActionType =
    | 'load' // Load a playback schedule into the ToneJS Transport object.
    | 'play' // Play from current cursor position. Perform 'load' action first if no schedule is set.
    | 'pause' // Pause playback.
    | 'stop' // Stop playback and reset playback cursor.
    | 'rewind' // Reset playback cursor.
    | 'jumptotime' // Move playback cursor to given position.
    | 'cursor' // Move the editor cursor.
    | 'clear' // Clear the playback schedule.
    | 'reseterror' // Clear error state and stop playback.

export type AudioState = 'playing' | 'paused' | 'stopped' | 'nodata' | 'error'

export type PlaybackState = {
    cursor: EditorCellCursor
    audioState: AudioState
    playbackType: PlaybackType
    message?: string
}

export type PlaybackAction = {
    actionType: ActionType
    playbackType?: PlaybackType // 'single': playback a single system. 'multiple' playback until end.
    score?: Score
    systemIndex?: number // system from which the playback should start.
    seconds?: number // used with actionType='jumptotime': new cursor position relative to start.
    cursor?: EditorCellCursor
    intro?: number // silence before start of playback in ms
    outro?: number // silence after end of playback in ms
}

export type EditorCellCursor = { sysUuid: UUID; beat: number }
