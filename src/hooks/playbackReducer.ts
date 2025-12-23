import * as Tone from 'tone'
import { debug } from '../utils/debugger'
import type { EditorCellCursor, EditorSystemData, AudioState } from '../models/types'
import { type AudioFunctionsType } from '../components/tabuheditor/contexts'
import { createTimelineFromEditor, scheduleTransport } from '../utils/createSchedule'
import { noCursor } from '../components/tabuheditor/_constants'

export type PlaybackState = { cursor: EditorCellCursor; audioState: AudioState }
export type playbackAction = {
    type: 'load' | 'play' | 'pause' | 'stop' | 'cursor'
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

export function playBack(state: PlaybackState, action: playbackAction): PlaybackState {
    switch (action.type) {
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
                return { cursor: state.cursor, audioState: 'stopped' }
            }
            console.error('audio reducer: action is "load" but data or functions are missing')
            return { cursor: noCursor, audioState: 'nodata' }
        }
        case 'play': {
            asyncPlay()
            return { cursor: state.cursor, audioState: 'playing' }
        }
        case 'pause': {
            Tone.getTransport().pause()
            return { cursor: state.cursor, audioState: 'paused' }
        }
        case 'stop': {
            Tone.getTransport().stop()
            Tone.getTransport().seconds = 0
            return { cursor: noCursor, audioState: 'nodata' }
        }
        case 'cursor':
            if (action.cursor) {
                return { cursor: action.cursor, audioState: state.audioState }
            }
            console.error('audio reducer: action is "cursor" but cursor attribute is missing')
            return { ...state }
    }
}
