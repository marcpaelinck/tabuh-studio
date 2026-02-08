import * as Tone from 'tone'
import { noCursor } from '../components/tabuheditor/_constants'
import { type AudioFunctionsType } from '../components/tabuheditor/contexts'
import type { ActionFunctions, EditorCellCursor, EditorScore } from '../models/types'
import { debug } from '../utils/debugger'
import { createPlaybackSchedule, createTimelineFromEditor } from './playbackManager'

export type PlaybackType = 'single' | 'multiple' | 'none'
export type ActionType = 'load' | 'play' | 'pause' | 'stop' | 'cursor'
export type AudioState = 'nodata' | 'playing' | 'paused' | 'stopped'

export type PlaybackState = { cursor: EditorCellCursor; audioState: AudioState; playbackType: PlaybackType }
export type PlaybackAction = {
    actionType: ActionType
    playbackType?: PlaybackType
    data?: EditorScore
    systemIndex?: number
    audiofunctions?: AudioFunctionsType
    actionFunctions?: ActionFunctions
    cursor?: EditorCellCursor
}
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
            debug(`executing 'load'`)
            if (action.data && action.audiofunctions) {
                debug(`loading data for sys ${action.data.systems[0].id}`)
                const loadAction = {
                    ...action,
                    actionFunctions: {
                        play: action.audiofunctions.playInstrument,
                        animate: null,
                        editorcursor: action.audiofunctions.moveEditorCursor,
                        generic: action.audiofunctions.genericFunction
                    }
                }
                const timeLine = createTimelineFromEditor(loadAction, true)
                createPlaybackSchedule(timeLine)
                debug({ ...state, audioState: 'stopped' }, true)
                return { ...state, audioState: 'stopped' }
            }
            console.error('audio reducer: action is "load" but data or functions are missing.')
            return { ...state, cursor: noCursor, audioState: 'nodata' }
        }
        case 'play': {
            debug(`executing 'play'`)
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
        default:
            return state
    }
}
