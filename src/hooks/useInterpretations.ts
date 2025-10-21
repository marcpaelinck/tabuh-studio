import * as Tone from 'tone'
import type { TempoAction } from '../utils/score'

export function useInterpretations() {
    const changeTempo = (time: number, action: TempoAction) => {
        if (action.bpm != undefined) {
            if (action.bpm[0] !== Tone.getTransport().bpm.value || action.bpm[1] !== Tone.getTransport().bpm.value) {
                if (action.bpm[0]) Tone.getTransport().bpm.setValueAtTime(action.bpm[0], time)
                if (action.bpm[1] != action.bpm[0]) Tone.getTransport().bpm.rampTo(action.bpm[1], action.duration, time)
            }
        }
    }
    return { changeTempo }
}
