// Pure pitch-mapping module.
//
// The sampler assigns each position's unique Tabuh note names (the values of
// `positionConfigs[position].symbolToNoteNames`, de-duplicated in insertion order) to the
// chromatic Western note names in `NOTES` (C1…B3), one per index. That nominal 12-TET
// mapping is what the app actually plays, and therefore what the MIDI export must emit and
// what the note-map PDF must document. Keeping the derivation here — pure, framework-free —
// lets `useInstruments` (playback), `midiGenerator` (export) and `midiNoteMap` (the PDF)
// share a single source of truth so their pitches always agree.

import type { Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import { NOTES } from '../../config/config'

export interface PositionPitchMap {
    /** Unique Tabuh note names, in the order the sampler assigns them to NOTES. */
    noteNames: string[]
    /** Tabuh note name → assigned Western pitch (a NOTES entry, e.g. "C1"). */
    pitchByNoteName: Record<string, string>
    /** Notation symbol → the Western pitch name(s) it plays (0..n; n>1 for chord keys). */
    symbolToPitches: Record<string, string[]>
    /** Western pitch name → the notation symbol(s) that produce it. */
    symbolsByPitch: Record<string, string[]>
}

function build(position: Position): PositionPitchMap {
    const symbolToNoteNames = positionConfigs[position]?.symbolToNoteNames ?? {}
    const noteNames = [...new Set(Object.values(symbolToNoteNames).flat())]
    const pitchByNoteName: Record<string, string> = {}
    noteNames.forEach((name, i) => {
        pitchByNoteName[name] = NOTES[i]
    })
    const symbolToPitches: Record<string, string[]> = {}
    const symbolsByPitch: Record<string, string[]> = {}
    for (const [symbol, names] of Object.entries(symbolToNoteNames)) {
        const pitches = names.map((n) => pitchByNoteName[n])
        symbolToPitches[symbol] = pitches
        for (const pitch of pitches) (symbolsByPitch[pitch] ??= []).push(symbol)
    }
    return { noteNames, pitchByNoteName, symbolToPitches, symbolsByPitch }
}

const cache = Object.fromEntries((Object.keys(positionConfigs) as Position[]).map((p) => [p, build(p)])) as Record<
    Position,
    PositionPitchMap
>

const EMPTY: PositionPitchMap = { noteNames: [], pitchByNoteName: {}, symbolToPitches: {}, symbolsByPitch: {} }

/** The full pitch mapping for a position (see `PositionPitchMap`). */
export function positionPitchMap(position: Position): PositionPitchMap {
    return cache[position] ?? EMPTY
}

/**
 * The Western note name(s) a symbol maps to for a given position — the same mapping the
 * sampler uses to pick samples. Returns 0..n names (a key can trigger several pitches, e.g.
 * octave doubling / chord keys). Reused by the MIDI export so exported pitches match
 * playback. Note: 12-TET nominal names, not true pelog/slendro tuning.
 */
export function noteNamesForSymbol(position: Position, canonicalSymbol: string): string[] {
    return cache[position]?.symbolToPitches[canonicalSymbol] ?? []
}

const PITCH_CLASS: Record<string, number> = {
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11
}

/** MIDI note number for a scientific pitch name (C-1 = 0, C4 = 60 — matches @tonejs/midi). */
export function pitchToMidi(name: string): number {
    const m = /^([A-G]#?)(-?\d+)$/.exec(name ?? '')
    if (!m) return 0
    return PITCH_CLASS[m[1]] + (parseInt(m[2], 10) + 1) * 12
}
