// MIDI export.
//
// `generateMidiFile` encodes a resolved playback `TimeLine` as a Standard MIDI File, one
// track per instrument position. It only *translates* the timeline — all the music logic
// (execution flow, tempo, dynamics, muting) is already baked into the sampler actions — so
// the exported file matches what the app plays.
//
// Phase 2:
//  - Tempo map: note positions and tempo events are placed in ticks (musical time), and a
//    tempo map is written from `timeline.tempoactions`. A DAW's bar grid therefore follows
//    the real tempo changes (incl. gradual ones), and the audio timing stays correct.
//  - General MIDI: each track gets a GM program (and its own channel) chosen per instrument
//    type, so a GM synth plays a plausible mallet/percussion sound out of the box.
//  - Muted notes are still emitted as short notes at their muted pitch (the muted-note
//    split to a separate track/samples is deferred).
//
// Pitches are the app's 12-TET nominal note names (not true pelog/slendro tuning); the
// accompanying note-map PDF documents the pitch → Tabuh-note mapping.

import type { Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Instrument } from '@tabuhstudio/shared/types/basetypes'
import { Midi } from '@tonejs/midi'
import { baseNoteValue } from '../../config/config'
import type { PlaybackSamplerAction, TimeLine } from '../../typing/playback'
import { TO2n } from '../../utils/timeunits'
import { symbolMidis } from './pitchMap'

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

// General MIDI program (0-based) per *instrument* — a position uniquely identifies an
// instrument (`positionConfigs[position].instrument`), and each instrument gets its own
// program so a DAW plays every instrument on a distinct voice. GM has no gamelan sounds, so
// these are best-effort idiophone/mallet approximations grouped by register; edit freely.
const GM_PROGRAM_BY_INSTRUMENT: Record<Instrument, number> = {
    // Keyed bronze metallophones (bright → dark by register).
    KANTILAN: 8, // Celesta
    PEMADE: 9, // Glockenspiel
    GENDER_RAMBAT: 10, // Music Box
    UGAL: 11, // Vibraphone
    CALUNG: 12, // Marimba
    PENYACAH: 13, // Xylophone
    REYONG: 14, // Tubular Bells (gong-chime)
    JEGOGAN: 15, // Dulcimer (lowest metallophone)
    // Gong-chimes / tuned idiophones.
    TROMPONG: 112, // Tinkle Bell
    REYONGB: 113, // Agogo
    PONGGANG: 114, // Steel Drums
    // Hanging gongs, timekeepers, drums and cymbals.
    KEMPLI: 115, // Woodblock
    GONGS: 116, // Taiko Drum
    KENDANG_WADON: 117, // Melodic Tom (low drum)
    KENDANG_LANANG: 118, // Synth Drum (high drum)
    CENGCENG: 119, // Reverse Cymbal
    TAWATAWA: 47, // Timpani
    CENGCENG_KOPYAK: 126 // Applause (cymbal wash)
}

/** The 0-based General-MIDI program used for a position's track (via its instrument). */
export function gmProgram(position: Position): number {
    const instrument = positionConfigs[position]?.instrument
    return (instrument !== undefined ? GM_PROGRAM_BY_INSTRUMENT[instrument] : undefined) ?? 0
}

// One base note (1 BaseNote unit) spans this many MIDI ticks. baseNoteValue = 16 (a 1/16
// note) and PPQ = 480, so a base note is a 1/16 note = 480/4 = 120 ticks.
const PPQ = 480
const ticksPerBaseNote = (PPQ * 4) / baseNoteValue

const toTicks = (baseNotes: number): number => Math.round(baseNotes * ticksPerBaseNote)

/** Groups the timeline's sampler actions by position, preserving first-seen order. */
function actionsByPosition(timeline: TimeLine): Map<Position, PlaybackSamplerAction[]> {
    const byPosition = new Map<Position, PlaybackSamplerAction[]>()
    for (const action of timeline.sampleractions ?? []) {
        if (action.params.note.isMutingSilence) continue // rests carry no note
        const position = action.params.position
        const list = byPosition.get(position)
        if (list) list.push(action)
        else byPosition.set(position, [action])
    }
    return byPosition
}

/** The positions that become tracks in the exported MIDI, in track order. */
export function midiTrackPositions(timeline: TimeLine): Position[] {
    return [...actionsByPosition(timeline).keys()]
}

/** Encodes a resolved playback timeline as a Standard MIDI File (one track per position). */
export function generateMidiFile(timeline: TimeLine): Uint8Array {
    const midi = new Midi()

    // TEMPO MAP — one event per tempo change, positioned in ticks. Consecutive equal BPMs
    // are collapsed, and an event at tick 0 is guaranteed so the map is well-formed.
    const tempos: { ticks: number; bpm: number }[] = []
    for (const action of timeline.tempoactions ?? []) {
        const ticks = toTicks(TO2n(action.time))
        const bpm = action.params.bpm
        const last = tempos[tempos.length - 1]
        if (last && last.bpm === bpm) continue
        if (last && last.ticks === ticks) last.bpm = bpm
        else tempos.push({ ticks, bpm })
    }
    if (tempos.length && tempos[0].ticks > 0) tempos.unshift({ ticks: 0, bpm: tempos[0].bpm })
    if (tempos.length) {
        midi.header.tempos = tempos
        midi.header.update()
    }

    // TRACKS — one per position; notes placed in ticks so they align with the tempo map.
    let channel = 0
    for (const [position, actions] of actionsByPosition(timeline)) {
        const track = midi.addTrack()
        track.name = positionConfigs[position]?.name ?? position
        track.instrument.number = gmProgram(position)
        // Give each track its own channel, skipping 9 (the GM percussion channel), wrapping
        // if there are more than 15 melodic tracks.
        track.channel = channel % 16
        channel += channel % 16 === 8 ? 2 : 1 // jump over channel 9

        for (const action of actions) {
            const ticks = toTicks(TO2n(action.time))
            const durationTicks = Math.max(1, toTicks(TO2n(action.params.duration)))
            const velocity = clamp01(action.params.velocity)
            // A symbol can map to several pitches (octave doubling / chord keys) → one note each.
            for (const midiNote of symbolMidis(position, action.params.note.canonicalSymbol)) {
                track.addNote({ midi: midiNote, ticks, durationTicks, velocity })
            }
        }
    }

    return midi.toArray()
}
