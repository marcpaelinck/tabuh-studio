import * as Tone from 'tone'
import { noCursor } from '../../config/config'
import type { PlaybackAction, PlaybackState } from '../../typing/playback'
import { debug } from '../../utils/debugger'
import { cycleValidation } from '../validationManager'
import { type SchedulePlaybackParams } from './usePlaybackManager'

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
        return { ...state, cursor: noCursor, audioState: 'nodata' }
    }

    if (!action.playbackType) {
        console.error('audio reducer: action is "load", playback type is missing.')
        return { ...state, cursor: noCursor, audioState: 'nodata' }
    }

    const validation = cycleValidation(action.score)
    if (!validation.isValid) {
        debug('validating')
        console.warn('Can not start playback, there is a cycle in the score.')
        // dialog.alert(validation.message, { title: 'Warning' })
        return { ...state, cursor: noCursor, audioState: 'error', message: validation.message }
    }

    debug(`executing 'load'`)
    debug(`loading data for sys ${action.score.systems[0].id}`)
    // const loadAction = { ...action }

    playbackFunctions.schedulePlayback({ pbAction: action, useCache: true })
    debug({ ...state, playbackType: action.playbackType, audioState: 'stopped' }, true)
    return { ...state, playbackType: action.playbackType, audioState: 'stopped' }
}

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
    switch (action.actionType) {
        case 'clear': {
            return { cursor: noCursor, audioState: 'nodata', playbackType: 'none' }
        }
        case 'load':
            state = loadData(state, action)
            return state
        case 'play': {
            debug(`executing 'play'`)
            if (state.audioState == 'nodata' || (action.playbackType && action.score))
                // New playback action: create a playback schedule
                state = loadData(state, { ...action, actionType: 'load' })
            if (!['stopped', 'paused'].includes(state.audioState)) return { ...state }
            asyncPlay()
            debug({ ...state, audioState: 'playing' }, true)
            return { ...state, audioState: 'playing' }
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
