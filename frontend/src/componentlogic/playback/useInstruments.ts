import { useCallback, useMemo, type RefObject } from 'react'
import * as Tone from 'tone'
import {
    alwaysFocusPositions,
    AVERAGE_ATTACK_DELAY,
    baseNoteSubdivision,
    defaultOutroTime,
    dimRateNonFocusedInstruments,
    NOTES,
    positionConfigs,
    SOUNDS_FOLDER
} from '../../config/config'
import { soundFile } from '../../config/configfunctions'
import type { Position } from '../../typing/basetypes'
import type { SamplerFunctionParameters } from '../../typing/playback'
import { debug } from '../../utils/debugger'
import { millis2BaseNoteEquiv } from '../../utils/timeunits'

export type InstrumentSampler = {
    play: (time: number, params: SamplerFunctionParameters, focusRef: RefObject<Position[]>) => void
    mute: (time: number) => void
}

export type InstrumentSamplers = Record<Position, InstrumentSampler>

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
    volume: Tone.Unit.Decibels
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
            noteList.map((note, index) => [
                NOTES[index],
                soundFile(note, positionConfigs[position as Position].sampletemplate)
            ])
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
    position: Position,
    samplers: Record<Position, Tone.Sampler | null>,
    outroTime: number
): InstrumentSampler => {
    const sampler: Tone.Sampler | null = samplers[position]

    return {
        play: (time: number, params: SamplerFunctionParameters, focusRef: RefObject<Position[]>) => {
            const dimValue =
                focusRef.current.length == 0 ||
                focusRef.current.includes(position) ||
                alwaysFocusPositions.includes(position)
                    ? 1
                    : dimRateNonFocusedInstruments
            console.log(`focus=${JSON.stringify(focusRef)} pos=${params.position}, dimvalue=${dimValue}`)
            debug(`focus=${JSON.stringify(focusRef)} pos=${params.position}, dimvalue=${dimValue}`)
            const indices = lookup[position].symbol2idxs[params.symbol]
            if (indices && samplers[position]) {
                var duration: Tone.Unit.TimeObject = params.duration
                // Extend the last note to allow the sound to attenuate
                //TODO Do not extend the last note when looping from the last note.
                if (params.isLast) {
                    //@ts-ignore
                    duration[baseNoteSubdivision] += millis2BaseNoteEquiv(outroTime, params.bpm)
                }
                try {
                    sampler?.triggerAttackRelease(indices, duration, time, params.velocity * dimValue)
                } catch {
                    console.error(`ERROR: could not play sound ${params.position} ${params.symbol} `)
                }
            }
        },
        mute: (time: number) => sampler?.releaseAll(time)
    }
}

export const useInstruments = (focusRef: RefObject<Position[]>, outroTime: number = defaultOutroTime) => {
    // See https://github.com/Tonejs/Tone.js/wiki/Using-Tone.js-with-React-React-Typescript-or-Vue`
    // const samplers: Record<string, Tone.Sampler | null> = Object.fromEntries(
    //     Object.keys(positionConfigs).map((position) => [position, null])
    // )

    const samplers: Record<string, Tone.Sampler | null> = useMemo(() => {
        return createSamplers()
    }, [])

    const instrumentSamplers: InstrumentSamplers = useMemo(() => {
        return Object.fromEntries(
            Object.keys(positionConfigs).map((position) => [
                position as Position,
                createInstrument(position as Position, samplers, outroTime)
            ])
        ) as Record<Position, InstrumentSampler>
    }, [])

    // Adds a small random deviation to the note attack time for a more realistic execution
    const random_attack_deviation = (time: number) =>
        time + (-1 + 2 * Math.random()) * Tone.Time(AVERAGE_ATTACK_DELAY).valueOf()

    const playInstrument = useCallback((time: number, params: SamplerFunctionParameters) => {
        debug(
            `playing ${params.position} ${params.symbol} ${time} ${params.duration['16n']} ${params.velocity} ${time}`
        )
        if (params.symbol === '.') instrumentSamplers[params.position].mute(time)
        else {
            instrumentSamplers[params.position].play(random_attack_deviation(time), params, focusRef)
        }
    }, [])

    const muteAll = useCallback(
        (time: number) =>
            Object.keys(instrumentSamplers).forEach((position) => instrumentSamplers[position as Position].mute(time)),
        [instrumentSamplers]
    )

    return { playInstrument, muteAll }
}
