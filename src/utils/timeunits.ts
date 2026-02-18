import { Time } from 'tone'
import type { TimeObject } from 'tone/build/esm/core/type/Units'
import { baseNoteSubdivision, baseNoteValue } from '../config/config'

// Converts a note value (expressed in BaseNote units) to a TimeObject
export const n2TO = (notevalue: number): TimeObject => new Object({ [baseNoteSubdivision]: notevalue }) as TimeObject

// Returs the number value of a BaseNote TimeObject
export const TO2n = (To: TimeObject): number => To[baseNoteSubdivision] as number

// Adds two BaseNote TimeObjects
export const TOplusTO = (to1: TimeObject, to2: TimeObject): TimeObject =>
    new Object({ [baseNoteSubdivision]: TO2n(to1) + TO2n(to2) }) as TimeObject

// Adds two BaseNote TimeObjects
export const TOminusTO = (to1: TimeObject, to2: TimeObject): TimeObject =>
    new Object({ [baseNoteSubdivision]: TO2n(to1) - TO2n(to2) }) as TimeObject

// Increases a BaseNote TimeObject with a numerical value
export const TOplusNumber = (to: TimeObject, number: number): TimeObject =>
    new Object({ [baseNoteSubdivision]: TO2n(to) + number }) as TimeObject

// Converts milliseconds to BaseNote equivalents based on the average bpm
// In Tone.js the tempo in BPM is defined as the number of quarter notes per minute.
export const millis2BaseNoteEquiv = (milliseconds: number, bpm: [number, number] | number) => {
    const avgBpm: number = Array.isArray(bpm) ? (bpm[0] + bpm[1]) / 2 : bpm
    return ((baseNoteValue / 4) * avgBpm * milliseconds) / (60 * 1000)
}

// Converts BaseNote equivalents to milliseconds based on the average bpm
// In Tone.js the tempo in BPM is defined as the number of quarter notes per minute.
// so we need to convert from BaseNote units to quarter note units by multiplying with 4/baseNoteValue
export const BaseNoteEquiv2Millis = (bnEquiv: number, bpm: [number, number] | number) => {
    const avgBpm: number = Array.isArray(bpm) ? (bpm[0] + bpm[1]) / 2 : bpm
    return (60 * 1000 * bnEquiv) / ((baseNoteValue / 4) * avgBpm)
}

// Converts a Timeobject value to milliseconds based on the average bpm
export const To2Millis = (TO: TimeObject, bpm: [number, number] | number) => {
    const bnEquiv = Time(TO).toMilliseconds() / Time({ [baseNoteSubdivision]: 1 }).toMilliseconds()
    return BaseNoteEquiv2Millis(bnEquiv, bpm)
}
