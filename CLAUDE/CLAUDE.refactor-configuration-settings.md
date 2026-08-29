# Refactor Configuration Settings

## Context
I am planning to store most of the configuration values in the database and make them editable by an authorized user. But before we do that I need to refactor some configuration settings. My vision about the intended functionality of the application has shifted during the development and this has implications for the way some configuration settings are structured. I need your help and advice for the correct approach.

## Requirements
- It should be possible to maintain several sample sets for the same orchestra type and to select the required sample set for playback. In the physical world this corresponds with having samples of different music ensembles who play the same type of instruments. An ensemble should be able to select the samples of their own instruments.
- It should be possible for different orchestra types to use the same instrument and position names. For instance, the **gong kebyar** and **semar pagulingan** orchestras both have PEMADE instruments and PEMADE_POLOS and PEMADE_SANGSIH positions. 
- Each combination `orchestra + position` uniquely defines the set of notes that can be played by that position. For instance the **gong kebyar** PEMADE has 10 keys that correspond with the note symbols 'o,', 'e,', 'u,', 'a,', 'i', 'o',  'e',  'u',  'a',  'i<'. The **semar pagulingan** PEMADE has 7 keys: 'i', 'o',  'e',  'r', 'u',  'a', 's'. 'r' and 's'. 'r' and 's' are additional symbols that should be added to the alphabet's definition.
- Each set of samples should have its own subfolder.

## Current Issues
- `positionConfigs` contains different types of attributes:
	- `name`, `instrument, `type` are logical properties of the `Position` type.
	- `volume`, and `sampletemplate` are settings for a specific sample.
	- `svg_file` and `symbolToNoteNames` are animation settings.
- The `symbolToNoteNames` object is used (at least) in three different ways: 
	- its keys are used to determine the valid symbols for each position. 
	- The object's values correspond with keys of constant `noteConfigs`, which is used to schedule animation events.
	- The object's values are also used by `useInstruments` to resolve the sample file name from the `sampletemplate` value.
- The `volume`, and `sampletemplate` attributes of `positionConfigs` only allow to assign one sample to each position.
- `symbolToNoteNames` maps each symbol to a **list** of notes names. The reason for this is that it enables to link a single symbol with multiple sample files that should be played simultaneously. This is currently only the case for the `b` (BYONG) symbol of the REYONG positions.

These issues make the application difficult to understand and to maintain. 

## Scope
All configuration settings in `frontend/src/config/config.ts` and in `shared/config/*` should be considered, except for the `STYLE & THEME` section in `frontend/src/config/config.ts`.


## Request for Advice
Please advise how to refactor the configuration settings so that they could be migrated to the database in the future. The refactoring should also result in a cleaner structure of the application.

Note: related to the last issue (the multiple mapping of symbols to sample files), I tentatively created a new module `toneManager.ts` that contains a function `toSimultaneousNotes`. This function returns the mapping that is currently made explicit in `symbolToNoteNames`.

---

# Design & Plan (agreed)

## Decisions

1. **Positions are orchestra-specific (no reuse across orchestras).**
   - A `Position` belongs to exactly one orchestra; the same instrument in a different orchestra gets
     its own distinct positions (e.g. `GONG_KEBYAR` `PEMADE_POLOS` vs a separate `SEMAR_PAGULINGAN`
     equivalent). Requirement 2 (reuse of names) is dropped in favour of this.
   - **Invariant:** every position id is globally unique and belongs to exactly one orchestra. Encode
     the orchestra in the id so it is self-documenting and collision-proof (convention for *new*
     orchestras: prefix with the orchestra, e.g. `SP_PEMADE_POLOS`). Renaming existing `GONG_KEBYAR`
     positions to a `GK_` prefix is optional and can be deferred.
   - Consequence: instruments effectively become orchestra-specific too (or `instrumentConfigs` is
     keyed by orchestra), and orchestra-scoped rule sets (`positionGroups`, `allowedPositionGroups`,
     casting / kempyung / aggregation rules) are defined per orchestra.
   - Benefit: the `(orchestra, position)` composite key collapses to just `position`, so most existing
     single-key config shapes (`positionConfigs[p]`, group tables, casting rules) keep their shape —
     this is the lower-churn choice.

2. **Sample-set selection scope: group < user < session (increasing priority).**
   - Effective sample set for an orchestra is resolved as:
     `session ?? user ?? group ?? orchestra.default`.
   - Per-group and per-user selections persist (group config; user preferences blob); the per-session
     selection is transient (a store value, not persisted).

## Target architecture

Split the current `positionConfigs` (which conflates logical / audio / rendering) into separate,
independently-keyed slices. Model the playback chain explicitly as **symbol → `NoteObject`(s) → sample**,
with `NoteObject` as the *single* note representation — the `Note` type (`frontend/typing/score.ts`)
is discarded.

### 1. Logical model (orchestra-scoped, stable)
```
type OrchestraId  = string   // 'GONG_KEBYAR', 'SEMAR_PAGULINGAN', …
type InstrumentId = string   // orchestra-scoped
type PositionId   = string   // globally unique, orchestra encoded

interface PositionConfig {
    id: PositionId
    orchestra: OrchestraId
    instrument: InstrumentId
    name: string             // display name
    seq: number              // system-default staff order within the orchestra
}
```
`orchestraConfigs` keeps the orchestra → instruments (ordered) membership and `beatPosition`.
`type` (`'percussion' | 'daun' | 'chimes'`) is **removed** from the position — it only existed to key
`noteConfigs`; the mallet-vs-knob distinction it encoded becomes the *strike location* (slice 4).

### 2. `NoteObject` replaces `Note`; the alphabet carries `tone`
- Drop `Note` (`{tone, octave, stroke, muting}`). `NoteObject` is the single representation; it already
  parses `pitch`, `octave` (`octaveNumber`: −1/0/1), grace-note prefix, and modifier.
- Add **`tone: ToneType`** to `AlphabetItem`, keyed by pitch char — genuinely 1-to-1 and
  orchestra-independent (`i`→DING, `o`→DONG, `G`→GIR, `0`→CUNG, …; new `r`/`s` get their tones).
- **Muting is purely modifier-derived** for *all* positions: none→OPEN, `/`→ABBREVIATED, `?`→MUTED.
  (This relies on the KEMPLI default-stroke decision below — its bare `x` is defined as OPEN, so it
  follows the "no modifier → OPEN" rule and no position-specific muting override is needed.)
  `NoteObject` therefore exposes derived accessors `tone` (via alphabet), `octaveNumber` (already),
  and `muting` (from the modifier). No shorthand codes, no `noteConfigs`.
- NB naming: `NoteObject.stroke` already exists and means *articulation* (damped/muted/tremolo/rake…,
  from the modifier). Do **not** reuse that name for the physical strike location (slice 4).

### 3. Voicing (replaces `symbolToNoteNames` + `toneManager.combinedTones`)
The playable symbols of a position and the note(s) each triggers, keyed by `PositionId`:
```
type Voicing = Record<PositionId, Record<NoteSymbol, NoteObject[]>>
```
- Valid symbols for a position = the keys. For nearly every symbol the value is `[self]`; only
  BYONG-like symbols list several `NoteObject`s (and the list differs per reyong position). It is
  per-position for exactly this reason. `toSimultaneousNotes` becomes a lookup into this table.

### 4. Strike-location table (animation only)
```
// Physical strike location for the animation (KNOB / RIM / mallet=null). DISTINCT from
// NoteObject.stroke (the articulation modifier).
type StrikeLocation = Record<PositionId, Record<NoteSymbol, StrokeLocation>>
```
- Keyed by (Position, symbol) because the `X` prefix (reyong rim) — not the pitch — decides RIM vs
  KNOB. Consumed only by the animation.

### 5. Sample sets (independent, swappable; the only ensemble-specific piece)
```
interface SampleSet {
    id: string
    orchestra: OrchestraId
    name: string
    folder: string                              // subfolder under SOUNDS_FOLDER
    entries: Record<PositionId, {
        volume: number
        files: Record<NoteSymbol, string>       // canonical symbol → filename within `folder`
    }>
}
```
- `sampletemplate`, `volume` (on the position), and the `DING1…` codes are all removed. The map is
  keyed by the **canonical symbol**, which handles muting/abbreviation variants for free (`i`, `i/`,
  `i?` are already distinct symbols → distinct files). BYONG is expanded to its atomic symbols by the
  voicing first, then each atom's file is looked up here.
- Effective set: `session ?? user ?? group ?? orchestra.default` (per the Decisions).

### 6. Rendering
`svg_file` (per position or instrument) and the highlight palette (`animationConfig`) stay on their
own; unchanged in structure.

### Pipeline
- Audio: `symbol →(voicing[pos])→ NoteObject[] →(sampleSet[pos].files)→ files`.
- Animation / MIDI: `symbol → alphabet.tone + NoteObject.octaveNumber + modifier-derived muting +
  strikeLocation[pos]`.

## KEMPLI default stroke (resolved — no migration)

For muting to be purely modifier-derived with no exception, the KEMPLI default stroke `x` is defined
as an **OPEN** note: `symbolToNoteNames: { x: ['X'] }`, where note `X` has `muting: OPEN`. This keeps
`x` — the natural, convenient beat notation — as the default stroke and simply follows the general
rule "no modifier → OPEN".

The muting value of the kempli stroke only affects the *animation*, and the kempli is not animated
(no `svg_file`) and is not expected to be, so OPEN vs MUTED is immaterial here. Consequently **no
`x?` split and no score migration are needed** — the earlier idea (bare `x` = muted, `x?` = OPEN,
plus a data migration) was rejected precisely to avoid rewriting existing scores. The sample file was
renamed to `GK_KEMPLI_X` accordingly.

Open/muted kempli strokes for the legong style (where the kempli follows the kendang, usually in the
pengawak) will be added later as dedicated kendang-like symbols with their own samples.

## The accessor seam (do this first)

Introduce a thin config-access layer and migrate the ~15 direct `positionConfigs[p].*` consumers onto
it, so the data *source* can later change (constants → DB) without touching consumers:
```
getOrchestraPositions(orchestra): PositionId[]           // system-default order
getPositionConfig(position): PositionConfig
getPositionName(position): string
getValidSymbols(position): NoteSymbol[]                  // = keys of the voicing
getVoicing(position, symbol): NoteObject[]               // multi-note expansion ([self] for most)
getStrikeLocation(position, symbol): StrokeLocation
getSvgFile(position): string | undefined
resolveSampleSet(orchestra, ctx): sampleSetId            // session ?? user ?? group ?? default
getSampleFile(sampleSetId, position, symbol): { file: string; volume: number }
```
Retire from consumers: `positionConfigs[p].symbolToNoteNames` (→ voicing / valid symbols),
`.sampletemplate` / `.volume` (→ sample set), `noteConfigs` (→ `alphabet.tone` + `NoteObject`
derivations), `toneManager.combinedTones` (→ voicing), `NoteObject.hasSample()` (→ `getValidSymbols`).
Consumers to migrate include: `useInstruments` (`lookup`, `createSamplers`), `timelineBuilder`,
`pitchMap`, `midiGenerator`, `sanity-functions`, `Animation` (svg), `compactGroupLabel`,
`SystemNotationViewer`, `ExecutionItemForm`, `PositionOrderEditor`, `NoteObject`.

## DB-migration mapping (future)

Shape the new constants as normalized records keyed by id / composite key, mirroring future tables:
`orchestras`, `instruments`, `positions`, `position_voicings(position_id, symbol, seq)` (+
`voicing_notes(voicing_id, note_symbol, seq)` for the multi-note expansion), `alphabet_symbols`
(now incl. `tone`), `strike_locations(position_id, symbol, location)`, `sample_sets`,
`sample_set_entries(sample_set_id, position_id, volume)` (+ `sample_files(entry_id, symbol, filename)`),
`group_sample_set(group_id, orchestra_id, sample_set_id)`, and a `sampleSetByOrchestra` map in the
user-preferences blob. Swapping a slice from constants to a DB-backed loader then stays behind the
unchanged accessors.

## Incremental plan (each step shippable + test-guarded)

1. **Accessor seam** over the *current* config (no shape change); migrate all consumers.
2. **KEMPLI default stroke** + add the `tone` field on alphabet items. *(Done: KEMPLI stays
   `symbolToNoteNames: { x: ['X'] }` with note `X` = OPEN, so `x` remains the beat notation and no
   `x?` split or score migration is needed — see "KEMPLI default stroke" above; sample renamed to
   `GK_KEMPLI_X`. `tone` added to `AlphabetItem` and populated on the atomic tone symbols. The lazy
   on-load migration that was briefly added is no longer needed and has been removed.)*
   - **Deferred:** the new alphabet symbols `r`, `s` move to step 5 (they belong to Semar Pagulingan,
     which introduces their positions, tones, and samples; adding them earlier would be orphaned).
3. **Voicing** (`symbol → NoteObject[]`) + strike-location; retire `noteConfigs`. *(Done:
   `playback/notePlayback.ts` derives `Note` (tone/octave/muting/strike) from a symbol's `NoteObject`
   — tone/octave/strike via mappings + `alphabet`, muting from the modifier — and expands BYONG / the
   reyong `t` stroke via `combinedVoicings`, with `irregularNotes` for the reyong rim `x`.
   `timelineBuilder.samplerAction2AnimationNotes` now uses `voicing`/`deriveNote`, and **`noteConfigs`
   is deleted**. A one-off harness (`verifyDeriveNote.ts`) compared the derivation against `noteConfigs`
   for every coded symbol and confirmed equivalence — the only diffs were **pre-existing bugs in the
   old `noteConfigs` path** (KENDANG/JEGOGAN/CALUNG `/` and `?` variants had lost their
   ABBREVIATED/MUTED muting); the derived values fix those, so playback muting is now correct there.
   Harness has been removed.)* `symbolToNoteNames` stays as the sample/MIDI code source until step 4;
   the `Note` type is kept as the derived animation payload for now.
4. **SampleSet** as a first-class concept (start with one default set) + the group<user<session
   resolution + a playback selection point; move `files` / `volume` off the position and drop
   `sampletemplate`. *(Foundation done: `config/sampleSets.ts` defines the `SampleSet` type and a
   default set (generated from `positionConfigs`, so behaviour is unchanged) behind `resolveSampleSet()`;
   `useInstruments` and `sanity-functions` now source folder/volume/template from the resolved set,
   and the `getSampleTemplate`/`getPositionVolume` accessors are removed. **Remaining:** author explicit
   per-symbol files and physically remove `sampletemplate`/`volume` from `positionConfigs`; add real
   alternative sets; implement the session store + user-pref + group config that `resolveSampleSet`
   will consult (session ?? user ?? group ?? default); add the selection UI; rebuild samplers when the
   selection changes. Also note `symbolToNoteNames` still serves the sample codes + MIDI (`pitchMap`) +
   valid-symbols, so it is not yet fully retired.)*
5. Add **`SEMAR_PAGULINGAN`** as the proof case: orchestra-specific positions (with the id prefix),
   its voicing (7 keys incl. `r`/`s`), and a sample set.
6. Back each slice with the DB behind the unchanged accessors; add editing UI for authorized users.

## Out of scope
The `STYLE & THEME` section of `frontend/src/config/config.ts`.
