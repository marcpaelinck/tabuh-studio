import type { Position } from '@tabuhstudio/shared'
import { positionConfigs, positionGroups } from '@tabuhstudio/shared/config/position'
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import * as Tone from 'tone'
import {
    alwaysFocusPositions,
    AVERAGE_ATTACK_DELAY,
    baseNoteSubdivision,
    dimRateNonFocusedInstruments,
    NOTES,
    playerOutroTime,
    SOUNDS_FOLDER
} from '../../config/config'
import { useUserSelectionStore } from '../../stores/useUserSettingsStore'
import type { SamplerFunctionParameters } from '../../typing/playback'
import { debug } from '../../utils/debugger'
import { millis2BaseNoteEquiv } from '../../utils/timeunits'

export type InstrumentSampler = {
    play: (
        time: number,
        params: SamplerFunctionParameters,
        focusRef: RefObject<Position[]>,
        panggulRef: RefObject<Position[]>
    ) => void
    mute: (time: number) => void
}

export type InstrumentSamplers = Record<Position, InstrumentSampler>

// const pitchShift: Tone.PitchShift = new Tone.PitchShift({
//     pitch: 5.0, // 1 unit equals 100 cents
//     windowSize: 0.07,
//     delayTime: 0,
//     feedback: 0
// })

const lowpassFilter = new Tone.Filter({
    frequency: 5000, // Cutoff frequency in Hz
    type: 'lowpass', // Filter type
    rolloff: -48 // Steepness (-12, -24, or -48 dB/octave)
})

function lowpassFrequency(velocity: number): number {
    const minFreq = 500
    const maxFreq = 8000
    return minFreq + (maxFreq - minFreq) * velocity
}

const createSampler = ({
    isMelodic,
    samples,
    volume
}: {
    isMelodic: boolean
    samples: { [key: string]: string }
    volume: Tone.Unit.Decibels
}) => {
    if (isMelodic)
        // filter needs to be checked first. Doesn't seem to work.
        //     return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).chain(lowpassFilter).toDestination()
        // else return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).chain(lowpassFilter).toDestination()
        return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination()
    else return new Tone.Sampler({ urls: samples, baseUrl: SOUNDS_FOLDER, volume }).toDestination()
}

const createSamplers = (): Record<string, Tone.Sampler> => {
    const entries = Object.entries(positionConfigs).map(([position, config]) => {
        return [
            position,
            createSampler({
                isMelodic: positionGroups.MELODIC.positions.includes(position as Position),
                samples: lookup[position].idx2sample,
                volume: config.volume
            })
        ]
    })
    return Object.fromEntries(entries)
}

export function soundFile(note: string, fileTemplate: string): string {
    return fileTemplate.replace('{note}', note)
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

/**
 * The Western note name(s) a symbol maps to for a given position — the same mapping the
 * sampler uses to pick samples (see `lookup`). Returns 0..n names (a key can trigger
 * several pitches, e.g. octave doubling). Reused by the MIDI export so exported pitches
 * match playback. Note: these are 12-TET nominal names, not true pelog/slendro tuning.
 */
export function noteNamesForSymbol(position: Position, canonicalSymbol: string): string[] {
    return lookup[position]?.symbol2idxs[canonicalSymbol] ?? []
}

const createInstrument = (
    position: Position,
    samplers: Record<Position, Tone.Sampler | null>,
    outroTime: number
): InstrumentSampler => {
    const sampler: Tone.Sampler | null = samplers[position]

    return {
        play: (
            time: number,
            params: SamplerFunctionParameters,
            focusRef: RefObject<Position[]>,
            panggulRef: RefObject<Position[]>
        ) => {
            // dimValue = 1 if
            // - no focus is selected or
            // - active panggul is selected and params.position corresponds with a panggul position or
            // - no active panggul is selecte and params.position corresponds with a focus position or
            // - position is labeled as 'always focus'
            const currentFocus = focusRef.current
            const activePanggul = panggulRef.current
            const dimValue =
                currentFocus.length == 0 ||
                (activePanggul.length > 0 && activePanggul.includes(position)) ||
                (activePanggul.length == 0 && currentFocus.includes(position)) ||
                alwaysFocusPositions.includes(position)
                    ? 1
                    : dimRateNonFocusedInstruments
            if (position == 'PEMADE_POLOS')
                debug(`focus=${JSON.stringify(focusRef.current)} pos=${params.position}, dimvalue=${dimValue}`)
            const indices = lookup[position].symbol2idxs[params.note.canonicalSymbol]
            if (indices && samplers[position]) {
                var duration: Tone.Unit.TimeObject = params.duration
                // Extend the last note to allow the sound to attenuate
                //TODO Do not extend the last note when looping from the last note.
                if (params.isLast) {
                    //@ts-ignore
                    duration[baseNoteSubdivision] += millis2BaseNoteEquiv(outroTime, params.bpm)
                }
                try {
                    lowpassFilter.frequency.setValueAtTime(lowpassFrequency(params.velocity * dimValue), time)
                    sampler?.triggerAttackRelease(indices, duration, time, params.velocity * dimValue)
                } catch {
                    console.error(`ERROR: could not play sound ${params.position} ${JSON.stringify(params)} `)
                }
            }
        },
        mute: (time: number) => sampler?.releaseAll(time)
    }
}

export const useInstruments = (outroTime: number = playerOutroTime) => {
    // See https://github.com/Tonejs/Tone.js/wiki/Using-Tone.js-with-React-React-Typescript-or-Vue`
    // const samplers: Record<string, Tone.Sampler | null> = Object.fromEntries(
    //     Object.keys(positionConfigs).map((position) => [position, null])
    // )

    const samplers: Record<string, Tone.Sampler | null> = useMemo(() => {
        return createSamplers()
    }, [])
    const { selectedFocusOption, selectedPanggulOption } = useUserSelectionStore()
    const focusRef = useRef<Position[]>([])
    const panggulRef = useRef<Position[]>([])

    useEffect(() => {
        focusRef.current = selectedFocusOption.objValue
    }, [selectedFocusOption])
    useEffect(() => {
        panggulRef.current = selectedPanggulOption.objValue
    }, [selectedPanggulOption])

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
        // debug(
        //     `playing ${params.position} ${params.note.toString()} ${time} ${params.duration['16n']} ${params.velocity} ${time}`
        // )
        if (params.note.isMutingSilence) instrumentSamplers[params.position].mute(time)
        else {
            instrumentSamplers[params.position].play(random_attack_deviation(time), params, focusRef, panggulRef)
        }
    }, [])

    const muteAll = useCallback(
        (time: number) =>
            Object.keys(instrumentSamplers).forEach((position) => instrumentSamplers[position as Position].mute(time)),
        [instrumentSamplers]
    )

    return { playInstrument, muteAll }
}
