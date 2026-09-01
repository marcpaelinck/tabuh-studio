import type { Position } from '@tabuhstudio/shared'
import { getAllPositions, getSymbolToNoteNames } from '@tabuhstudio/shared/config/configAccess'
import { positionGroups } from '@tabuhstudio/shared/config/position'
import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import * as Tone from 'tone'
import {
    alwaysFocusPositions,
    AVERAGE_ATTACK_DELAY,
    baseNoteSubdivision,
    dimRateNonFocusedInstruments,
    playerOutroTime
} from '../../config/config'
import { resolveSampleSet } from '../../config/sampleSets'
import { useUserSelectionStore } from '../../stores/useUserSettingsStore'
import type { SamplerFunctionParameters } from '../../typing/playback'
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

// MIDI base pitches.
// Used as key values for the Tone.Sampler samples: using numeric key values cause Tone.js
// to automatically modify the samples' pitch.
// prettier-ignore
const NOTES = ['C1','C#1','D1','D#1','E1','F1','F#1','G1','G#1','A1','A#1','B1','C2','C#2','D2','D#2','E2','F2',
                      'F#2','G2','G#2','A2','A#2','B2','C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3']

/* EXAMPLES OF FILTERS. NOT USED BECAUSE THE OUTPUT SOUNDS DISTORTED WHEN APPLIED ON SAMPLES.

 const pitchShift: Tone.PitchShift = new Tone.PitchShift({
    pitch: 5.0, // 1 unit equals 100 cents
    windowSize: 0.07,
    delayTime: 0,
    feedback: 0
})

const lowpassFilter = new Tone.Filter({
    frequency: 5000, // Cutoff frequency in Hz
    type: 'lowpass', // Filter type
    rolloff: -48 // Steepness (-12, -24, or -48 dB/octave)
})

// Change lowpass cutoff frequency according to velocity
function lowpassFrequency(velocity: number): number {
    const minFreq = 1000
    const maxFreq = 5000
    return minFreq + (maxFreq - minFreq) * velocity
}
*/

// The active sample set (files + volumes + folder). Static today; when set selection is dynamic the
// samplers/lookup below should rebuild when it changes.
const sampleSet = resolveSampleSet()

const createSampler = ({
    isMelodic,
    samples,
    volume
}: {
    isMelodic: boolean
    samples: { [key: string]: string }
    volume: Tone.Unit.Decibels
}) => {
    const sampler = new Tone.Sampler({ urls: samples, baseUrl: sampleSet.folder, volume })
    // To connect a filter, use the following code:
    //       sampler.connect(filter)
    //       filter.toDestination()
    // Filters tend to distort the sound, so not using filters currently
    sampler.toDestination()
    return sampler
}

const createSamplers = (): Record<string, Tone.Sampler> => {
    Tone.getDestination().volume.value = 5
    const entries = getAllPositions().map((position) => {
        return [
            position,
            createSampler({
                isMelodic: positionGroups.MELODIC.positions.includes(position),
                samples: lookup[position].idx2sample,
                volume: sampleSet.entries[position]!.volume
            })
        ]
    })
    return Object.fromEntries(entries)
}

export function soundFile(note: string, fileTemplate: string): string {
    return fileTemplate.replace('{note}', note)
}

const lookup = Object.fromEntries(
    getAllPositions().map((position) => {
        const symbolToNoteNames = getSymbolToNoteNames(position)
        const noteList = [...new Set(Object.values(symbolToNoteNames).flat())]
        const indexToSample = Object.fromEntries(
            noteList.map((note, index) => [NOTES[index], soundFile(note, sampleSet.entries[position]!.sampletemplate)])
        )
        const noteToIndex = Object.fromEntries(noteList.map((notestr, index) => [notestr, NOTES[index]]))
        const symbolToIndices = Object.fromEntries(
            Object.entries(symbolToNoteNames).map(([symbol, notes]) => [symbol, notes.map((repr) => noteToIndex[repr])])
        )
        return [position, { idx2sample: indexToSample, symbol2idxs: symbolToIndices }]
    })
)

// The MIDI export derives its own pitch mapping (per instrument) in the pure `pitchMap`
// module; the sampler keeps its per-position `lookup` above.

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
            const indices = lookup[position].symbol2idxs[params.note.canonicalSymbol]
            if (indices && samplers[position]) {
                var duration: Tone.Unit.TimeObject = params.duration
                // Extend the last note to allow the sound to attenuate
                //TODO Do not extend the last note when looping from the last note.
                if (params.isLast) {
                    // @ts-ignore
                    duration[baseNoteSubdivision] += millis2BaseNoteEquiv(outroTime, params.bpm)
                }
                try {
                    // lowpassFilter.frequency.setValueAtTime(lowpassFrequency(params.velocity * dimValue), time)
                    sampler?.triggerAttackRelease(indices, duration, time, params.velocity * dimValue)
                } catch {
                    console.error(`ERROR: could not play sound ${params.position} ${params.note.canonicalSymbol}`)
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
            getAllPositions().map((position) => [position, createInstrument(position, samplers, outroTime)])
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
