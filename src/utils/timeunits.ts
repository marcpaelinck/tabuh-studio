import { BaseNote } from "../config/config";
import * as Tone from 'tone'

// Converts a note value (expressed in BaseNote units) to a TimeObject
export const n2TO = (notevalue: number): Tone.Unit.TimeObject => new Object({ [BaseNote]: notevalue })

// Converts milliseconds to BaseNote units
export const millis2BaseNote = (milliseconds: number, bpm: number) => 4 * 60 * milliseconds / (bpm * 1000)

