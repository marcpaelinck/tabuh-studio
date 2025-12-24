import * as Tone from 'tone'
import { debug } from '../utils/debugger'
import type { EditorCellCursor, EditorSystemData, AudioState } from '../models/types'
import { type AudioFunctionsType } from '../components/tabuheditor/contexts'
import { createTimelineFromEditor, scheduleTransport } from '../utils/createSchedule'
import { noCursor } from '../components/tabuheditor/_constants'

export type PlaybackType = 'single' | 'multiple' | 'none'
export type ActionType = 'load' | 'play' | 'pause' | 'stop' | 'cursor'
export type PlaybackState = { cursor: EditorCellCursor; audioState: AudioState; playbackType: PlaybackType }
export type playbackAction = {
    actionType: ActionType
    playbackType?: PlaybackType
    data?: EditorSystemData[]
    audiofunctions?: AudioFunctionsType
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

export function reducer(state: PlaybackState, action: playbackAction): PlaybackState {
    switch (action.actionType) {
        case 'load': {
            if (action.data && action.audiofunctions) {
                debug(`loading data for sys ${action.data[0].id}`, 'audioReducer')
                const timeLine = createTimelineFromEditor(action.data, {
                    play: action.audiofunctions.playInstrument,
                    animate: null,
                    cursor: action.audiofunctions.moveCursor,
                    generic: action.audiofunctions.genericFunction
                })
                scheduleTransport(timeLine)
                return { ...state, audioState: 'stopped' }
            }
            console.error('audio reducer: action is "load" but data or functions are missing.')
            return { ...state, cursor: noCursor, audioState: 'nodata' }
        }
        case 'play': {
            if (action.playbackType) {
                asyncPlay()
                return { ...state, audioState: 'playing', playbackType: action.playbackType }
            }
            console.error('audio reducer: action is "play" but playback type is missing.')
            return { ...state }
        }
        case 'pause': {
            Tone.getTransport().pause()
            return { ...state, audioState: 'paused' }
        }
        case 'stop': {
            Tone.getTransport().stop()
            Tone.getTransport().seconds = 0
            return { ...state, cursor: noCursor, audioState: 'nodata', playbackType: 'none' }
        }
        case 'cursor':
            if (action.cursor) {
                return { ...state, cursor: action.cursor }
            }
            console.error('audio reducer: action is "cursor" but cursor attribute is missing.')
            return { ...state }
    }
}
