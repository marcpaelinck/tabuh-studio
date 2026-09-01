// Sample sets (refactor step 4 — see CLAUDE.refactor-configuration-settings.md).
//
// A SampleSet is the swappable, ensemble-specific audio layer: the sample files (per position) and
// volumes (per instrument) under one folder. It is the seam that will let several ensembles have their
// own samples for the same orchestra. Playback goes through `resolveSampleSet()` rather than reading
// the position config directly, so alternative sets — chosen session ?? user ?? group ?? default — can
// plug in later.
//
// Shape (agreed normalized model, see the CLAUDE doc):
//   - `volume` is ONE setting per instrument (balancing individual samples is the sample provider's job).
//   - `files` is keyed by POSITION, not instrument: CENGCENG_P and CENGCENG_S are the same instrument
//     yet have distinct samples for the SAME shorthand code (`X_OPEN`/`X_MUTED`), so the position is
//     part of the key. (The step-5/6 DB model captures this as a nullable `position` on the sample row.)
//
// The single default set below is generated from a compact per-position {volume, template} spec — the
// data that previously lived on `positionConfigs` — so behaviour is unchanged. Alternative sets may
// instead provide explicit `files` maps directly.

import { instrumentConfigs, positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Instrument, Position } from '@tabuhstudio/shared/types/position'
import { SOUNDS_FOLDER } from './config'

export interface SampleSet {
    id: string
    name: string
    /** Base folder (URL prefix) the set's sample files live under. */
    folder: string
    /** One playback volume (in decibels) per instrument. */
    volume: Partial<Record<Instrument, number>>
    /** Per position: shorthand code → sample filename within `folder`. */
    files: Partial<Record<Position, Record<string, string>>>
}

// Default set definition: per-position volume + filename template. `{note}` is replaced by the shorthand
// code. Volume is uniform per instrument here; the SampleSet exposes it per instrument (below).
// prettier-ignore
const defaultSpecs: Record<Position, { volume: number; template: string }> = {
    GONGS:          { volume: -10, template: 'GK_GONGS_{note}.mp3' },
    KEMPLI:         { volume: -15, template: 'GK_KEMPLI_{note}.mp3' },
    CENGCENG:       { volume: -15, template: 'GK_CENGCENG_{note}.mp3' },
    KENDANG:        { volume: -15, template: 'GK_KENDANG_{note}.wav' },
    KENDANG_WADON:  { volume: -15, template: 'GK_KENDANG_{note}.wav' },
    KENDANG_LANANG: { volume: -15, template: 'GK_KENDANG_{note}.wav' },
    JEGOGAN:        { volume: -15, template: 'GK_JEGOGAN_{note}.mp3' },
    CALUNG:         { volume: -15, template: 'GK_CALUNG_{note}.mp3' },
    PENYACAH:       { volume: -20, template: 'GK_PENYACAH_{note}.mp3' },
    KANTILAN_POLOS:   { volume: -15, template: 'GK_KANTILAN_{note}.mp3' },
    KANTILAN_SANGSIH: { volume: -15, template: 'GK_KANTILAN_{note}.mp3' },
    PEMADE_POLOS:     { volume: -15, template: 'GK_PEMADE_{note}.mp3' },
    PEMADE_SANGSIH:   { volume: -15, template: 'GK_PEMADE_{note}.mp3' },
    UGAL:           { volume: -15, template: 'GK_UGAL_{note}.mp3' },
    TROMPONG:       { volume: -15, template: 'GK_UGAL_{note}.mp3' },
    GENDER_RAMBAT:  { volume: -15, template: 'GK_GENDERRAMBAT_{note}.mp3' },
    REYONG_1:       { volume: -15, template: 'GK_REYONG_{note}.mp3' },
    REYONG_2:       { volume: -15, template: 'GK_REYONG_{note}.mp3' },
    REYONG_3:       { volume: -15, template: 'GK_REYONG_{note}.mp3' },
    REYONG_4:       { volume: -15, template: 'GK_REYONG_{note}.mp3' },
    CENGCENG_P:     { volume: -15, template: 'BAL_CENGCENG_P_{note}.mp3' },
    CENGCENG_S:     { volume: -15, template: 'BAL_CENGCENG_S_{note}.mp3' },
    REYONGB_1:      { volume: -15, template: 'BAL_REYONGB_{note}.mp3' },
    REYONGB_2:      { volume: -15, template: 'BAL_REYONGB_{note}.mp3' },
    TAWATAWA:       { volume: -15, template: 'BAL_TAWATAWA_{note}.mp3' },
    PONGGANG:       { volume: -15, template: 'BAL_PONGGANG_{note}.mp3' }
}

// The shorthand codes a position can produce = the unique note codes in its `symbolToNoteNames` values.
const positionCodes = (p: Position): string[] => [...new Set(Object.values(positionConfigs[p].symbolToNoteNames).flat())]

// files: expand each position's template over its shorthand codes.
const defaultFiles = Object.fromEntries(
    (Object.keys(defaultSpecs) as Position[]).map((p) => {
        const { template } = defaultSpecs[p]
        return [p, Object.fromEntries(positionCodes(p).map((code) => [code, template.replace('{note}', code)]))]
    })
) as Partial<Record<Position, Record<string, string>>>

// volume: one per instrument, taken from any of its positions (uniform in the default set).
const defaultVolume = Object.fromEntries(
    (Object.keys(instrumentConfigs) as Instrument[]).map((instrument) => [
        instrument,
        defaultSpecs[instrumentConfigs[instrument].positions[0]].volume
    ])
) as Partial<Record<Instrument, number>>

export const defaultSampleSet: SampleSet = {
    id: 'default',
    name: 'Default',
    folder: SOUNDS_FOLDER,
    volume: defaultVolume,
    files: defaultFiles
}

/**
 * The sample set to use for playback. Only the default exists today; when alternative sets are added,
 * the selection (session ?? user ?? group ?? orchestra default) resolves here.
 */
export function resolveSampleSet(): SampleSet {
    return defaultSampleSet
}
