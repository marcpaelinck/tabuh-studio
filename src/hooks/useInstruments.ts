import { useCallback, useMemo, type RefObject } from 'react'
import * as Tone from 'tone'
import {
    alwaysFocusPositions,
    AVERAGE_ATTACK_DELAY,
    BaseNote,
    defaultOutroTime,
    dimRateNonFocusedInstruments,
    NOTES,
    positionConfigs,
    SOUNDS_FOLDER
} from '../config/config'
import { soundFile } from '../config/configfunctions'
import type { SamplerAction } from '../models/types'
import { debug } from '../utils/debugger'
import { millis2BaseNoteEquiv } from '../utils/timeunits'

export type InstrumentSampler = {
    play: (time: number, action: SamplerAction, focus: string[]) => void
    mute: (time: number) => void
}

export type InstrumentSamplers = Record<string, InstrumentSampler>

// const pitchShift: Tone.PitchShift = new Tone.PitchShift({
//   pitch: 0.0, // 1 unit equals 100 cents
//   windowSize: 0.07,
//   delayTime: 0,
//   feedback: 0
// }
// ).toDestination();

const createSampler = ({
    instr_type,
    samples,
    volume
}: {
    instr_type: string
    samples: { [key: string]: string }
    volume: number
}) => {
    if (['daun', 'chimes'].includes(instr_type))
        // PitchShift currently disabled because it causes a slight time lag
        return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination() //.connect(pitchShift)
    else return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination()
}

const createSamplers = (): Record<string, Tone.Sampler> => {
    const entries = Object.entries(positionConfigs).map(([position, config]) => {
        return [
            position,
            createSampler({
                instr_type: config.type,
                samples: lookup[position].idx2sample,
                volume: config.volume
            }).toDestination()
        ]
    })
    return Object.fromEntries(entries)
}

const lookup = Object.fromEntries(
    Object.entries(positionConfigs).map(([position, config]) => {
        const noteList = [...new Set(Object.values(config.symbolToNoteNames).flat())]
        const indexToSample = Object.fromEntries(
            noteList.map((note, index) => [NOTES[index], soundFile(note, positionConfigs[position].sampletemplate)])
        )
        const noteToIndex = Object.fromEntries(noteList.map((notestr, index) => [notestr, NOTES[index]]))
        const symbolToIndices = Object.fromEntries(
            Object.entries(config.symbolToNoteNames).map(([symbol, notes]) => [
                symbol,
                notes.map((repr) => noteToIndex[repr])
            ])
        )
        return [position, { idx2sample: indexToSample, symbol2idxs: symbolToIndices }]
    })
)

const createInstrument = (
    position: string,
    samplers: Record<string, Tone.Sampler | null>,
    outroTime: number
): InstrumentSampler => {
    const sampler: Tone.Sampler | null = samplers[position]

    return {
        play: (time: number, action: SamplerAction, currentFocus: string[]) => {
            const dimValue =
                currentFocus.length == 0 || currentFocus.includes(position) || alwaysFocusPositions.includes(position)
                    ? 1
                    : dimRateNonFocusedInstruments
            debug(
                `focus=${JSON.stringify(currentFocus)} pos=${action.position}, dimvalue=${dimValue}`,
                useInstruments.name
            )
            const indices = lookup[position].symbol2idxs[action.cleanedSymbol]
            if (indices && samplers[position]) {
                var duration: Tone.Unit.TimeObject = action.duration
                // Extend the last note to allow the sound to attenuate
                //TODO Do not extend the last note when looping from the last note.
                if (action.isLast) {
                    //@ts-ignore
                    duration[BaseNote] += millis2BaseNoteEquiv(outroTime, action.bpm)
                }
                try {
                    sampler?.triggerAttackRelease(indices, duration, time, action.velocity * dimValue)
                } catch {
                    console.error(`ERROR: could not play sound ${action.position} ${action.cleanedSymbol} `)
                }
            }
        },
        mute: (time: number) => sampler?.releaseAll(time)
    }
}

export const useInstruments = (currentFocusRef: RefObject<string[]>, outroTime: number = defaultOutroTime) => {
    // See https://github.com/Tonejs/Tone.js/wiki/Using-Tone.js-with-React-React-Typescript-or-Vue`
    // const samplers: Record<string, Tone.Sampler | null> = Object.fromEntries(
    //     Object.keys(positionConfigs).map((position) => [position, null])
    // )

    const samplers: Record<string, Tone.Sampler | null> = useMemo(() => {
        return createSamplers()
    }, [currentFocusRef])

    const instrumentSamplers: InstrumentSamplers = useMemo(() => {
        return Object.fromEntries(
            Object.keys(positionConfigs).map((position) => [position, createInstrument(position, samplers, outroTime)])
        )
    }, [currentFocusRef])

    // Adds a small random deviation to the note attack time for a more realistic execution
    const random_attack_deviation = (time: number) =>
        time + (-1 + 2 * Math.random()) * Tone.Time(AVERAGE_ATTACK_DELAY).valueOf()

    const playInstrument = useCallback((time: number, action: SamplerAction) => {
        debug(
            `playing ${action.position} ${action.cleanedSymbol} ${action.time['16n']} ${action.duration['16n']} ${action.velocity} ${time}`,
            useInstruments.name
        )
        if (action.cleanedSymbol === '.') instrumentSamplers[action.position].mute(time)
        else {
            instrumentSamplers[action.position].play(random_attack_deviation(time), action, currentFocusRef.current)
        }
    }, [])

    const muteAll = useCallback(
        (time: number) =>
            Object.keys(instrumentSamplers).forEach((position) => instrumentSamplers[position].mute(time)),
        [instrumentSamplers]
    )

    return { playInstrument, muteAll }
}
