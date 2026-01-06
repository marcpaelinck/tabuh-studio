import { BaseNote, type BaseNoteTimeObj } from '../config/config'

// Converts a note value (expressed in BaseNote units) to a TimeObject
export const n2TO = (notevalue: number): BaseNoteTimeObj => new Object({ [BaseNote]: notevalue }) as BaseNoteTimeObj

// Returs the number value of a BaseNote TimeObject
export const TO2n = (To: BaseNoteTimeObj): number => To[BaseNote]

// Adds two BaseNote TimeObjects
export const TOplusTO = (to1: BaseNoteTimeObj, to2: BaseNoteTimeObj): BaseNoteTimeObj =>
    new Object({ [BaseNote]: TO2n(to1) + TO2n(to2) }) as BaseNoteTimeObj

// Increases a BaseNote TimeObject with a numerical value
export const TOplusNumber = (to: BaseNoteTimeObj, number: number): BaseNoteTimeObj =>
    new Object({ [BaseNote]: TO2n(to) + number }) as BaseNoteTimeObj

// Converts milliseconds to BaseNote equivalents based on the average bpm
export const millis2BaseNoteEquiv = (milliseconds: number, bpm: [number, number] | number) => {
    const avgBpm: number = Array.isArray(bpm) ? (bpm[0] + bpm[1]) / 2 : bpm
    return (4 * avgBpm * milliseconds) / (60 * 1000)
}

// Converts BaseNote equivalents to milliseconds based on the average bpm
export const BaseNoteEquiv2Millis = (bnEquiv: number, bpm: [number, number] | number) => {
    const avgBpm: number = Array.isArray(bpm) ? (bpm[0] + bpm[1]) / 2 : bpm
    // return Math.round(60 * 1000 * bnEquiv / (4 * avgBpm))
    return (60 * 1000 * bnEquiv) / (4 * avgBpm)
}
