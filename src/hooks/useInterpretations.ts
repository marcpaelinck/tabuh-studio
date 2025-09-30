import { useState } from 'react'
import * as Tone from 'tone'
import type { DynamicsAction, TempoAction } from '../utils/score'

type Velocities = {
    [position: string]: number
}

export function useInterpretations() {
    const [tempo, setTempo] = useState<number>(60)
    const [velocities, setVelocities] = useState<Velocities>({})

    const initDynamics = (velocities: Velocities) => { setVelocities(velocities) }

    const changeTempo = (time: number, action: TempoAction) => {
        if (action.bpm != undefined) {
            if (action.bpm[0] !== Tone.getTransport().bpm.value || action.bpm[1] !== Tone.getTransport().bpm.value) {
                if (action.bpm[0]) Tone.getTransport().bpm.setValueAtTime(action.bpm[0], time)
                if (action.bpm[1]) Tone.getTransport().bpm.rampTo(action.bpm[1], action.duration, time)
            }
        }
    }
    const changeDynamics = (time: number, action: DynamicsAction) => {
        //TODO implement
    }
    return { tempo, changeTempo, initDynamics, changeDynamics }
}
