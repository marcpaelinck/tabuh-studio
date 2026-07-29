// MIDI export.
//
// `generateMidiFile` encodes a resolved playback `TimeLine` as a Standard MIDI File,
// one track per instrument position. It only *translates* the timeline — all the music
// logic (execution flow, tempo, dynamics, muting) is already baked into the sampler
// actions — so the exported file matches what the app plays.
//
// Phase 1: absolute note times (a single, constant header tempo — the DAW plays the
// correct timing, though its bar grid won't reflect tempo changes yet), pitches taken
// from the app's own 12-TET nominal note-name mapping (not true pelog/slendro tuning),
// and muted notes emitted as short notes.

import type { Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import { Midi } from '@tonejs/midi'
import type { PlaybackSamplerAction, TimeLine } from '../../typing/playback'
import { To2Millis } from '../../utils/timeunits'
import { noteNamesForSymbol } from './useInstruments'

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

/** Encodes a resolved playback timeline as a Standard MIDI File (one track per position). */
export function generateMidiFile(timeline: TimeLine): Uint8Array {
    const midi = new Midi()

    // Group the sampler actions by position, preserving timeline order. Each position
    // (including the kempli/beat position) becomes its own track.
    const byPosition = new Map<Position, PlaybackSamplerAction[]>()
    for (const action of timeline.sampleractions ?? []) {
        if (action.params.note.isMutingSilence) continue // rests carry no note
        const position = action.params.position
        const list = byPosition.get(position)
        if (list) list.push(action)
        else byPosition.set(position, [action])
    }

    for (const [position, actions] of byPosition) {
        const track = midi.addTrack()
        track.name = positionConfigs[position]?.name ?? position
        for (const action of actions) {
            const time = action.timeMs / 1000
            const duration = Math.max(0, To2Millis(action.params.duration, action.params.bpm) / 1000)
            const velocity = clamp01(action.params.velocity)
            // A symbol can map to several pitches (octave doubling / chord keys) → one note each.
            // Muted notes (`action.ismuted`) are emitted as-is in Phase 1; a later option could
            // route them to a separate track / samples.
            for (const name of noteNamesForSymbol(position, action.params.note.canonicalSymbol)) {
                track.addNote({ name, time, duration, velocity })
            }
        }
    }

    return midi.toArray()
}
