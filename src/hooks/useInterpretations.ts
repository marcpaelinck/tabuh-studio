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

export const setTempo = (time: Tone.Unit.TimeObject, action: TempoAction) => {
    if (action.bpm != undefined) {
        // if (action.bpm[0] !== Tone.getTransport().bpm.getValueAtTime(time) || action.bpm[1] !== Tone.getTransport().bpm.getValueAtTime(time)) {
        const timeSeconds: number = Tone.getTransport().getSecondsAtTime(time)
        if (action.bpm[1]) {
            console.log(`${time['16n']} (${timeSeconds}): Setting bpm to ${action.bpm[0]}`)
            Tone.getTransport().bpm.setValueAtTime(action.bpm[0], timeSeconds)
        }
        if (action.bpm[1] != action.bpm[0]) {
            console.log(`${time['16n']} (${timeSeconds}): Ramping bpm to ${action.bpm[1]} over ${action.duration['16n']}`)
            Tone.getTransport().bpm.rampTo(action.bpm[1], action.duration, timeSeconds)
            // const endMeasure = (time['16n'] ? time['16n'] : 0) + (action.duration['16n'] ? action.duration['16n'] : 4)
            // const endMeasure_4 = (time['16n'] ? time['16n'] : 0) + (action.duration['16n'] ? action.duration['16n'] + 4 : 4)
            // console.log(`Tempo at ${halfMeasure}: ${Tone.getTransport().bpm.getValueAtTime({ '16n': halfMeasure })}, at ${endMeasure}: ${Tone.getTransport().bpm.getValueAtTime({ '16n': endMeasure })}, at ${endMeasure_4}: ${Tone.getTransport().bpm.getValueAtTime({ '16n': endMeasure_4 })}`)
        }
    }
}
