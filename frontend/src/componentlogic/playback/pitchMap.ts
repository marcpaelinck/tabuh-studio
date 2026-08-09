// Pure pitch-mapping module for the MIDI export and its note-map PDF.
//
// A Tabuh note name (DING1, DONG1, …) is only meaningful once combined with an *instrument*
// (`positionConfigs[position].instrument`): the same name is a different sample on a
// different instrument. The MIDI mapping is therefore built **per instrument**, not per
// position. All the distinct note names an instrument can produce — across every position
// that plays it, and including the abbreviated (`_ABBR`), muted (`_MUTED`) and byot (`X…`)
// variants — are pooled, ordered by pitch, and assigned consecutive MIDI numbers from C1.
//
// Doing this per instrument (rather than per position) means a given note keeps one MIDI
// number no matter which position plays it, and two different notes never collide. (The old
// per-position scheme collided, e.g. reyong-2 DUNG0 and reyong-4 DONG1 both landing on MIDI
// 24, because each reyong position only uses a subset of the reyong's range.)
//
// This is independent of the sampler's own per-position note→sample lookup in
// `useInstruments`; those pitches are internal handles for Tone.Sampler and need not match
// the exported MIDI numbers. Pitches here are nominal 12-TET, not true pelog/slendro tuning.

import type { Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Instrument } from '@tabuhstudio/shared/types/position'

const PITCH_CLASS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Scientific pitch name for a MIDI number (C-1 = 0, C4 = 60 — matches @tonejs/midi). */
export function midiToPitchName(midi: number): string {
    return PITCH_CLASS[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)
}

/** MIDI number of the lowest note assigned to every instrument (C1). */
// const MIDI_BASE = 24

// Pitch ordering for note names. Tone within an octave follows the Balinese sequence; each
// pitch's open / abbreviated / muted / byot variants are kept adjacent and after the open
// note. Names that don't match (kendang, gongs, cengceng, …) sort last, keeping first-seen
// order, which is fine as those instruments each have a single position.
// const TONE_ORDER = ['DING', 'DONG', 'DENG', 'DEUNG', 'DUNG', 'DANG']
// const NOTE_RE = /^(X?)(DING|DONG|DENG|DEUNG|DUNG|DANG)(\d+)(?:_(ABBR|MUTED))?$/

// prettier-ignore
const midiByNoteName:Record<Instrument, Record<string, number>> = {
    GONGS: { PUR: 25, GIR: 24, TONG: 26 },
    KEMPLI: { X_MUTED: 24 },
    CENGCENG: { X_OPEN: 24, X_MUTED: 25 },
    KENDANG: { CUNG: 24, KA: 25, DE: 26, TUT: 27, KUNG: 28, PAK: 29 },
    JEGOGAN: { DING1: 59, DONG1: 60, DENG1: 61, DUNG1: 62, DANG1: 63 },
    CALUNG: { DING1: 59, DONG1: 60, DENG1: 61, DUNG1: 62, DANG1: 63 },
    PENYACAH: { DING1: 59, DONG1: 60, DENG1: 61, DUNG1: 62, DANG1: 63 },
    KANTILAN: { DONG0: 60, DONG0_ABBR: 60, DONG0_MUTED: 60, DENG0: 61, DENG0_ABBR: 61, DENG0_MUTED: 61, DUNG0: 62, DUNG0_ABBR: 62, DUNG0_MUTED: 62, DANG0: 63, DANG0_ABBR: 63, DANG0_MUTED: 63, DING1: 64, DING1_ABBR: 64, DING1_MUTED: 64, DONG1: 65, DONG1_ABBR: 65, DONG1_MUTED: 65, DENG1: 66, DENG1_ABBR: 66, DENG1_MUTED: 66, DUNG1: 67, DUNG1_ABBR: 67, DUNG1_MUTED: 67, DANG1: 68, DANG1_ABBR: 68, DANG1_MUTED: 68, DING2: 69, DING2_ABBR: 69, DING2_MUTED: 69},
    PEMADE: { DONG0: 60, DONG0_ABBR: 60, DONG0_MUTED: 60, DENG0: 61, DENG0_ABBR: 61, DENG0_MUTED: 61, DUNG0: 62, DUNG0_ABBR: 62, DUNG0_MUTED: 62, DANG0: 63, DANG0_ABBR: 63, DANG0_MUTED: 63, DING1: 64, DING1_ABBR: 64, DING1_MUTED: 64, DONG1: 65, DONG1_ABBR: 65, DONG1_MUTED: 65, DENG1: 66, DENG1_ABBR: 66, DENG1_MUTED: 66, DUNG1: 67, DUNG1_ABBR: 67, DUNG1_MUTED: 67, DANG1: 68, DANG1_ABBR: 68, DANG1_MUTED: 68, DING2: 69, DING2_ABBR: 69, DING2_MUTED: 69},
    UGAL: { DONG0: 60, DONG0_ABBR: 60, DONG0_MUTED: 60, DENG0: 61, DENG0_ABBR: 61, DENG0_MUTED: 61, DUNG0: 62, DUNG0_ABBR: 62, DUNG0_MUTED: 62, DANG0: 63, DANG0_ABBR: 63, DANG0_MUTED: 63, DING1: 64, DING1_ABBR: 64, DING1_MUTED: 64, DONG1: 65, DONG1_ABBR: 65, DONG1_MUTED: 65, DENG1: 66, DENG1_ABBR: 66, DENG1_MUTED: 66, DUNG1: 67, DUNG1_ABBR: 67, DUNG1_MUTED: 67, DANG1: 68, DANG1_ABBR: 68, DANG1_MUTED: 68, DING2: 69, DING2_ABBR: 69, DING2_MUTED: 69},
    TROMPONG: {DING0: 59, DING0_ABBR: 59, DING0_MUTED: 59, DONG0: 60, DONG0_ABBR: 60, DONG0_MUTED: 60, DENG0: 61, DENG0_ABBR: 61, DENG0_MUTED: 61, DUNG0: 62, DUNG0_ABBR: 62, DUNG0_MUTED: 62, DANG0: 63, DANG0_ABBR: 63, DANG0_MUTED: 63, DING1: 64, DING1_ABBR: 64, DING1_MUTED: 64, DONG1: 65, DONG1_ABBR: 65, DONG1_MUTED: 65, DENG1: 66, DENG1_ABBR: 66, DENG1_MUTED: 66, DUNG1: 67, DUNG1_ABBR: 67, DUNG1_MUTED: 67, DANG1: 68, DANG1_ABBR: 68, DANG1_MUTED: 68 },
    GENDER_RAMBAT: {DENG0: 61, DENG0_ABBR: 61, DENG0_MUTED: 61, DUNG0: 62, DUNG0_ABBR: 62, DUNG0_MUTED: 62, DANG0: 63, DANG0_ABBR: 63, DANG0_MUTED: 63, DING1: 64, DING1_ABBR: 64, DING1_MUTED: 64, DONG1: 65, DONG1_ABBR: 65, DONG1_MUTED: 65, DENG1: 66, DENG1_ABBR: 66, DENG1_MUTED: 66, DUNG1: 67, DUNG1_ABBR: 67, DUNG1_MUTED: 67, DANG1: 68, DANG1_ABBR: 68, DANG1_MUTED: 68, DING2: 69, DING2_ABBR: 69, DING2_MUTED: 69 },
    REYONG: { XDUNG0: 24, XDUNG0_ABBR: 24, XDUNG0_MUTED: 24, XDENG2: 25, XDENG2_ABBR: 25, XDENG2_MUTED: 25, XDONG1: 26, XDONG1_ABBR: 26, XDONG1_MUTED: 26, XDANG1: 27, XDANG1_ABBR: 27, XDANG1_MUTED: 27, DENG0: 61, DENG0_ABBR: 61, DENG0_MUTED: 61, DUNG0: 62, DUNG0_ABBR: 62, DUNG0_MUTED: 62, DANG0: 63, DANG0_ABBR: 63, DANG0_MUTED: 63, DING1: 64, DING1_ABBR: 64, DING1_MUTED: 64, DONG1: 65, DONG1_ABBR: 65, DONG1_MUTED: 65, DENG1: 66, DENG1_ABBR: 66, DENG1_MUTED: 66, DUNG1: 67, DUNG1_ABBR: 67, DUNG1_MUTED: 67, DANG1: 68, DANG1_ABBR: 68, DANG1_MUTED: 68, DING2: 69, DING2_ABBR: 69, DING2_MUTED: 69, DONG2: 70, DONG2_ABBR: 70, DONG2_MUTED: 70, DENG2: 71, DENG2_ABBR: 71, DENG2_MUTED: 71, DUNG2: 72, DUNG2_ABBR: 72, DUNG2_MUTED: 72 },
    CENGCENG_KOPYAK: { X_OPEN: 24, X_MUTED: 25 },
    REYONGB: { XDONG1: 24, XDONG1_ABBR: 24, XDONG1_MUTED: 24, XDUNG1: 25, XDUNG1_ABBR: 25, XDUNG1_MUTED: 25, DONG1: 65, DONG1_ABBR: 65, DONG1_MUTED: 65, DENG1: 66, DENG1_ABBR: 66, DENG1_MUTED: 66, DUNG1: 67, DUNG1_ABBR: 67, DUNG1_MUTED: 67, DANG1: 68, DANG1_ABBR: 68, DANG1_MUTED: 68 },
    TAWATAWA: { X: 24 },
    PONGGANG: { DUNG1: 24, DANG1: 25 }
}

// function sortKey(name: string): number {
//     const m = NOTE_RE.exec(name)
//     if (!m) return Number.MAX_SAFE_INTEGER
//     const [, x, tone, octave, variant] = m
//     const variantIdx = (variant === 'ABBR' ? 1 : variant === 'MUTED' ? 2 : 0) + (x ? 3 : 0)
//     return parseInt(octave, 10) * 1000 + TONE_ORDER.indexOf(tone) * 10 + variantIdx
// }

/** Positions grouped by their instrument, in `positionConfigs` declaration order. */
const positionsByInstrument = ((): Record<Instrument, Position[]> => {
    const acc = {} as Record<Instrument, Position[]>
    for (const [position, cfg] of Object.entries(positionConfigs)) {
        ;(acc[cfg.instrument] ??= []).push(position as Position)
    }
    return acc
})()

/** note name → MIDI number, per instrument (the pooled, pitch-ordered assignment). */
// const midiByNoteName = ((): Record<Instrument, Record<string, number>> => {
//     const acc = {} as Record<Instrument, Record<string, number>>
//     for (const [instrument, positions] of Object.entries(positionsByInstrument)) {
//         const names: string[] = []
//         const seen = new Set<string>()
//         for (const position of positions) {
//             for (const name of Object.values(positionConfigs[position].symbolToNoteNames).flat()) {
//                 if (!seen.has(name)) {
//                     seen.add(name)
//                     names.push(name)
//                 }
//             }
//         }
//         // Stable sort by pitch (Array.prototype.sort is stable), so unparsed names keep order.
//         names.sort((a, b) => sortKey(a) - sortKey(b))
//         const map: Record<string, number> = {}
//         names.forEach((name, i) => (map[name] = MIDI_BASE + i))
//         acc[instrument as Instrument] = map
//     }
//     return acc
// })()

const instrumentOf = (position: Position): Instrument | undefined => positionConfigs[position]?.instrument

/**
 * The MIDI note number(s) a symbol plays for a given position (0..n; n>1 for chord keys),
 * using the position's instrument-wide mapping. Reused by the MIDI export.
 */
export function symbolMidis(position: Position, canonicalSymbol: string): number[] {
    const instrument = instrumentOf(position)
    if (!instrument) return []
    const map = midiByNoteName[instrument]
    return (positionConfigs[position].symbolToNoteNames[canonicalSymbol] ?? []).map((name) => map[name])
}

export interface NoteMapRow {
    midi: number
    pitch: string // scientific name, e.g. "C1"
    note: string // Tabuh note name, e.g. "DING1"
    symbols: string // notation symbol(s) producing this note, in this position
}

/** The instrument a position plays. */
export function instrumentForPosition(position: Position): Instrument | undefined {
    return instrumentOf(position)
}

/**
 * The note-map rows for a whole instrument: every distinct note the instrument can play
 * (pooled across all its positions), with its MIDI number and the notation symbol(s) that
 * produce it (aggregated over the instrument's positions), sorted by MIDI number.
 */
export function instrumentNoteMapRows(instrument: Instrument): NoteMapRow[] {
    const map = midiByNoteName[instrument]
    if (!map) return []

    const symbolsByNote: Record<string, string[]> = {}
    for (const position of positionsByInstrument[instrument] ?? []) {
        for (const [symbol, names] of Object.entries(positionConfigs[position].symbolToNoteNames)) {
            for (const name of names) (symbolsByNote[name] ??= []).push(symbol)
        }
    }

    return Object.keys(map)
        .map((note) => ({
            midi: map[note],
            pitch: midiToPitchName(map[note]),
            note,
            symbols: [...new Set(symbolsByNote[note] ?? [])].join('  ')
        }))
        .sort((a, b) => a.midi - b.midi)
}
