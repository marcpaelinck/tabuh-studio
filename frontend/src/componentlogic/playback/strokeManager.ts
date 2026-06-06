// This module converts all symbols to playback actions. A symbol can stand for a single base note or for a sequence of
// notes that can not be written accurately as a series of base notes, such as tremolo or rake.
//
// Stroke modifiers that are shorthand notation for sequences of base notes --e.g. 'norot' patterns--
// are converted to regular notation symbols by the patternManager. They are not handled in this module.

import _ from 'lodash'
import * as ToneJS from 'tone'
import {
    AcceleratingTremoloChars,
    ExtensionChars,
    MelodicNoteChars,
    MutingChars,
    noteConfigs,
    OctavationChars,
    positionConfigs,
    RakeDownChars,
    TremoloChars
} from '../../config/config'
import type { BPM, DurationInBasenoteEquiv, NoteSymbol, Position, TimeInBasenoteEquiv } from '../../typing/basetypes'
import type { PlaybackSamplerAction, SamplerFunction, SamplerFunctionParameters } from '../../typing/playback'
import { noteRange } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { getStrokeType } from '../../utils/strokes'
import { BaseNoteEquiv2Millis, millis2BaseNoteEquiv, n2TO, TO2n } from '../../utils/timeunits'

// prettier-ignore
const strokes = {
    tremolo:
        // TREMOLO
        // Repeated striking of the same note.
        // notes_per_quarternote -  tremolo frequency (number of tremolo notes per base note).
        // The tremolo respects the note duration, i.e. a tremolo of one base note will last for `base_note_time` duration.
        // The duration of the tremolo can be extended by adding consecutive tremolo notes. This will not alter the tremolo frequency.
        // ACCELERATING TREMOLO
        // Same as tremolo, but with decreasing duration of the notes.
        // The duration and beat frequencies of this type of tremolo is currently fixed and is independent of the number of base notes.
        // The effect of two consecutive tremolo notes is that these notes will be alternated throughout the motif.
        // e.g. consecutive acc tremolo notes DONG and DENG will result in a motif DONG-DENG-DONG-DENG etc. with as many notes as the
        // length of `accelerating_motif`. The total duration will be the same as the duration of a single acc tremolo note.
        // accelerating_motif - relative duration of the notes. Best used in a separate measure or at the end of a measure. See remark below.
        // accelerating_velocity - Relative velocity value (0-1) for each note. The number of values should match that of `accelerating_motif`.
        {
            notes_per_basenote: 3,
            accelerating_motif: [48, 40, 32, 26, 22, 18, 14, 10, 10, 10, 10, 10],
            accelerating_velocity: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5]
        },
    rake:
        // RAKE
        // The rake motif consists of a rapid sequence of unmuted notes played by sliding the panggul over the instrument's keys.
        // The motif can be played both ways (up and down) and has a fixed duration in milliseconds. This means that the duration in base notes
        // depends on the tempo, making it very difficult to synchronize it with other notes or motifs. Therefore it is best to use the rake stroke
        // at the end of a measure/section: the Playback Manager will take care of resynchronizing all positions at the start of the next measure.
        // The number of notes is fixed and the starting note is given in the notation. If the end of the instrument's range is reached before
        // the entire motif could be generated, continuation symbols ('-') will be generated for the remaining motif.
        {
            number_of_notes: 8, // Minimum is 2. If the instrument's range is exceeded, the remaining notes will be replaced by extension symbols.
            motif_duration_in_millis: 120, // Total duration of the motif.
            note_duration_in_millis: 5000 // sustain time of the notes: this will make the notes overlap.
        },
    gracenote: { duration: 0.5 }
}

export interface CreateStrokeArgs {
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
// Function `createNoteActions` expects a `CreateStrokeArgs` object as argument.
// Arguments `prevsymbol` and `nextsymbol` are required because some motifs can consist of two consecutive symbols.
// The 'grace note' motif requires information about the next symbol to determine its octave.
// WARNING: GRACE NOTES WILL MODIFY THE LAST `SamplerAction` OBJECT, MAKING `createNoteActions` AN 'IMPURE FUNCTION'.
export function createNoteActions(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    const strokeType = getStrokeType(args.symbol, args.position)
    debug(`${args.symbol} is ${strokeType}`)

    switch (strokeType) {
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
        case 'INVALID': {
            console.error(`invalid stroke type '${args.symbol}' for ${args.position}`)
            return silenceAction(args)
        }
        case 'UNHANDLED': {
            console.error(`Unhandled stroke type ${args.symbol} for ${args.position}`)
            return silenceAction(args)
        }
        default: {
            console.error(`Unexpected stroke type ${args.symbol} for ${args.position}`)
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
    const strokeType = getStrokeType(symbol, position)
    switch (strokeType) {
        case 'SINGLENOTE':
        case 'TREMOLO':
            return unit == 'basenote' ? 1 : BaseNoteEquiv2Millis(1, bpm)
        case 'HALF_DURATION':
            return unit == 'basenote' ? 0.5 : BaseNoteEquiv2Millis(0.5, bpm)
        case 'TREMOLO_ACC':
            const durationBn =
                strokes.tremolo.accelerating_motif.reduce((sum, n) => sum + n, 0) /
                strokes.tremolo.accelerating_motif[0]
            return unit == 'basenote' ? durationBn : BaseNoteEquiv2Millis(durationBn, bpm)
        case 'RAKE':
            return (
                unit == 'basenote'
                    ? millis2BaseNoteEquiv(strokes.rake.motif_duration_in_millis, bpm)
                    : strokes.rake.motif_duration_in_millis,
                bpm
            )
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

function singleNoteAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    return [
        {
            time: n2TO(args.time),
            timeMs: args.timeMs,
            ismuted: isMutedNote(args.symbol, args.position),
            params: {
                duration: n2TO(1),
                position: args.position,
                symbol: args.symbol,
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfMotif: true
            } as SamplerFunctionParameters
        }
    ]
}

function halfDurationAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    return [
        {
            time: n2TO(args.time),
            timeMs: args.timeMs,
            ismuted: false,
            params: {
                duration: n2TO(0.5),
                position: args.position,
                symbol: args.symbol.substring(0, args.symbol.length - 1),
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfMotif: true
            } as SamplerFunctionParameters
        }
    ]
}

function silenceAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    return [
        {
            time: n2TO(args.time),
            timeMs: args.timeMs,
            ismuted: true,
            params: {
                duration: n2TO(1),
                position: args.position,
                symbol: MutingChars[0],
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfMotif: true
            } as SamplerFunctionParameters
        }
    ]
}

// A grace note doesn't add to the playback duration. Instead, its duration is subtracted
// from the previous note's duration.
// A grace notes doesn't have an octave modifier, so its octave is derived from the following note.
function gracenoteAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    const isMelodic = (s: NoteSymbol) => s.length > 0 && MelodicNoteChars.includes(s[0])

    // Subtract the grace note's duration from the previous note action
    if (args.prevaction) {
        args.prevaction.params.duration = n2TO(TO2n(args.prevaction.params.duration) - strokes.gracenote.duration)
    }

    // Determine the correct octave for the grace note
    const baseSymbol = args.symbol.toLowerCase()
    var nearest = baseSymbol
    if (isMelodic(nearest) && args.nextsymbol && isMelodic(args.nextsymbol)) {
        const instrumentRange = _.concat(
            noteRange(args.position),
            _.fill(Array(strokes.rake.number_of_notes), ExtensionChars[0])
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
            time: n2TO(args.time - strokes.gracenote.duration),
            timeMs: args.timeMs - BaseNoteEquiv2Millis(strokes.gracenote.duration, args.bpm),
            ismuted: true,
            params: {
                duration: n2TO(strokes.gracenote.duration),
                position: args.position,
                symbol: graceSymbol,
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfMotif: true
            } as SamplerFunctionParameters
        }
    ]
}

function tremoloAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    // Skip if the previous symbol is also a tremolo note.
    // In that case the motif has already been created.
    if (args.nextsymbol && TremoloChars.some((char) => args.nextsymbol!.includes(char))) return []

    const duration = 1 / strokes.tremolo.notes_per_basenote
    const returnValue: PlaybackSamplerAction[] = []
    const notes = [args.symbol.slice(0, -1)]
    // Include the next symbol if it is also a tremolo note
    if (args.nextsymbol && TremoloChars.some((char) => args.nextsymbol!.includes(char)))
        notes.push(args.nextsymbol.slice(0, -1))
    const totalNotes = notes.length * strokes.tremolo.notes_per_basenote

    for (var idx = 0; idx <= totalNotes; idx++) {
        // Alternate the note to be selected
        const noteIdx = idx % notes.length
        const count = idx + 1
        returnValue.push({
            time: n2TO(args.time + count * duration),
            timeMs: args.timeMs + BaseNoteEquiv2Millis(count * duration, args.bpm),
            ismuted: count < totalNotes,
            params: {
                duration: n2TO(duration),
                position: args.position,
                symbol: notes[noteIdx],
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast && count == totalNotes,
                isLastOfMotif: count == totalNotes
            } as SamplerFunctionParameters
        })
    }
    return returnValue
}

function AcceleratingTremoloAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    // Skip if the previous symbol is also an accelerating tremolo note.
    // In that case the motif has already been created.
    if (args.nextsymbol && AcceleratingTremoloChars.some((char) => args.nextsymbol!.includes(char))) return []

    const returnValue: PlaybackSamplerAction[] = []
    const notes = [args.symbol.slice(0, -1)]
    // Include the next symbol if it is also an accelerating tremolo note
    if (args.nextsymbol && AcceleratingTremoloChars.some((char) => args.nextsymbol!.includes(char)))
        notes.push(args.nextsymbol.slice(0, -1))
    const totalNotes = notes.length * strokes.tremolo.accelerating_motif.length

    var time = args.time
    var timeMs = args.timeMs
    for (var idx = 0; idx < totalNotes; idx++) {
        // Alternate the note to be selected
        const count = idx + 1
        const noteIdx = idx % notes.length
        const duration = strokes.tremolo.accelerating_motif[idx] / strokes.tremolo.accelerating_motif[0]
        const velocity = strokes.tremolo.accelerating_velocity[idx]
        returnValue.push({
            time: n2TO(time),
            timeMs: timeMs,
            ismuted: count < totalNotes,
            params: {
                duration: n2TO(duration),
                position: args.position,
                symbol: notes[noteIdx],
                bpm: args.bpm,
                velocity: velocity,
                isLast: args.isLast && count == totalNotes,
                isLastOfMotif: count == totalNotes
            } as SamplerFunctionParameters
        })
        time += duration
        timeMs += BaseNoteEquiv2Millis(duration, args.bpm)
    }
    return returnValue
}

function rakeAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    // Create a range of unmuted notes in the required direction and append dashes for potential overflow
    const invert = RakeDownChars.includes(args.symbol.slice(-1))
    const instrumentRange = _.concat(
        noteRange(args.position, invert),
        _.fill(Array(strokes.rake.number_of_notes), ExtensionChars[0])
    )
    debug(`result: ${JSON.stringify(instrumentRange)}`)
    const startIdx = instrumentRange.indexOf(args.symbol.slice(0, -1))
    const noteSpacing: DurationInBasenoteEquiv =
        strokes.rake.motif_duration_in_millis / BaseNoteEquiv2Millis(strokes.rake.number_of_notes - 1, args.bpm)
    const noteDuration: DurationInBasenoteEquiv = millis2BaseNoteEquiv(strokes.rake.note_duration_in_millis, args.bpm)
    var offset = 0
    // Generate the motif
    const returnValue: PlaybackSamplerAction[] = []
    for (var idx = 0; idx < strokes.rake.number_of_notes; idx++) {
        const count = idx + 1
        returnValue.push({
            time: n2TO(args.time + offset),
            timeMs: args.timeMs + BaseNoteEquiv2Millis(offset, args.bpm),
            ismuted: false,
            params: {
                duration: n2TO(noteDuration),
                position: args.position,
                symbol: instrumentRange[startIdx + idx],
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast && count == strokes.rake.number_of_notes,
                isLastOfMotif: count == strokes.rake.number_of_notes
            } as SamplerFunctionParameters
        })
        offset += noteSpacing
    }
    debug(`result: ${JSON.stringify(returnValue)}`)
    return returnValue
}
