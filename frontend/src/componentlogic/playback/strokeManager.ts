// This module converts all symbols to playback actions. A symbol can stand for a single base note or for a sequence of
// notes that can not be written accurately as a series of base notes, such as tremolo or rake.
//
// Stroke modifiers that are shorthand notation for sequences of base notes --e.g. 'norot' patterns--
// are converted to regular notation symbols by the patternManager. They are not handled in this module.

import { NoteObject } from '@tabuhstudio/shared'
import _ from 'lodash'
import * as ToneJS from 'tone'
import { AcceleratingTremoloChars, ExtensionChars, MutingChars, RakeDownChars, TremoloChars } from '../../config/config'
import type { BPM, DurationInBasenoteEquiv, Position, TimeInBasenoteEquiv } from '../../typing/basetypes'
import type { PlaybackSamplerAction, SamplerFunction, SamplerFunctionParameters } from '../../typing/playback'
import { noteRange } from '../../utils/alphabet'
import { debug } from '../../utils/debugger'
import { BaseNoteEquiv2Millis, millis2BaseNoteEquiv, n2TO, TO2n } from '../../utils/timeunits'

// prettier-ignore
const strokes = {
    /** DAMPED AND MUTED 
     * These values are used to emulate the strokes if no separate samples are available
    */
    damped: { duration: 0.4, silence: 0.6 },
    muted: { duration: 0.15, silence: 0.85 },
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
    gracenote: { duration: 0.45 }
}

export interface CreateStrokeArgs {
    samplerFunction: SamplerFunction
    time: TimeInBasenoteEquiv // current time
    timeMs: number
    measureIdx: number
    position: Position
    prevnote: NoteObject | undefined // previous symbol in the notation
    note: NoteObject // current symbol in the notation
    nextnote: NoteObject | undefined // symbol following the current symbol
    bpm: BPM // current tempo in BPM
    velocity: ToneJS.Unit.NormalRange // current velocity
    prevaction: PlaybackSamplerAction | undefined // previous action created for this position
    isLast: boolean // true if this is the last symbol in the current position's notation
}
// Checks if there is a sample for the note's stroke. If not, the stroke is emulated.
// Returns a list of PlaybackSamplerAction objects.
// Function `createNoteActions` expects a `CreateStrokeArgs` object as argument.
// Arguments `prevnote` and `nextnote` are required because some motifs can consist of two consecutive symbols.
// The 'grace note' motif requires information about the next symbol to determine its octave.
// WARNING: GRACE NOTES WILL MODIFY THE LAST `SamplerAction` OBJECT, MAKING `createNoteActions` AN 'IMPURE FUNCTION'.
export function createNoteActions(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    const returnValue: PlaybackSamplerAction[] = []
    if (args.note.error) {
        console.error(`invalid stroke type '${args.note.toString()}' for ${args.position}`)
        return silenceAction(args)
    }
    // Assume that grace notes will only be combined with unmuted, damped or muted note
    if (args.note.graceNote) returnValue.push(...gracenoteAction(args))
    if (!args.note.hasStroke) {
        returnValue.push(...openNoteAction(args))
        return returnValue
    }
    if (args.note.stroke.damped) {
        returnValue.push(...dampedNoteAction(args))
        return returnValue
    }
    if (args.note.stroke.muted) {
        returnValue.push(...mutedNoteAction(args))
        return returnValue
    }

    // The following strokes are emulated with a sequence of notes.
    if (args.note.stroke.halfduration) return halfDurationAction(args)
    if (args.note.stroke.tremolo) return tremoloAction(args)
    if (args.note.stroke.acceleratingtremolo) return AcceleratingTremoloAction(args)
    if (args.note.stroke.rakeleft || args.note.pattern.rakeright) return rakeAction(args)

    console.error(`Unexpected stroke type ${args.note.toString()} for ${args.position}`)
    return silenceAction(args)
}

export function noteDuration(note: NoteObject, bpm: number, unit: 'millisecond' | 'basenote'): number {
    if (note.error) {
        // Error note is treated as silence with duration 1
        return 1
    }
    if (!note.hasStroke || note.stroke.damped || note.stroke.muted || note.stroke.tremolo) {
        return unit == 'basenote' ? 1 : BaseNoteEquiv2Millis(1, bpm)
    }
    if (note.stroke.halfduration) {
        return unit == 'basenote' ? 0.5 : BaseNoteEquiv2Millis(0.5, bpm)
    }
    if (note.stroke.acceleratingtremolo) {
        const durationBn =
            strokes.tremolo.accelerating_motif.reduce((sum, n) => sum + n, 0) / strokes.tremolo.accelerating_motif[0]
        return unit == 'basenote' ? durationBn : BaseNoteEquiv2Millis(durationBn, bpm)
    }
    if (note.stroke.rakeleft || note.stroke.rakeright) {
        return (
            unit == 'basenote'
                ? millis2BaseNoteEquiv(strokes.rake.motif_duration_in_millis, bpm)
                : strokes.rake.motif_duration_in_millis,
            bpm
        )
    }
    return 1
}

export function totalDuration(notes: NoteObject[], bpm: number, unit: 'millisecond' | 'basenote') {
    return _.sum(notes.map((note) => noteDuration(note, bpm, unit)))
}

const DEFAULT_DURATION = 1
const DEFAULT_OFFSET = 0
const DEFAULT_LASTOFMOTIF = false
interface NewActionParams {
    args: CreateStrokeArgs
    offset?: number // Offset from args.time.
    duration?: number // Duration of the note in basenote units.
    note?: NoteObject // Note to play.
    isLastOfMotif?: boolean // Last note of the stroke's motif.
}
function newAction({ args, offset, duration, note, isLastOfMotif }: NewActionParams): PlaybackSamplerAction {
    return {
        time: n2TO(args.time + (offset ?? DEFAULT_OFFSET)),
        timeMs: args.timeMs + BaseNoteEquiv2Millis(offset ?? DEFAULT_OFFSET, args.bpm),
        ismuted: args.note.pattern.damped || args.note.pattern.muted,
        params: {
            duration: n2TO(duration ?? DEFAULT_DURATION),
            position: args.position,
            note: note ?? args.note,
            bpm: args.bpm,
            velocity: args.velocity,
            isLast: args.isLast && (isLastOfMotif ?? DEFAULT_LASTOFMOTIF),
            isLastOfMotif: isLastOfMotif ?? DEFAULT_LASTOFMOTIF
        } as SamplerFunctionParameters
    }
}

function openNoteAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    const symbol = args.note.symbol
    return [
        {
            time: n2TO(args.time),
            timeMs: args.timeMs,
            ismuted: args.note.pattern.damped || args.note.pattern.muted,
            params: {
                duration: n2TO(1),
                position: args.position,
                note: new NoteObject(symbol.pitch + symbol.octave, args.note.position),
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: args.isLast,
                isLastOfMotif: true
            } as SamplerFunctionParameters
        }
    ]
}

function dampedNoteAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    const symbol = args.note.symbol
    if (args.note.hasSample) {
        const note = new NoteObject(symbol.pitch + symbol.octave + symbol.modifier, args.note.position)
        return [newAction({ args: args, note })]
    } else {
        // Emulate using note without modifier
        debug(`emulating damped note for ${args.position}`)
        const note = new NoteObject(symbol.pitch + symbol.octave, args.note.position)
        return [
            newAction({ args: args, note, duration: strokes.damped.duration }),
            newAction({
                args: args,
                note: new NoteObject(' ', args.position),
                offset: strokes.damped.duration,
                duration: strokes.damped.silence,
                isLastOfMotif: true
            })
        ]
    }
}

function mutedNoteAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    const symbol = args.note.symbol
    if (args.note.hasSample) {
        const note = new NoteObject(symbol.pitch + symbol.octave + symbol.modifier, args.note.position)
        return [newAction({ args: args, note })]
    } else {
        // Emulate using note without modifier
        debug(`emulating muted note for ${args.position}`)
        const note = new NoteObject(symbol.pitch + symbol.octave, args.note.position)
        return [
            newAction({ args: args, note, duration: strokes.muted.duration }),
            newAction({
                args: args,
                note: new NoteObject(' ', args.position),
                offset: strokes.muted.duration,
                duration: strokes.muted.silence,
                isLastOfMotif: true
            })
        ]
    }
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
                note: new NoteObject(
                    args.note.canonicalSymbol.substring(0, args.note.canonicalSymbol.length - 1),
                    args.position
                ),
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
                note: new NoteObject(MutingChars[0], args.position),
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
    // const isMelodic = (s: NoteSymbol) => s.length > 0 && MelodicNoteChars.includes(s[0])
    if (!args.note.graceNote) return []
    // Subtract the grace note's duration from the previous note action
    if (args.prevaction) {
        args.prevaction.params.duration = n2TO(TO2n(args.prevaction.params.duration) - strokes.gracenote.duration)
    }

    return [
        {
            time: n2TO(args.time - strokes.gracenote.duration),
            timeMs: args.timeMs - BaseNoteEquiv2Millis(strokes.gracenote.duration, args.bpm),
            ismuted: true,
            params: {
                duration: n2TO(strokes.gracenote.duration),
                position: args.position,
                note: new NoteObject(args.note.graceNote.pitch + args.note.graceNote.octave, args.position),
                bpm: args.bpm,
                velocity: args.velocity,
                isLast: false,
                isLastOfMotif: false
            } as SamplerFunctionParameters
        }
    ]
}

function tremoloAction(args: CreateStrokeArgs): PlaybackSamplerAction[] {
    // Skip if the next symbol is also a tremolo note.
    // In that case the motif will be generated when the next note is being processed.
    if (args.nextnote && TremoloChars.some((char) => args.nextnote?.canonicalSymbol.includes(char))) return []

    const duration = 1 / strokes.tremolo.notes_per_basenote
    const returnValue: PlaybackSamplerAction[] = []
    const notes: NoteObject[] = [new NoteObject(args.note.canonicalSymbol.slice(0, -1), args.position)]
    // Include the next symbol if it is also a tremolo note
    if (args.nextnote?.canonicalSymbol && TremoloChars.some((char) => args.nextnote?.canonicalSymbol.includes(char)))
        notes.push(new NoteObject(args.nextnote?.canonicalSymbol.slice(0, -1), args.position))
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
                note: notes[noteIdx],
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
    if (args.nextnote && AcceleratingTremoloChars.some((char) => args.nextnote?.canonicalSymbol.includes(char)))
        return []

    const returnValue: PlaybackSamplerAction[] = []
    const notes: NoteObject[] = [new NoteObject(args.note.canonicalSymbol.slice(0, -1), args.position)]
    // Include the next symbol if it is also an accelerating tremolo note
    if (
        args.nextnote?.canonicalSymbol &&
        AcceleratingTremoloChars.some((char) => args.nextnote?.canonicalSymbol.includes(char))
    )
        notes.push(new NoteObject(args.nextnote?.canonicalSymbol.slice(0, -1), args.position))
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
                note: notes[noteIdx],
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
    const invert = RakeDownChars.includes(args.note.canonicalSymbol.slice(-1))
    const instrumentRange = _.concat(
        noteRange(args.position, invert),
        _.fill(Array(strokes.rake.number_of_notes), ExtensionChars[0])
    )
    debug(`result: ${JSON.stringify(instrumentRange)}`)
    const startIdx = instrumentRange.indexOf(args.note.canonicalSymbol.slice(0, -1))
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
                note: new NoteObject(instrumentRange[startIdx + idx], args.position),
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
