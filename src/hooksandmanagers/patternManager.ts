// Converts symbols that represent multiple notes to an array of symbol/duration pairs.

import _ from 'lodash'
import * as Tone from 'tone'
import type { TimeObject } from 'tone/build/esm/core/type/Units'
import { positionConfigs } from '../config/config'
import type { DurationInBasenoteEquiv, NoteSymbol, Position, TimeInBasenoteEquiv } from '../models/types'
import { noteRange } from '../utils/alphabet'
import { debug } from '../utils/debugger'
import { BaseNoteEquiv2Millis, millis2BaseNoteEquiv, n2TO } from '../utils/timeunits'

const patterns = {
    tremolo:
        // TREMOLO
        // Repeated striking of the same note.
        // notes_per_quarternote -  tremolo frequency (number of beats per time unit). Should be a divisor of base_note_time.
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
            notes_per_quarternote: 3,
            accelerating_pattern: [48, 40, 32, 26, 22, 18, 14, 10, 10, 10, 10, 10],
            accelerating_velocity: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5]
        },
    rake:
        // RAKE
        // The rake pattern consists of a rapid sequence of unmuted notes played by sliding the panggul over the instrument's keys.
        // The pattern can be played both ways (up and down) and has a fixed duration in milliseconds. This means that the duration in base notes
        // depends on the tempo, making it very difficult to synchronize it with other notes or patterns. Therefore it is best to use the pattern
        // at the end of a measure/section: the Playback Manager will take care of resynchronizing all positions at the start of the next section.
        // The number of notes is fixed and the starting note is given in the notation. If the end of the instrument's range is reached before
        // the entire pattern could be generated, continuation symbols ('-') will be generated for the remaining pattern.
        {
            number_of_notes: 8, // Minimum is 2. This number will be truncated if there are less notes until the the beginning/end of the instrument's range.
            pattern_duration_in_millis: 120, // Total duration of the pattern.
            note_duration_in_millis: 5000 // sustain time of the notes: the notes will overlap.
        }
}

// Returns a list of triplets [note symbol, relative time in basenote units, duration in basenote units]
export interface CreatePatternArgs {
    time: TimeInBasenoteEquiv
    position: Position
    cleanedSymbol: NoteSymbol
    bpm: number
    velocity: Tone.Unit.NormalRange
}
export interface PatternNoteAction {
    time: TimeObject
    duration: TimeObject
    position: Position
    cleanedSymbol: NoteSymbol
    bpm: number
    velocity: Tone.Unit.NormalRange
}
export function createPattern(args: CreatePatternArgs): PatternNoteAction[] {
    if (args.cleanedSymbol in positionConfigs[args.position].symbolToNoteNames) {
        // Valid note symbol
        return doSingleNote(args)
    } else if (positionConfigs[args.position].validPatterns.includes(args.cleanedSymbol)) {
        // Valid pattern
        switch (true) {
            case args.cleanedSymbol.slice(-1) == ';': {
                // TREMOLO PATTERN
                debug(`${args.cleanedSymbol} is TREMOLO`)
                // TODO implement Tremolo
                return doTremolo(args)
            }
            case args.cleanedSymbol.slice(-1) == ':': {
                // ACCELERATING TREMOLO PATTERN
                debug(`${args.cleanedSymbol} is ACCELERATING TREMOLO`)
                // TODO implement Accelerating Tremolo
                return doAcceleratingTremolo(args)
            }
            case args.cleanedSymbol.slice(-1) == '[' || args.cleanedSymbol.slice(-1) == ']': {
                debug(`${args.cleanedSymbol} is RAKE`)
                // RAKE PATTERN
                return doRake(args)
            }
            default: {
                // Unhandled pattern
                console.error(`Unexpected symbol ${args.cleanedSymbol} for ${args.position}`)
                return doSilence(args)
            }
        }
    } else {
        console.error(`invalid symbol ${args.cleanedSymbol} for ${args.position}`)
        return doSilence(args)
    }
}

function doSingleNote(args: CreatePatternArgs) {
    return [
        {
            time: n2TO(args.time),
            duration: n2TO(1),
            position: args.position,
            cleanedSymbol: args.cleanedSymbol,
            bpm: args.bpm,
            velocity: args.velocity
        }
    ]
}

function doSilence(args: CreatePatternArgs) {
    return [
        {
            time: n2TO(args.time),
            duration: n2TO(1),
            position: args.position,
            cleanedSymbol: '.',
            bpm: args.bpm,
            velocity: args.velocity
        }
    ]
}

function doTremolo(args: CreatePatternArgs) {
    return [
        {
            time: n2TO(args.time),
            duration: n2TO(1),
            position: args.position,
            cleanedSymbol: args.cleanedSymbol,
            bpm: args.bpm,
            velocity: args.velocity
        }
    ]
}

function doAcceleratingTremolo(args: CreatePatternArgs) {
    return [
        {
            time: n2TO(args.time),
            duration: n2TO(1),
            position: args.position,
            cleanedSymbol: args.cleanedSymbol,
            bpm: args.bpm,
            velocity: args.velocity
        }
    ]
}

// Create a RAKE pattern
function doRake(args: CreatePatternArgs) {
    // Create a range of unmuted notes in the required direction and append dashes for potential overflow
    const invert = args.cleanedSymbol.slice(-1) == '['
    const instrumentRange = _.concat(
        noteRange(args.position, invert),
        _.fill(Array(patterns.rake.number_of_notes), '-')
    )
    debug(`result: ${JSON.stringify(instrumentRange)}`)
    const startIdx = instrumentRange.indexOf(args.cleanedSymbol.slice(0, -1))
    const noteSpacing: DurationInBasenoteEquiv =
        patterns.rake.pattern_duration_in_millis / BaseNoteEquiv2Millis(patterns.rake.number_of_notes - 1, args.bpm)
    const noteDuration: DurationInBasenoteEquiv = millis2BaseNoteEquiv(patterns.rake.note_duration_in_millis, args.bpm)
    var offset = 0
    // Generate the pattern
    const returnValue: PatternNoteAction[] = []
    for (var i = 0; i < patterns.rake.number_of_notes; i++) {
        returnValue.push({
            time: n2TO(args.time + offset),
            duration: n2TO(noteDuration),
            position: args.position,
            cleanedSymbol: instrumentRange[startIdx + i],
            bpm: args.bpm,
            velocity: args.velocity
        })
        offset += noteSpacing
    }
    debug(`result: ${JSON.stringify(returnValue)}`)
    return returnValue
}
