import * as Tone from 'tone'
import type { TempoAction } from '../utils/score'

export function useInterpretations() {
    const changeTempo = (time: number, action: TempoAction) => {
        if (action.bpm != undefined) {
            // if (action.bpm[0] !== Tone.getTransport().bpm.getValueAtTime(action.time) || action.bpm[1] !== Tone.getTransport().bpm.getValueAtTime(action.time)) {
            if (action.bpm[0]) Tone.getTransport().bpm.setValueAtTime(action.bpm[0], time)
            if (action.bpm[1] != action.bpm[0]) {
                Tone.getTransport().bpm.linearRampTo(action.bpm[1], action.duration)
            }
            // }
        }
    }
    return { changeTempo }
}
