// Derives the playback/animation `Note` (tone, octave, muting, strike) straight from a symbol's
// NoteObject, replacing the `noteConfigs` shorthand-code lookup (refactor step 3 — see
// CLAUDE.refactor-configuration-settings.md). Tone comes from the alphabet, octave from the symbol's
// octavation, muting from the stroke modifier, and the physical strike location from the position's
// instrument type + the reyong rim (`X`) prefix.
//
// A symbol usually produces one note (`[self]`); a few "combined" symbols (BYONG on reyong) produce
// several simultaneous notes — that expansion is the `voicing`, stored here as `combinedVoicings`
// (the future full voicing table). Each atomic note is then derived by `deriveNote`.

import { alphabet } from '@tabuhstudio/shared/config/alphabet'
import { getPositionType } from '@tabuhstudio/shared/config/configAccess'
import { MELODIC_PITCH_CHARS } from '@tabuhstudio/shared/constants/noteChars'
import type { MutingType, NoteSymbol, StrokeLocation, ToneType } from '@tabuhstudio/shared/types/basetypes'
import { NoteObject } from '@tabuhstudio/shared/types/NoteObject'
import type { Position } from '@tabuhstudio/shared/types/position'
import type { Note } from '../../typing/score'

// Symbols that strike more than one note at once, by pitch char then position. The listed strings are
// the constituent symbols (a prefix/modifier on the parent symbol is carried onto each). Everything
// not listed here produces the single note it denotes.
const combinedVoicings: Partial<Record<NoteSymbol, Partial<Record<Position, NoteSymbol[]>>>> = {
    b: {
        REYONG_1: ['e,', 'a,'],
        REYONG_2: ['i', 'e'],
        REYONG_3: ['u', 'i<'],
        REYONG_4: ['o<', 'u<'],
        REYONGB_1: ['o', 'e'],
        REYONGB_2: ['u', 'a']
    },
    t: { REYONG_1: ['e,', 'i'] }
}

const irregularNotes: Partial<
    Record<NoteSymbol | '', Partial<Record<Position, { tone: ToneType; octave: number; stroke: StrokeLocation }>>>
> = {
    x: {
        REYONG_1: { tone: 'DUNG', octave: 0, stroke: 'RIM' },
        REYONG_2: { tone: 'DONG', octave: 1, stroke: 'RIM' },
        REYONG_3: { tone: 'DANG', octave: 1, stroke: 'RIM' },
        REYONG_4: { tone: 'DENG', octave: 2, stroke: 'RIM' },
        REYONGB_1: { tone: 'DONG', octave: 1, stroke: 'RIM' },
        REYONGB_2: { tone: 'DUNG', octave: 1, stroke: 'RIM' }
    }
}

/** The atomic notes a symbol produces on its position (`[self]` for most; several for BYONG). */
export function voicing(note: NoteObject): NoteObject[] {
    const constituents = note.position ? combinedVoicings[note.symbol.pitch]?.[note.position] : undefined
    if (!constituents) return [new NoteObject(note.canonicalSymbol, note.position)]
    return constituents.map((t) => new NoteObject(note.symbol.prefix + t + note.symbol.modifier, note.position))
}

/** The tone a note plays (from the alphabet's 1-to-1 pitch → tone map). */
export function noteTone(note: NoteObject): ToneType | undefined {
    if (irregularNotes[note.symbol.pitch] && note.position && irregularNotes[note.symbol.pitch]![note.position])
        return irregularNotes[note.symbol.pitch]![note.position]!.tone
    return alphabet[note.symbol.pitch]?.tone
}

/** Muting is purely modifier-derived: `?` = MUTED, `/` = ABBREVIATED, anything else = OPEN. */
export function noteMuting(note: NoteObject): MutingType {
    return note.symbol.modifier === '?' ? 'MUTED' : note.symbol.modifier === '/' ? 'ABBREVIATED' : 'OPEN'
}

/**
 * Absolute octave (0 lower / 1 middle / 2 upper) for melodic pitches, `null` for percussion.
 * NoteObject.octaveNumber is relative (−1/0/1); the animation/note model uses the absolute value.
 */
export function noteOctave(note: NoteObject): number | null {
    if (irregularNotes[note.symbol.pitch] && note.position && irregularNotes[note.symbol.pitch]![note.position])
        return irregularNotes[note.symbol.pitch]![note.position]!.octave
    return MELODIC_PITCH_CHARS.has(note.symbol.pitch) ? note.octaveNumber + 1 : null
}

/**
 * Physical strike location for the animation. Reyong (`chimes`) is struck on the knob, or on the rim
 * for the `X`-prefixed stroke; the kempli boss is a knob; everything else (gangsa/gongs/kendang…) has
 * no distinct location (mallet/hand). Distinct from `NoteObject.stroke` (the articulation modifier).
 */
export function noteStrike(note: NoteObject): StrokeLocation | null {
    if (irregularNotes[note.symbol.pitch] && note.position && irregularNotes[note.symbol.pitch]![note.position])
        return irregularNotes[note.symbol.pitch]![note.position]!.stroke
    const type = note.position ? getPositionType(note.position) : ''
    if (type === 'chimes') return note.symbol.pitch.toLowerCase() === 'x' ? 'RIM' : 'KNOB' // reyong: rim on `X`, else knob
    return null
}

/** The full derived note for a single (atomic) symbol. */
export function deriveNote(note: NoteObject): Note {
    return {
        tone: noteTone(note) as ToneType,
        octave: noteOctave(note),
        stroke: noteStrike(note),
        muting: noteMuting(note)
    }
}
