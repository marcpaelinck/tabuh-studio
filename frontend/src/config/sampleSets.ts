// Sample sets (refactor step 4/5 — see CLAUDE.refactor-configuration-settings.md).
//
// A SampleSet is the swappable, ensemble-specific audio layer for one orchestra: the sample files (per
// position) and volumes (per instrument) under one folder. Since the folder reorganization each
// orchestra has its own set under `sounds/<ORCHESTRA>/<set>/`, and playback resolves the set from the
// position's orchestra (positions are now orchestra-unique).
//
// Shape:
//   - `volume` is ONE setting per instrument.
//   - `files` is keyed by POSITION (a position's shorthand code → filename within `folder`).
//
// Each orchestra's single default set is generated from a compact per-position {volume, template} spec
// (the audio data that previously lived on `positionConfigs`); `{note}` expands to each shorthand code.

import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Instrument, Orchestra, Position } from '@tabuhstudio/shared/types/position'
import { orchestraPositions } from '@tabuhstudio/shared/utils/position'
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

type Spec = { volume: number; template: string }

// prettier-ignore
const GK_SPECS: Partial<Record<Position, Spec>> = {
    GK_GONGS:          { volume: -10, template: 'GK_GONGS_{note}.mp3' },
    KEMPLI:            { volume: -15, template: 'GK_KEMPLI_{note}.mp3' },
    CENGCENG:          { volume: -15, template: 'GK_CENGCENG_{note}.mp3' },
    GK_KENDANG:        { volume: -15, template: 'GK_KENDANG_{note}.wav' },
    GK_KENDANG_WADON:  { volume: -15, template: 'GK_KENDANG_{note}.wav' },
    GK_KENDANG_LANANG: { volume: -15, template: 'GK_KENDANG_{note}.wav' },
    JEGOGAN:           { volume: -15, template: 'GK_JEGOGAN_{note}.mp3' },
    CALUNG:            { volume: -15, template: 'GK_CALUNG_{note}.mp3' },
    PENYACAH:          { volume: -20, template: 'GK_PENYACAH_{note}.mp3' },
    KANTILAN_POLOS:    { volume: -15, template: 'GK_KANTILAN_{note}.mp3' },
    KANTILAN_SANGSIH:  { volume: -15, template: 'GK_KANTILAN_{note}.mp3' },
    PEMADE_POLOS:      { volume: -15, template: 'GK_PEMADE_{note}.mp3' },
    PEMADE_SANGSIH:    { volume: -15, template: 'GK_PEMADE_{note}.mp3' },
    UGAL:              { volume: -15, template: 'GK_UGAL_{note}.mp3' },
    TROMPONG:          { volume: -15, template: 'GK_UGAL_{note}.mp3' },
    GENDER_RAMBAT:     { volume: -15, template: 'GK_GENDERRAMBAT_{note}.mp3' },
    REYONG_1:          { volume: -15, template: 'GK_REYONG_{note}.mp3' },
    REYONG_2:          { volume: -15, template: 'GK_REYONG_{note}.mp3' },
    REYONG_3:          { volume: -15, template: 'GK_REYONG_{note}.mp3' },
    REYONG_4:          { volume: -15, template: 'GK_REYONG_{note}.mp3' }
}

// prettier-ignore
const BAL_SPECS: Partial<Record<Position, Spec>> = {
    BAL_GONGS:          { volume: -10, template: 'BAL_GONGS_{note}.mp3' },
    BAL_KENDANG:        { volume: -15, template: 'BAL_KENDANG_{note}.wav' },
    BAL_KENDANG_WADON:  { volume: -15, template: 'BAL_KENDANG_{note}.wav' },
    BAL_KENDANG_LANANG: { volume: -15, template: 'BAL_KENDANG_{note}.wav' },
    BAL_CENGCENG_P:     { volume: -15, template: 'BAL_CENGCENG_P_{note}.mp3' },
    BAL_CENGCENG_S:     { volume: -15, template: 'BAL_CENGCENG_S_{note}.mp3' },
    REYONGB_1:          { volume: -15, template: 'BAL_REYONGB_{note}.mp3' },
    REYONGB_2:          { volume: -15, template: 'BAL_REYONGB_{note}.mp3' },
    TAWATAWA:           { volume: -15, template: 'BAL_TAWATAWA_{note}.mp3' },
    PONGGANG:           { volume: -15, template: 'BAL_PONGGANG_{note}.mp3' }
}

// Semar Pagulingan — all instruments at -15 (samples are balanced per instrument by the provider).
// prettier-ignore
const SP_SPECS: Partial<Record<Position, Spec>> = {
    SP_PEMADE_POLOS:    { volume: -20, template: 'SP_PEMADE_{note}.mp3' },
    SP_PEMADE_SANGSIH:  { volume: -20, template: 'SP_PEMADE_{note}.mp3' },
    SP_KANTILAN_POLOS:  { volume: -20, template: 'SP_KANTILAN_{note}.mp3' },
    SP_KANTILAN_SANGSIH:{ volume: -20, template: 'SP_KANTILAN_{note}.mp3' },
    SP_CALUNG:          { volume: -15, template: 'SP_CALUNG_{note}.mp3' },
    SP_JEGOGAN:         { volume: -15, template: 'SP_JEGOGAN_{note}.mp3' },
    SP_TROMPONG:        { volume: -15, template: 'SP_TROMPONG_{note}.mp3' },
    SP_GENDER:          { volume: -15, template: 'SP_GENDER_{note}.mp3' },
    SP_SULING:          { volume: -15, template: 'SP_SULING_{note}.mp3' },
    SP_GONGS:           { volume: -15, template: 'SP_GONGS_{note}.mp3' },
    SP_KEMPLI:          { volume: -15, template: 'SP_KEMPLI_{note}.mp3' },
    SP_KENDANG:         { volume: -15, template: 'SP_KENDANG_{note}.mp3' },
    SP_KENDANG_WADON:   { volume: -15, template: 'SP_KENDANG_{note}.mp3' },
    SP_KENDANG_LANANG:  { volume: -15, template: 'SP_KENDANG_{note}.mp3' },
    SP_CENGCENG:        { volume: -15, template: 'SP_CENGCENG_{note}.mp3' }
}

// The shorthand codes a position can produce = the unique note codes in its `symbolToNoteNames` values.
const positionCodes = (p: Position): string[] => [
    ...new Set(Object.values(positionConfigs[p].symbolToNoteNames).flat())
]

function buildSet(id: string, name: string, folder: string, specs: Partial<Record<Position, Spec>>): SampleSet {
    const positions = Object.keys(specs) as Position[]
    const files = Object.fromEntries(
        positions.map((p) => {
            const { template } = specs[p]!
            return [p, Object.fromEntries(positionCodes(p).map((code) => [code, template.replace('{note}', code)]))]
        })
    ) as Partial<Record<Position, Record<string, string>>>
    // One volume per instrument, taken from any of its positions (uniform within an orchestra).
    const volume: Partial<Record<Instrument, number>> = {}
    for (const p of positions) {
        const instrument = positionConfigs[p].instrument
        if (volume[instrument] === undefined) volume[instrument] = specs[p]!.volume
    }
    return { id, name, folder, volume, files }
}

const sets: Record<Orchestra, SampleSet> = {
    GONG_KEBYAR: buildSet('gk-default', 'Default', `${SOUNDS_FOLDER}GONG_KEBYAR/default/`, GK_SPECS),
    BALEGANJUR: buildSet('bal-default', 'Default', `${SOUNDS_FOLDER}BALEGANJUR/default/`, BAL_SPECS),
    SEMAR_PAGULINGAN: buildSet('sp-default', 'Default', `${SOUNDS_FOLDER}SEMAR_PAGULINGAN/default/`, SP_SPECS)
}

// Reverse map: position → its orchestra (positions are orchestra-unique).
const positionOrchestra: Partial<Record<Position, Orchestra>> = {}
for (const orchestra of Object.keys(sets) as Orchestra[])
    for (const p of orchestraPositions(orchestra)) positionOrchestra[p] = orchestra

/** The sample set for an orchestra. (Only one default set per orchestra today.) */
export function resolveSampleSet(orchestra: Orchestra): SampleSet {
    return sets[orchestra]
}

/** The sample set that owns a position (resolved via the position's orchestra). */
export function sampleSetForPosition(position: Position): SampleSet | undefined {
    const orchestra = positionOrchestra[position]
    return orchestra ? sets[orchestra] : undefined
}
