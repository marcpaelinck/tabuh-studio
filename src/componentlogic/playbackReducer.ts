import * as Tone from 'tone'
import { noCursor } from '../config/config'
import type { EditorCellCursor, EditorScore } from '../typing/types'
import { debug } from '../utils/debugger'
import { type SchedulePlaybackParams } from './usePlaybackManager'
import { cycleValidation } from './validationManager'

export type PlaybackType = 'single' | 'multiple' | 'none'
export type ActionType =
    | 'load'
    | 'play'
    | 'pause'
    | 'stop'
    | 'rewind'
    | 'jumptotime'
    | 'cursor'
    | 'clear'
    | 'reseterror'
export type AudioState = 'playing' | 'paused' | 'stopped' | 'nodata' | 'error'

export type PlaybackState = {
    cursor: EditorCellCursor
    audioState: AudioState
    playbackType: PlaybackType
    message?: string
}
export type PlaybackAction = {
    actionType: ActionType
    playbackType?: PlaybackType
    score?: EditorScore
    systemIndex?: number
    seconds?: number
    cursor?: EditorCellCursor
    intro?: number // silence before start of playback in ms
    outro?: number // silence after end of playback in ms
}
// const dialog = useDialog()

const playbackFunctions = {
    schedulePlayback: (parms: SchedulePlaybackParams) => {},
    setPlaybackProgress: (seconds: number) => {},
    playbackSpeed: 1
}

// const actionFunctions: PlaybackCallbackFunctions = defaultPlaybackFunctions
// var schedulePlayback: (parms: SchedulePlaybackParams) => void
// var playbackSpeed: number

async function asyncPlay() {
    if (Tone.getContext().state == 'suspended') {
        Tone.start()
        await Tone.loaded()
    }
    if (Tone.getTransport().state !== 'started') {
        // Wait for the transport's schedule to be complete
        await new Promise((resolve) => setTimeout(resolve, 500))
        Tone.getTransport().start()
    }
}

// This function enables to pass the playbackScheduleFunctions to the playbackReducer.
export function playbackReducerFactory(
    // actionFunc: PlaybackCallbackFunctions,
    schedulePlayback: (parms: SchedulePlaybackParams) => void,
    setPlaybackProgress: (seconds: number) => void
) {
    // playbackFunctions.actionFunctions = actionFunc
    playbackFunctions.schedulePlayback = schedulePlayback
    playbackFunctions.setPlaybackProgress = setPlaybackProgress
    return playbackReducer
}

function loadData(state: PlaybackState, action: PlaybackAction): PlaybackState {
    if (!action.score) {
        console.error('audio reducer: action is "load" but data or functions are missing.')
        return { ...state, cursor: noCursor, audioState: 'nodata' }
    }

    const validation = cycleValidation(action.score, true)
    if (!validation.isValid) {
        debug('validating')
        // dialog.alert(validation.message, { title: 'Warning' })
        return { ...state, cursor: noCursor, audioState: 'error', message: validation.message }
    }

    debug(`executing 'load'`)
    debug(`loading data for sys ${action.score.systems[0].id}`)
    // const loadAction = { ...action }

    playbackFunctions.schedulePlayback({ pbAction: action, useCache: true })
    debug({ ...state, audioState: 'stopped' }, true)
    return { ...state, audioState: 'stopped' }
}

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
    switch (action.actionType) {
        case 'clear': {
            return { cursor: noCursor, audioState: 'nodata', playbackType: 'none' }
        }
        case 'play': {
            debug(`executing 'play'`)
            if (state.audioState == 'nodata' || (action.playbackType && action.score))
                // New playback action: create a playback schedule
                state = loadData(state, { ...action, actionType: 'load' })
            if (!['stopped', 'paused'].includes(state.audioState)) return { ...state }
            // if (action.playbackType) {
            asyncPlay()
            debug({ ...state, audioState: 'playing' }, true)
            return { ...state, audioState: 'playing' }
            // }
            console.error('audio reducer: action is "play" but playback type is missing.')
            return state
        }
        case 'pause': {
            debug(`executing 'pause'`)
            Tone.getTransport().pause()
            return { ...state, audioState: 'paused' }
        }
        case 'stop': {
            debug(`executing 'stop'`)
            Tone.getTransport().stop()
            Tone.getTransport().seconds = 0
            return { ...state, cursor: noCursor, audioState: 'nodata', playbackType: 'none' }
        }
        case 'rewind': {
            if (!['playing', 'paused'].includes(state.audioState)) return { ...state }
            Tone.getTransport().stop()
            Tone.getTransport().seconds = 0
            playbackFunctions.setPlaybackProgress(0)
            return { ...state, audioState: 'paused' }
        }
        case 'jumptotime':
            if (!action.seconds || !['playing', 'paused'].includes(state.audioState)) return { ...state }
            Tone.getTransport().stop()
            Tone.getTransport().seconds = action.seconds
            Tone.getTransport().start()
            playbackFunctions.setPlaybackProgress(action.seconds)
            return { ...state }
        case 'cursor':
            debug(`executing 'cursor'`)
            if (action.cursor) {
                debug(`cursor action is ${JSON.stringify(action)}`)
                debug({ ...state, cursor: action.cursor }, true)
                return { ...state, cursor: action.cursor }
            }
            console.error('audio reducer: action is "cursor" but cursor attribute is missing.')
            return state
        case 'reseterror': {
            debug(`resetting error`)
            return { ...state, audioState: 'stopped', message: undefined }
        }
        default:
            return state
    }
}
