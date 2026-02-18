import * as Tone from 'tone'
import { type AudioFunctionsType } from '../components/tabuheditor/contexts'
import { noCursor } from '../config/config'
import type { ActionFunctions, EditorCellCursor, EditorScore } from '../typing/types'
import { debug } from '../utils/debugger'
import { createPlaybackSchedule, createTimelineFromScore } from './playbackManager'
import { cycleValidation } from './validationManager'

export type PlaybackType = 'single' | 'multiple' | 'none'
export type ActionType = 'load' | 'play' | 'pause' | 'stop' | 'cursor' | 'reseterror'
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
    audiofunctions?: AudioFunctionsType
    actionFunctions?: ActionFunctions
    cursor?: EditorCellCursor
}
// const dialog = useDialog()

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

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
    switch (action.actionType) {
        case 'load': {
            if (!action.score || !action.audiofunctions) {
                console.error('audio reducer: action is "load" but data or functions are missing.')
                return { ...state, cursor: noCursor, audioState: 'nodata' }
            }

            const validation = cycleValidation(action.score)
            if (!validation.isValid) {
                debug('validating')
                // dialog.alert(validation.message, { title: 'Warning' })
                return { ...state, cursor: noCursor, audioState: 'error', message: validation.message }
            }

            debug(`executing 'load'`)
            debug(`loading data for sys ${action.score.systems[0].id}`)
            const loadAction = {
                ...action,
                actionFunctions: {
                    play: action.audiofunctions.playInstrument,
                    animate: null,
                    editorcursor: action.audiofunctions.moveEditorCursor,
                    generic: action.audiofunctions.genericFunction
                }
            }

            const timeLine = createTimelineFromScore(loadAction, true, 0, 1000)
            createPlaybackSchedule(timeLine)
            debug({ ...state, audioState: 'stopped' }, true)
            return { ...state, audioState: 'stopped' }
        }
        case 'play': {
            debug(`executing 'play'`)
            if (!['stopped', 'paused'].includes(state.audioState)) return { ...state }
            if (action.playbackType) {
                asyncPlay()
                debug({ ...state, audioState: 'playing', playbackType: action.playbackType }, true)
                return { ...state, audioState: 'playing', playbackType: action.playbackType }
            }
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
