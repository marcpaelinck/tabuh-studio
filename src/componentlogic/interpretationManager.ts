import * as Tone from 'tone'
import type { PlaybackSamplerAction, PlaybackTempoAction } from '../typing/types'

export function changeTempo(time: number, action: PlaybackTempoAction | PlaybackSamplerAction, pbSpeed: number) {
    if (action != undefined) {
        // if (action.bpm[0] !== Tone.getTransport().bpm.getValueAtTime(action.time) || action.bpm[1] !== Tone.getTransport().bpm.getValueAtTime(action.time)) {
        Tone.getTransport().bpm.setValueAtTime(action.params.bpm * pbSpeed, time)
        // if (action.bpm[1] != action.bpm[0] && action.duration[BaseNote]) {
        // Tone.getTransport().bpm.rampTo(action.bpm[1], action.duration, "+0.001")
        // }
        // }
    }
}
