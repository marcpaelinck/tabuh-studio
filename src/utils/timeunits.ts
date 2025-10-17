import { BaseNote } from "../config/config";
import * as Tone from 'tone'

export const n2TO = (notevalue: number): Tone.Unit.TimeObject => new Object({ [BaseNote]: notevalue })

