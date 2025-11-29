import { BaseNote } from "../config/config";
import * as Tone from 'tone'

// Converts a note value (expressed in BaseNote units) to a TimeObject
export const n2TO = (notevalue: number): Tone.Unit.TimeObject => new Object({ [BaseNote]: notevalue })

// Converts milliseconds to BaseNote equivalents based on the average bpm
export const millis2BaseNoteEquiv = (milliseconds: number, bpm: [number, number] | number) => {
    const avgBpm: number = Array.isArray(bpm) ? (bpm[0] + bpm[1]) / 2 : bpm
    return 4 * avgBpm * milliseconds / (60 * 1000)
}

// Converts BaseNote equivalents to milliseconds based on the average bpm
export const BaseNoteEquiv2Millis = (bnEquiv: number, bpm: [number, number] | number) => {
    const avgBpm: number = Array.isArray(bpm) ? (bpm[0] + bpm[1]) / 2 : bpm
    // return Math.round(60 * 1000 * bnEquiv / (4 * avgBpm))
    return 60 * 1000 * bnEquiv / (4 * avgBpm)
}
