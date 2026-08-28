import type { NoteObject, Position } from '@tabuhstudio/shared'
import type { UUID } from '@tabuhstudio/shared/types/basetypes'
import type { HTMLAttributes, ReactElement } from 'react'
import * as Tone from 'tone'
import type { TimeObject } from 'tone/build/esm/core/type/Units'
import type { BeatSliceInfo } from './execution'
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
    noteObject: NoteObject
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
    prevSysUuid: UUID | undefined
    cursor: EditorCursor
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
    tempoFunction: TempoFunction // Tempo changes
    playFunction: SamplerFunction // Play a sample
    animateFunction: AnimationFunction // Animate an SVG image (e.g. panggul stroke, highlight)
    playerCursorFunction: PlayerCursorFunction // Animate the notation cursor in the player view.
    editorCursorFunction: EditorCursorFunction // Animate the notation cursor in the editor view.
    dashboardFunction: DashboardFunction // Update dashboard values (e.g. pass/iteration #, tempo)
    progressFunction: ProgressFunction // Update the value of the playback progress bar.
    finalizeFunction: GenericFunction // Function that is called at the end of the  playback.
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
    cursor: EditorCursor
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
    cursor?: EditorCursor
}

export type EditorCursor = { sysUuid: UUID; beatSlice: BeatSliceInfo; lastColumn: number }
