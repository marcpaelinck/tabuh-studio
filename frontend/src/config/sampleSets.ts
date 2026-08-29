// Sample sets (refactor step 4 — see CLAUDE.refactor-configuration-settings.md).
//
// A SampleSet is the swappable, ensemble-specific audio layer: which sample files (and volumes) a
// position plays, under one folder. It is the seam that will let several ensembles have their own
// samples for the same orchestra. Playback goes through `resolveSampleSet()` rather than reading the
// position config directly, so alternative sets — chosen session ?? user ?? group ?? default — can
// plug in later.
//
// For now there is a single default set, generated from the current `positionConfigs` values so
// behaviour is unchanged. (Authoring explicit per-symbol files, removing `sampletemplate`/`volume`
// from the position, and the selection UI are the remaining step-4 work.)

import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Position } from '@tabuhstudio/shared/types/position'
import { SOUNDS_FOLDER } from './config'

export interface SampleSetEntry {
    /** Sample filename pattern; `{note}` is replaced by the note code. */
    sampletemplate: string
    /** Playback volume for this position, in decibels. */
    volume: number
}

export interface SampleSet {
    id: string
    name: string
    /** Base folder (URL prefix) the set's sample files live under. */
    folder: string
    entries: Partial<Record<Position, SampleSetEntry>>
}

// The current samples, taken from positionConfigs — the default for every orchestra for now.
const defaultEntries = Object.fromEntries(
    (Object.keys(positionConfigs) as Position[]).map((p) => [
        p,
        { sampletemplate: positionConfigs[p].sampletemplate, volume: positionConfigs[p].volume }
    ])
) as Partial<Record<Position, SampleSetEntry>>

export const defaultSampleSet: SampleSet = {
    id: 'default',
    name: 'Default',
    folder: SOUNDS_FOLDER,
    entries: defaultEntries
}

/**
 * The sample set to use for playback. Only the default exists today; when alternative sets are added,
 * the selection (session ?? user ?? group ?? orchestra default) resolves here.
 */
export function resolveSampleSet(): SampleSet {
    return defaultSampleSet
}
