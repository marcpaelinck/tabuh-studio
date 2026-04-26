// Converts symbols that represent multiple notes to an array of symbol/duration pairs.

import _ from 'lodash'
import * as ToneJS from 'tone'
import {
    AcceleratingTremoloChars,
    ExtensionChars,
    GraceNoteChars,
    HalfDurationChars,
    MelodicNoteChars,
    MutingChars,
    NorotChars,
    noteConfigs,
    OctavationChars,
    positionConfigs,
    RakeDownChars,
    RakeUpChars,
    TremoloChars
} from '../config/config'
import type { BPM, DurationInBasenoteEquiv, NoteSymbol, TimeInBasenoteEquiv } from '../typing/basetypes'
import type { Position, Tone } from '../typing/instruments'
import type { PlaybackSamplerAction, SamplerFunction, SamplerFunctionParameters } from '../typing/playback'
import { getValidSymbols, noteRange, splitTone } from '../utils/alphabet'
import { debug } from '../utils/debugger'
import { BaseNoteEquiv2Millis, millis2BaseNoteEquiv, n2TO, TO2n } from '../utils/timeunits'

type NorotType = 'unisono' | 'kotekan'

// prettier-ignore
const patterns = {
    tremolo:
        // TREMOLO
        // Repeated striking of the same note.
        // notes_per_quarternote -  tremolo frequency (number of tremolo notes per base note).
        // The tremolo respects the note duration, i.e. a tremolo of one base note will last for `base_note_time` duration.
        // The duration of the tremolo can be extended by adding consecutive tremolo notes. This will not alter the tremolo frequency.
        // ACCELERATING TREMOLO
        // Same as tremolo, but with decreasing duration of the notes.
        // The duration and beat frequencies of this type of tremolo is currently fixed and is independent of the number of base notes.
        // The effect of two consecutive tremolo notes is that these notes will be alternated throughout the pattern.
        // e.g. consecutive acc tremolo notes DONG and DENG will result in a pattern DONG-DENG-DONG-DENG etc. with as many notes as the
        // length of `accelerating_pattern`. The total duration will be the same as the duration of a single acc tremolo note.
        // accelerating_pattern - relative duration of the notes. Best used in a separate measure or at the end of a measure. See remark below.
        // accelerating_velocity - Relative velocity value (0-1) for each note. The number of values should match that of `accelerating_pattern`.
        {
            notes_per_basenote: 3,
            accelerating_pattern: [48, 40, 32, 26, 22, 18, 14, 10, 10, 10, 10, 10],
            accelerating_velocity: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5]
        },
    rake:
        // RAKE
        // The rake pattern consists of a rapid sequence of unmuted notes played by sliding the panggul over the instrument's keys.
        // The pattern can be played both ways (up and down) and has a fixed duration in milliseconds. This means that the duration in base notes
        // depends on the tempo, making it very difficult to synchronize it with other notes or patterns. Therefore it is best to use the pattern
        // at the end of a measure/section: the Playback Manager will take care of resynchronizing all positions at the start of the next measure.
        // The number of notes is fixed and the starting note is given in the notation. If the end of the instrument's range is reached before
        // the entire pattern could be generated, continuation symbols ('-') will be generated for the remaining pattern.
        {
            number_of_notes: 8, // Minimum is 2. If the instrument's range is exceeded, the remaining notes will be replaced by extension symbols.
            pattern_duration_in_millis: 120, // Total duration of the pattern.
            note_duration_in_millis: 5000 // sustain time of the notes: this will make the notes overlap.
        },
    norot:
        // NOROT: a single norot symbol stands for a 4-note norot pattern, either ngubeng or majalan. The patternManager logic will determine which pattern
        //        should be created. See Tenzer, Gamelan Gong Keybar, p. 215ff.
        {
            modifiers: { unisono: 'n', kotekan: 'm' },
            duration: 4,
            index: { ngubeng: 0, majalan: 1 }, // index of the pattern in the list
            patterns: {
                // ngubeng and majalan patterns. '?' stands for the previous base note
                // (or the current base note if the previous symbol is not a norot pattern).
                // The majalan pattern is applied at the beginning of a norot passage, when the base note changes
                // and when a norot symbol aligns with the gir.
                PEMADE_POLOS: {
                    'o,': { unisono: [['o,', 'e,', 'o,', 'e,'], ['?', 'o,/', 'o,', 'e,']], kotekan: [['o,', '.', 'o,', '.'], ['?', 'o,', 'o,', '.']] },
                    'e,': { unisono: [['e,', 'u,', 'e,', 'u,'], ['?', 'e,/', 'e,', 'u,']], kotekan: [['e,', '.', 'e,', '.'], ['?', 'e,', 'e,', '.']] },
                    'u,': { unisono: [['u,', 'a,', 'u,', 'a,'], ['?', 'u,/', 'u,', 'a,']], kotekan: [['u,', '.', 'u,', '.'], ['?', 'u,', 'u,', '.']] },
                    'a,': { unisono: [['a,', 'i,', 'a,', 'i,'], ['?', 'a,/', 'a,', 'i,']], kotekan: [['a,', '.', 'a,', '.'], ['?', 'a,', 'a,', '.']] },
                    i: { unisono: [['i', 'o', 'i', 'o'], ['?', 'i/', 'i', 'o']], kotekan: [['i', '.', 'i', '.'], ['?', 'i', 'i', '.']] },
                    o: { unisono: [['o', 'e', 'o', 'e'], ['?', 'o/', 'o', 'e']], kotekan: [['o', '.', 'o', '.'], ['?', 'o', 'o', '.']] },
                    e: { unisono: [['e', 'u', 'e', 'u'], ['?', 'e/', 'e', 'u']], kotekan: [['e', '.', 'e', '.'], ['?', 'e', 'e', '.']] },
                    u: { unisono: [['u', 'a', 'u', 'a'], ['?', 'u/', 'u', 'a']], kotekan: [['u', '.', 'u', '.'], ['?', 'u', 'u', '.']] },
                    a: { unisono: [['a', 'i<', 'a', 'i<'], ['?', 'a/', 'a', 'i<']], kotekan: [['a', '.', 'a', '.'], ['?', 'a', 'a', '.']] },
                    'i<': { unisono: [['i<', 'a', 'i<', 'a'], ['?', 'i</', 'i<', 'a']], kotekan: [['i<', '.', 'i<', '.'], ['?', 'i</', 'i<', '.']] }
                },
                KANTILAN_POLOS: {
                    'o,': { unisono: [['o,', 'e,', 'o,', 'e,'], ['?', 'o,/', 'o,', 'e,']], kotekan: [['o,', '.', 'o,', '.'], ['?', 'o,', 'o,', '.']] },
                    'e,': { unisono: [['e,', 'u,', 'e,', 'u,'], ['?', 'e,/', 'e,', 'u,']], kotekan: [['e,', '.', 'e,', '.'], ['?', 'e,', 'e,', '.']] },
                    'u,': { unisono: [['u,', 'a,', 'u,', 'a,'], ['?', 'u,/', 'u,', 'a,']], kotekan: [['u,', '.', 'u,', '.'], ['?', 'u,', 'u,', '.']] },
                    'a,': { unisono: [['a,', 'i,', 'a,', 'i,'], ['?', 'a,/', 'a,', 'i,']], kotekan: [['a,', '.', 'a,', '.'], ['?', 'a,', 'a,', '.']] },
                    i: { unisono: [['i', 'o', 'i', 'o'], ['?', 'i/', 'i', 'o']], kotekan: [['i', '.', 'i', '.'], ['?', 'i', 'i', '.']] },
                    o: { unisono: [['o', 'e', 'o', 'e'], ['?', 'o/', 'o', 'e']], kotekan: [['o', '.', 'o', '.'], ['?', 'o', 'o', '.']] },
                    e: { unisono: [['e', 'u', 'e', 'u'], ['?', 'e/', 'e', 'u']], kotekan: [['e', '.', 'e', '.'], ['?', 'e', 'e', '.']] },
                    u: { unisono: [['u', 'a', 'u', 'a'], ['?', 'u/', 'u', 'a']], kotekan: [['u', '.', 'u', '.'], ['?', 'u', 'u', '.']] },
                    a: { unisono: [['a', 'i<', 'a', 'i<'], ['?', 'a/', 'a', 'i<']], kotekan: [['a', '.', 'a', '.'], ['?', 'a', 'a', '.']] },
                    'i<': { unisono: [['i<', 'a', 'i<', 'a'], ['?', 'i</', 'i<', 'a']], kotekan: [['i<', '.', 'i<', '.'], ['?', 'i</', 'i<', '.']] }
                },
                PEMADE_SANGSIH: {
                    'o,': { unisono: [['o,', 'e,', 'o,', 'e,'], ['?', 'o,/','o,','e,']], kotekan: [['.', 'e,', '.', 'e,'], ['.,', 'o,', 'o,', 'e,']] },
                    'e,': { unisono: [['e,', 'u,', 'e,', 'u,'], ['?', 'e,/','e,','u,']], kotekan: [['.', 'u,', '.', 'u,'], ['.,', 'e,', 'e,', 'u,']] },
                    'u,': { unisono: [['u,', 'a,', 'u,', 'a,'], ['?', 'u,/','u,','a,']], kotekan: [['.', 'a,', '.', 'a,'], ['.,', 'u,', 'u,', 'a,']] },
                    'a,': { unisono: [['a,', 'i,', 'a,', 'i,'], ['?', 'a,/','a,','i,']], kotekan: [['.', 'i,', '.', 'i,'], ['.,', 'a,', 'a,', 'i,']] },
                    i: { unisono: [['i', 'o', 'i', 'o'], ['?', 'i/', 'i', 'o']], kotekan: [['.', 'o', '.', 'o'], ['.', 'i', 'i', 'o']] },
                    o: { unisono: [['o', 'e', 'o', 'e'], ['?', 'o/', 'o', 'e']], kotekan: [['.', 'e', '.', 'e'], ['.', 'o', 'o', 'e']] },
                    e: { unisono: [['e', 'u', 'e', 'u'], ['?', 'e/', 'e', 'u']], kotekan: [['.', 'u', '.', 'u'], ['.', 'e', 'e', 'u']] },
                    u: { unisono: [['u', 'a', 'u', 'a'], ['?', 'u/', 'u', 'a']], kotekan: [['.', 'a', '.', 'a'], ['.', 'u', 'u', 'a']] },
                    a: { unisono: [['a', 'i<', 'a', 'i<'], ['?', 'a/', 'a', 'i<']], kotekan: [['.', 'i<', '.', 'i<'], ['.', 'a', 'a', 'i<']] },
                    'i<': { unisono: [['i<', 'a', 'i<', 'a'], ['?', 'i</', 'i<', 'a']], kotekan: [['.', 'a', '.', 'a'], ['.', 'i</', 'i<', 'a']] }
                },
                KANTILAN_SANGSIH: {
                    'o,': { unisono: [['o,', 'e,', 'o,', 'e,'], ['?', 'o,/','o,','e,']], kotekan: [['.', 'e,', '.', 'e,'], ['.,', 'o,', 'o,', 'e,']] },
                    'e,': { unisono: [['e,', 'u,', 'e,', 'u,'], ['?', 'e,/','e,','u,']], kotekan: [['.', 'u,', '.', 'u,'], ['.,', 'e,', 'e,', 'u,']] },
                    'u,': { unisono: [['u,', 'a,', 'u,', 'a,'], ['?', 'u,/','u,','a,']], kotekan: [['.', 'a,', '.', 'a,'], ['.,', 'u,', 'u,', 'a,']] },
                    'a,': { unisono: [['a,', 'i,', 'a,', 'i,'], ['?', 'a,/','a,','i,']], kotekan: [['.', 'i,', '.', 'i,'], ['.,', 'a,', 'a,', 'i,']] },
                    i: { unisono: [['i', 'o', 'i', 'o'], ['?', 'i/', 'i', 'o']], kotekan: [['.', 'o', '.', 'o'], ['.', 'i', 'i', 'o']] },
                    o: { unisono: [['o', 'e', 'o', 'e'], ['?', 'o/', 'o', 'e']], kotekan: [['.', 'e', '.', 'e'], ['.', 'o', 'o', 'e']] },
                    e: { unisono: [['e', 'u', 'e', 'u'], ['?', 'e/', 'e', 'u']], kotekan: [['.', 'u', '.', 'u'], ['.', 'e', 'e', 'u']] },
                    u: { unisono: [['u', 'a', 'u', 'a'], ['?', 'u/', 'u', 'a']], kotekan: [['.', 'a', '.', 'a'], ['.', 'u', 'u', 'a']] },
                    a: { unisono: [['a', 'i<', 'a', 'i<'], ['?', 'a/', 'a', 'i<']], kotekan: [['.', 'i<', '.', 'i<'], ['.', 'a', 'a', 'i<']] },
                    'i<': { unisono: [['i<', 'a', 'i<', 'a'], ['?', 'i</', 'i<', 'a']], kotekan: [['.', 'a', '.', 'a'], ['.', 'i</', 'i<', 'a']] }
                },
                REYONG_1: {
                    i: { unisono: [['.', 'a,', 'u,', 'a,'], ['?', '.', 'u,', 'a,']], kotekan: [['.', 'a,', 'u,', 'a,'], ['?', '.', 'u,', 'a,']] },
                    o: { unisono: [['.', 't', '.', 't'], ['?', 'u,', 'a,', 't']], kotekan: [['.', 't', '.', 't'], ['?', 'u,', 'a,', 't']] },
                    e: { unisono: [['e,', 'u,', 'e,', 'u,'], ['?', 'e,', 'e,', 'u,']], kotekan: [['e,', 'u,', 'e,', 'u,'], ['?', 'e,', 'e,', 'u,']] },
                    u: { unisono: [['u,', 'a,', 'u,', 'a,'], ['?', 'u,', 'u,', 'a,']], kotekan: [['u,', 'a,', 'u,', 'a,'], ['?', 'u,', 'u,', 'a,']] },
                    a: { unisono: [['a,', 'e,', 'a,', 'e,'], ['?', 'a,', 'a,', 'e,']], kotekan: [['a,', 'e,', 'a,', 'e,'], ['?', 'a,', 'a,', 'e,']] }
                },
                REYONG_2: {
                    i: { unisono: [['i', 'o', 'i', 'o'], ['?', 'i', 'i', 'o']], kotekan: [['i', 'o', 'i', 'o'], ['?', 'i', 'i', 'o']] },
                    o: { unisono: [['o', 'e', 'o', 'e'], ['?', 'o', 'o', 'e']], kotekan: [['o', 'e', 'o', 'e'], ['?', 'o', 'o', 'e']] },
                    e: { unisono: [['e', 'i', 'e', 'i'], ['?', 'e', 'e', 'i']], kotekan: [['e', 'i', 'e', 'i'], ['?', 'e', 'e', 'i']] },
                    u: { unisono: [['.', 'e', 'o', 'e'], ['?', '.', 'o', 'e']], kotekan: [['.', 'e', 'o', 'e'], ['?', '.', 'o', 'e']] },
                    a: { unisono: [['.', 'i', 'o', 'i'], ['?', '.', 'o', 'i']], kotekan: [['.', 'i', 'o', 'i'], ['?', '.', 'o', 'i']] }
                },
                REYONG_3: {
                    i: { unisono: [['a', '.', 'a', 'u'], ['?', '.', 'u', 'a']], kotekan: [['a', '.', 'a', 'u'], ['?', '.', 'u', 'a']] },
                    o: { unisono: [['.', 'i<', 'a', 'i<'], ['?', '.', 'a', 'i<']], kotekan: [['.', 'i<', 'a', 'i<'], ['?', '.', 'a', 'i<']] },
                    e: { unisono: [['.', 'u', 'a', 'u'], ['?', '.', 'a', 'u']], kotekan: [['.', 'u', 'a', 'u'], ['?', '.', 'a', 'u']] },
                    u: { unisono: [['u', 'a', 'u', 'a'], ['?', 'u', 'u', 'a']], kotekan: [['u', 'a', 'u', 'a'], ['?', 'u', 'u', 'a']] },
                    a: { unisono: [['a', 'u', 'a', 'u'], ['?', 'a', 'a', 'u']], kotekan: [['a', 'u', 'a', 'u'], ['?', 'a', 'a', 'u']] }
                },
                REYONG_4: {
                    i: { unisono: [['o<', 'i<', 'o<', 'i<'], ['?', 'i<', 'i<', 'o<']], kotekan: [['o<', 'i<', 'o<', 'i<'], ['?', 'i<', 'i<', 'o<']] },
                    o: { unisono: [['o<', 'e<', 'o<', 'e<'], ['?', 'o<', 'o<', 'e<']], kotekan: [['o<', 'e<', 'o<', 'e<'], ['?', 'o<', 'o<', 'e<']] },
                    e: { unisono: [['e<', 'u<', 'e<', 'u<'], ['?', 'e<', 'e<', 'u<']], kotekan: [['e<', 'u<', 'e<', 'u<'], ['?', 'e<', 'e<', 'u<']] },
                    u: { unisono: [['u<', 'e<', 'u<', 'e<'], ['?', 'u<', 'u<', 'e<']], kotekan: [['u<', 'e<', 'u<', 'e<'], ['?', 'u<', 'u<', 'e<']] },
                    a: { unisono: [['.', 'i<', 'o<', 'i<'], ['?', '.', 'o<', 'i<']], kotekan: [['.', 'i<', 'o<', 'i<'], ['?', '.', 'o<', 'i<']] }
                }
            }
        },
    gracenote: { duration: 0.5 }
}

type PatternType =
    | 'SINGLENOTE'
    | 'HALF_DURATION'
    | 'TREMOLO'
    | 'TREMOLO_ACC'
    | 'GRACENOTE'
    | 'RAKE'
    | 'NOROT'
    | 'UNHANDLED'
    | 'INVALID'

function getPatternType(symbol: NoteSymbol, position: Position): PatternType {
    const validSymbols = getValidSymbols(position, true, false)
    switch (true) {
        case validSymbols.includes(symbol):
            return 'SINGLENOTE'
        case HalfDurationChars.some((char) => symbol.endsWith(char)):
            return 'HALF_DURATION'
        case !positionConfigs[position].validPatterns.includes(symbol):
            return 'INVALID'
        case symbol.length > 0 && GraceNoteChars.includes(symbol[0]):
            return 'GRACENOTE'
        case NorotChars.some((char) => symbol.includes(char)):
            return 'NOROT'
        case TremoloChars.includes(symbol.slice(-1)):
            return 'TREMOLO'
        case AcceleratingTremoloChars.includes(symbol.slice(-1)):
            return 'TREMOLO_ACC'
        case _.concat(RakeUpChars, RakeDownChars).includes(symbol.slice(-1)):
            return 'RAKE'
        default:
            return 'UNHANDLED'
    }
}

export interface CreatePatternArgs {
    samplerFunction: SamplerFunction
    time: TimeInBasenoteEquiv // current time
    timeMs: number
    measureIdx: number
    position: Position
    prevsymbol: NoteSymbol | undefined // previous symbol in the notation
    symbol: NoteSymbol // current symbol in the notation
    nextsymbol: NoteSymbol | undefined // symbol following the current symbol
    bpm: BPM // current tempo in BPM
    velocity: ToneJS.Unit.NormalRange // current velocity
    prevaction: PlaybackSamplerAction | undefined // previous action created for this position
    isLast: boolean // true if this is the last symbol in the current position's notation
}
// Converts specific symbols that represent a sequence of notes to a list of PlaybackSamplerAction objects.
// Function `createNoteActions` expects a `CreatePatternArgs` object as argument.
// Arguments `prevsymbol` and `nextsymbol` are required because some patterns can consist of two consecutive symbols.
// The 'grace note' pattern requires information about the next symbol to determine its octave.
// WARNING: GRACE NOTES WILL MODIFY THE LAST `SamplerAction` OBJECT, MAKING `createNoteActions` AN 'IMPURE FUNCTION'.
export function createNoteActions(args: CreatePatternArgs): PlaybackSamplerAction[] {
    const pattern = getPatternType(args.symbol, args.position)
    debug(`${args.symbol} is ${pattern}`)

    switch (pattern) {
        case 'SINGLENOTE':
            return singleNoteAction(args)
        case 'HALF_DURATION':
            return halfDurationAction(args)
        case 'GRACENOTE':
            return gracenoteAction(args)
        case 'TREMOLO':
            return tremoloAction(args)
        case 'TREMOLO_ACC':
            return AcceleratingTremoloAction(args)
        case 'RAKE':
            return rakeAction(args)
        case 'NOROT':
            return norotAction(args)
        case 'INVALID': {
            console.error(`invalid pattern ${args.symbol} for ${args.position}`)
            return silenceAction(args)
        }
        case 'UNHANDLED': {
            console.error(`Unhandled pattern ${args.symbol} for ${args.position}`)
            return silenceAction(args)
        }
        default: {
            console.error(`Unexpected symbol ${args.symbol} for ${args.position}`)
            return silenceAction(args)
        }
    }
}

export function symbolDuration(
    symbol: NoteSymbol,
    position: Position,
    bpm: number,
    unit: 'millisecond' | 'basenote'
): number {
    const pattern = getPatternType(symbol, position)
    switch (pattern) {
        case 'SINGLENOTE':
        case 'TREMOLO':
            return unit == 'basenote' ? 1 : BaseNoteEquiv2Millis(1, bpm)
        case 'HALF_DURATION':
            return unit == 'basenote' ? 0.5 : BaseNoteEquiv2Millis(0.5, bpm)
        case 'TREMOLO_ACC':
            const durationBn =
                patterns.tremolo.accelerating_pattern.reduce((sum, n) => sum + n, 0) /
                patterns.tremolo.accelerating_pattern[0]
            return unit == 'basenote' ? durationBn : BaseNoteEquiv2Millis(durationBn, bpm)
        case 'RAKE':
            return (
                unit == 'basenote'
                    ? millis2BaseNoteEquiv(patterns.rake.pattern_duration_in_millis, bpm)
                    : patterns.rake.pattern_duration_in_millis,
                bpm
            )
        case 'NOROT':
            return unit == 'basenote' ? patterns.norot.duration : BaseNoteEquiv2Millis(patterns.norot.duration, bpm)
        case 'GRACENOTE':
        // The duration of a gracenote is subtracted from the preceding note,
        // so its nett duration is 0.
        case 'INVALID':
        case 'UNHANDLED':
        default:
            return 0
    }
}

export function totalDuration(
    symbols: NoteSymbol[],
    position: Position,
    bpm: number,
    unit: 'millisecond' | 'basenote'
) {
    return _.sum(symbols.map((sym) => symbolDuration(sym, position, bpm, unit)))
}

function isMutedNote(symbol: NoteSymbol, position: Position): boolean {
    if (!(position in positionConfigs)) return false
    const noteName = positionConfigs[position].symbolToNoteNames[symbol]
    if (!noteName) return false
    const instrType = positionConfigs[position].type
    if (!(instrType in noteConfigs)) return false
    if (!(noteName[0] in noteConfigs[instrType]) || noteName.length == 0) return false
    return ['ABBREVIATED', 'MUTED'].includes(noteConfigs[instrType][noteName[0]].muting)
}

function singleNoteAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    return [
        {
            time: n2TO(args.time),
            timeMs: args.timeMs,
            function: args.samplerFunction,
            ismuted: isMutedNote(args.symbol, args.position),
            params: {
                duration: n2TO(1),
                position: args.position,
                symbol: args.symbol,
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfPattern: true
            } as SamplerFunctionParameters
        }
    ]
}

function halfDurationAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    return [
        {
            time: n2TO(args.time),
            timeMs: args.timeMs,
            function: args.samplerFunction,
            ismuted: false,
            params: {
                duration: n2TO(0.5),
                position: args.position,
                symbol: args.symbol.substring(0, args.symbol.length - 1),
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfPattern: true
            } as SamplerFunctionParameters
        }
    ]
}

function silenceAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    return [
        {
            time: n2TO(args.time),
            timeMs: args.timeMs,
            function: args.samplerFunction,
            ismuted: true,
            params: {
                duration: n2TO(1),
                position: args.position,
                symbol: MutingChars[0],
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfPattern: true
            } as SamplerFunctionParameters
        }
    ]
}

// A grace note doesn't add to the playback duration. Instead, its duration is subtracted
// from the previous note's duration.
// A grace notes doesn't have an octave modifier, so its octave is derived from the following note.
function gracenoteAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    const isMelodic = (s: NoteSymbol) => s.length > 0 && MelodicNoteChars.includes(s[0])

    // Subtract the grace note's duration from the previous note action
    if (args.prevaction) {
        args.prevaction.params.duration = n2TO(TO2n(args.prevaction.params.duration) - patterns.gracenote.duration)
    }

    // Determine the correct octave for the grace note
    const baseSymbol = args.symbol.toLowerCase()
    var nearest = baseSymbol
    if (isMelodic(nearest) && args.nextsymbol && isMelodic(args.nextsymbol)) {
        const instrumentRange = _.concat(
            noteRange(args.position),
            _.fill(Array(patterns.rake.number_of_notes), ExtensionChars[0])
        )
        const nextSymbolIndex = instrumentRange.indexOf(args.nextsymbol)
        var shortestDistance = 99
        // Try different octavations and keep the value that is 'nearest' to the next note.
        const octaveOptions = _.concat(
            [baseSymbol],
            OctavationChars.map((oct) => baseSymbol + oct)
        )
        for (const tryNote of octaveOptions) {
            if (instrumentRange.includes(tryNote)) {
                const tryDistance = Math.abs(instrumentRange.indexOf(tryNote) - nextSymbolIndex)
                if (tryDistance < shortestDistance) {
                    nearest = tryNote
                    shortestDistance = tryDistance
                }
            }
        }
    }
    const graceSymbol: NoteSymbol = nearest
    return [
        {
            time: n2TO(args.time - patterns.gracenote.duration),
            timeMs: args.timeMs - BaseNoteEquiv2Millis(patterns.gracenote.duration, args.bpm),
            function: args.samplerFunction,
            ismuted: true,
            params: {
                duration: n2TO(patterns.gracenote.duration),
                position: args.position,
                symbol: graceSymbol,
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfPattern: true
            } as SamplerFunctionParameters
        }
    ]
}

function tremoloAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    // Skip if the previous symbol is also a tremolo note.
    // In that case the pattern has already been created.
    if (args.nextsymbol && TremoloChars.some((char) => args.nextsymbol!.includes(char))) return []

    const duration = 1 / patterns.tremolo.notes_per_basenote
    const returnValue: PlaybackSamplerAction[] = []
    const notes = [args.symbol.slice(0, -1)]
    // Include the next symbol if it is also a tremolo note
    if (args.nextsymbol && TremoloChars.some((char) => args.nextsymbol!.includes(char)))
        notes.push(args.nextsymbol.slice(0, -1))
    const totalNotes = notes.length * patterns.tremolo.notes_per_basenote

    for (var idx = 0; idx <= totalNotes; idx++) {
        // Alternate the note to be selected
        const noteIdx = idx % notes.length
        const count = idx + 1
        returnValue.push({
            time: n2TO(args.time + count * duration),
            timeMs: args.timeMs + BaseNoteEquiv2Millis(count * duration, args.bpm),
            function: args.samplerFunction,
            ismuted: count < totalNotes,
            params: {
                duration: n2TO(duration),
                position: args.position,
                symbol: notes[noteIdx],
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast && count == totalNotes,
                isLastOfPattern: count == totalNotes
            } as SamplerFunctionParameters
        })
    }
    return returnValue
}

function AcceleratingTremoloAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    // Skip if the previous symbol is also an accelerating tremolo note.
    // In that case the pattern has already been created.
    if (args.nextsymbol && AcceleratingTremoloChars.some((char) => args.nextsymbol!.includes(char))) return []

    const returnValue: PlaybackSamplerAction[] = []
    const notes = [args.symbol.slice(0, -1)]
    // Include the next symbol if it is also an accelerating tremolo note
    if (args.nextsymbol && AcceleratingTremoloChars.some((char) => args.nextsymbol!.includes(char)))
        notes.push(args.nextsymbol.slice(0, -1))
    const totalNotes = notes.length * patterns.tremolo.accelerating_pattern.length

    var time = args.time
    var timeMs = args.timeMs
    for (var idx = 0; idx < totalNotes; idx++) {
        // Alternate the note to be selected
        const count = idx + 1
        const noteIdx = idx % notes.length
        const duration = patterns.tremolo.accelerating_pattern[idx] / patterns.tremolo.accelerating_pattern[0]
        const velocity = patterns.tremolo.accelerating_velocity[idx]
        returnValue.push({
            time: n2TO(time),
            timeMs: timeMs,
            function: args.samplerFunction,
            ismuted: count < totalNotes,
            params: {
                duration: n2TO(duration),
                position: args.position,
                symbol: notes[noteIdx],
                bpm: args.bpm,
                velocity: velocity,
                isLast: args.isLast && count == totalNotes,
                isLastOfPattern: count == totalNotes
            } as SamplerFunctionParameters
        })
        time += duration
        timeMs += BaseNoteEquiv2Millis(duration, args.bpm)
    }
    return returnValue
}

function rakeAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    // Create a range of unmuted notes in the required direction and append dashes for potential overflow
    const invert = RakeDownChars.includes(args.symbol.slice(-1))
    const instrumentRange = _.concat(
        noteRange(args.position, invert),
        _.fill(Array(patterns.rake.number_of_notes), ExtensionChars[0])
    )
    debug(`result: ${JSON.stringify(instrumentRange)}`)
    const startIdx = instrumentRange.indexOf(args.symbol.slice(0, -1))
    const noteSpacing: DurationInBasenoteEquiv =
        patterns.rake.pattern_duration_in_millis / BaseNoteEquiv2Millis(patterns.rake.number_of_notes - 1, args.bpm)
    const noteDuration: DurationInBasenoteEquiv = millis2BaseNoteEquiv(patterns.rake.note_duration_in_millis, args.bpm)
    var offset = 0
    // Generate the pattern
    const returnValue: PlaybackSamplerAction[] = []
    for (var idx = 0; idx < patterns.rake.number_of_notes; idx++) {
        const count = idx + 1
        returnValue.push({
            time: n2TO(args.time + offset),
            timeMs: args.timeMs + BaseNoteEquiv2Millis(offset, args.bpm),
            function: args.samplerFunction,
            ismuted: false,
            params: {
                duration: n2TO(noteDuration),
                position: args.position,
                symbol: instrumentRange[startIdx + idx],
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast && count == patterns.rake.number_of_notes,
                isLastOfPattern: count == patterns.rake.number_of_notes
            } as SamplerFunctionParameters
        })
        offset += noteSpacing
    }
    debug(`result: ${JSON.stringify(returnValue)}`)
    return returnValue
}

// TODO: elaborate
function norotAction(args: CreatePatternArgs): PlaybackSamplerAction[] {
    function getNorotType(symbol: string | undefined): NorotType | undefined {
        if (symbol == undefined) return undefined
        return args.symbol.includes(patterns.norot.modifiers.unisono)
            ? 'unisono'
            : args.symbol.includes(patterns.norot.modifiers.kotekan)
              ? 'kotekan'
              : undefined
    }
    const currNorotType: NorotType | undefined = getNorotType(args.symbol)
    if (currNorotType == undefined) return []

    const [currNorotTone, _rest1] = splitTone(args.symbol)
    const prevNorotType = getNorotType(args.prevsymbol)
    const [prevNorotTone, _rest2] =
        prevNorotType && args.prevsymbol ? splitTone(args.prevsymbol) : [undefined, undefined]

    // TODO: We currently determine the 'gir' measure as the first measure in a staff.
    //       This method should be refined.
    const patternIdx =
        prevNorotTone == currNorotTone && args.measureIdx != 0
            ? patterns.norot.index.ngubeng
            : patterns.norot.index.majalan

    // Retrieve the norot pattern
    const posPatterns: Partial<Record<Tone, Record<NorotType, NoteSymbol[][]>>> =
        patterns.norot.patterns[args.position as keyof typeof patterns.norot.patterns]
    if (!posPatterns) return []
    if (!(currNorotTone in posPatterns)) return []
    const pattern: NoteSymbol[] = posPatterns[currNorotTone as Tone]![currNorotType][patternIdx]

    if (patternIdx == patterns.norot.index.majalan) {
        // Substitute the first note of the pattern
        pattern.splice(0, 1, pattern[0].replace('?', prevNorotTone || currNorotTone))
    }
    const returnValue: PlaybackSamplerAction[] = []

    const duration = 1 // duration of each note in the pattern, in BaseNote equivalents
    const totalNotes = pattern.length
    for (var idx = 0; idx <= pattern.length; idx++) {
        const count = idx + 1
        returnValue.push({
            time: n2TO(args.time + count * duration),
            timeMs: args.timeMs + BaseNoteEquiv2Millis(count * duration, args.bpm),
            function: args.samplerFunction,
            ismuted: count < totalNotes,
            params: {
                duration: n2TO(duration),
                position: args.position,
                symbol: pattern[idx],
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast && count == totalNotes,
                isLastOfPattern: count == totalNotes
            } as SamplerFunctionParameters
        })
    }
    return returnValue
}
