# Dual Editor — Requirements for a new feature

This document discusses the requirement for an editor with two different views on the same `Score`. 

## Context

I have conceived a way to reduce the amount of typing by introducing two types of shortcuts:
1. Aggregation of positions: the possibility to write notation that applies to multiple positions.
2. Shorthand symbols: symbols that stand for a sequence of symbols.

I have implemented these in a text file format which I call the Tabuh format. You can find an example of an entire Tabuh notation file in file `frontend/CLAUDE/Tabuh notation example.tsv` and a screenshot of the same file in `frontend/CLAUDE/Tabuh notation example.png`, displaying the file with the BaliMusic font.

### Position aggregation

If there is no ambiguity, the Tabuh notation format allows the notation for multiple positions to be aggregated in one notation line. In that case the label at the start of the line stands for a group of positions. In the tabuh notation example file, the abbreviation `ga/ugal` stands for 'gangsa and ugal', where 'ugal' stands for position `UGAL` and 'gangsa' stands for positions `PEMADE_POLOS`, `PEMADE_SANGSIH`, `KANTILAN_POLOS` and `KANTILAN_SANGSIH`. Label `reyong13` stands for the positions `REYONG_1` and `REYONG_3`. In general, most of the `melodic` instruments can be combined in any possible way. 

### Shorthand notation

Some symbol modifiers can be used to create shorthand symbols. Currently only the modifier `n` is being used in this context. `n` stands for `norot` which is a specific note pattern in Balinese music. I added an extract of a notation file `frontend/CLAUDE/Norot example.tsv` and corresponding screenshot `frontend/CLAUDE/Norot example.png`. The symbols `in` and `un` in this example stand for a fixed pattern of four symbols which can be different for each position and can also differ per beat.
 
### Current implementation

The Tabuh Parser `frontend/src/scoreparsers/tabuhParser.ts` is currently the only part of the code that can handle the aggregation and shorthand notation. It uses two agents for this.
- The Casting Rules Manager `frontend/src/componentlogic/castingRulesManager.ts` takes care of expanding aggregated notation into individual notations for each position.
- The Pattern Manager `frontend/src/componentlogic/patternManager.ts` expands each shortcut symbol into a sequence of symbols ('pattern').

The Tabuh Parser returns a complete `Score` object with all shorthand symbols and aggregated notations resolved.

Next to this, the `System` type already has a `notationGroups` attribute of type `GroupedNotation`. This attribute contains the compact version of the notation. See `frontend/src/typing/score.ts`.

## Functionality of the new feature

I want the editor to enable the use of aggregated notation and the use of shorthand symbols. The concept that I have in mind is to have two views: the 'compact' view and the 'expanded' view.

- The compact view should enable to write aggregated notation and to use shorthand symbols.
- The expanded view should display the notation as it currently does: explicit notation for each position and no use of shorthand symbols.

Ideally, both views should be editable. However this introduces a certain complexity because they need to remain in sync at all times. I need your advice on how to handle this. There are a couple of problematic use cases that I can think of, but there might be more.

### Use cases for the expanded view

- Positions that are part of an aggregation group should be clearly marked as such, for instance using group numbers, colors or braces.
- Positions that are part of an aggregation group should be locked for editing. However it should be possible to enable ('unlock') editing for such a position.
- If the user edits the notation of an unlocked position that is part of a group, the position should be removed from the group. This should immediately be visible.
- The use of shorthand notation should not be possible in the expanded view.

### use cases for the compact view

- The label preceding a grouped notation should be comprehensive but compact. Instead of displaying all the positions of the group at the beginning of a notation line, we could perhaps use shortcuts and display the full list of positions as a tooltip.
- It should only be possible to create 'valid' groups. I can provide a list of valid combinations.
- Positions for which the notation is not aggregated should be displayed on a separate line, perhaps as a group containing a single instrument.
- The user should be able to add an instrument to an existing group, even if that instrument already has a separate notation. In that case the application should give a warning that the notation of the individual instrument will be modified if the position is added to the group.

### use cases for both views

- Typing an invalid note (a symbol that is not allowed for the specific position of position group) should cause that note to be highlighted. My suggestion would be to use the `Lezer` parser for this. This parser is already being used by the Tabuh Parser.
- It should not be possible to save a notation to the database if it contains invalid symbols. However it should still be possible to save such a notation to file (JSON).

### specific concern

The grouped notation and expanded notation are currently stored in different places in the `System` object (`staffs` and `groupedNotation` attributes). Considering that we want to keep both views in sync, it might be a better idea to have a 'single source of truth' for both. However I don't have a good idea yet if this is possible and if so how to achieve this.

---

# Implementation Plan (agreed)

## Key architectural decision

**The compact notation is the single source of truth. The expanded notation is a derived, read-only projection** used for playback and for an on-demand "view expanded" display per system.

Rationale: the compact→expanded transform already exists and is well-defined (`castNotation` in `castingRulesManager`, `applyPatterns`/`norotPattern` in `patternManager`), but the inverse is mathematically ill-posed — casting maps one compact note to different per-position notes (many-to-one), and a norot symbol expands to a context-dependent 4-note sequence whose inverse is ambiguous. Maintaining true bidirectional sync would require a lossy, fragile un-expander. Making compact the only editable view removes that problem entirely: edits always flow compact → expanded.

Decisions taken:

- **Only the compact view is editable.** The expanded view is read-only; it is the basis for playback and lets the user see the explicit per-position result. A "view expanded" button next to each system reveals it.
- **Storage:** the DB/JSON stores the **compact groups as canonical**, plus the derived `staffs` as a cache (re-derived on load). Both live inside the score `content` JSON, so no SQL column change is needed; existing scores are migrated by re-importing from their `.tsv` source.
- **First iteration: Steps 1–3.**

## Column / measure-width alignment (policy)

All symbols that are visually aligned vertically must start playing simultaneously. It is the user's responsibility to type enough spaces after a shorthand (norot) symbol so the next symbol stays aligned. When a norot symbol expands to its sequence, the sequence **consumes the following space columns** to preserve downstream alignment; if there are too few spaces, the sequence is **cut off** accordingly (and the app can warn). The user also hears the mistake during playback — the in-editor playback is mainly acoustic feedback for experienced musicians to check the notation.

> Note: the space-consuming / cut-off behaviour is **not yet implemented** (today norot always expands to 4 notes and the parser pads beats to equal width). It is a refinement to add in the expansion module during Step 3; Step 1 deliberately preserves current behaviour.

## Data model

```ts
interface NotationGroup {
    id: string
    positions: Position[]    // 1..n; a single-position group is a "solo" line
    notation: NoteSymbol[]   // FLAT, space-padded compact symbols (measures concatenated)
}
// System gains:
//   groups?: NotationGroup[]                    // CANONICAL compact store
//   beatColWidths?: number[]                    // per-kempli-beat column widths
//   castingInstructions?: CastingInstruction[]  // system-wide casting context (AUTOKEMPYUNG=off)
//   staffs stays, but becomes a DERIVED CACHE (recomputed via expandSystem)
```

Implementation notes (as built):

- **Flat notation (like a Staff).** A group's `notation` is a single flat `NoteSymbol[]`. The parser builds it by padding each measure with spaces up to that beat's column width and concatenating, so **compact columns line up 1:1 with the expanded notation**. `System.beatColWidths` holds the per-beat column widths used to split the flat notation back into measures and to draw the grid.
- **Norot occupies its full width.** A column width counts a norot as 4 (`presume norot = 4 symbols`). The parser inline-pads each norot with its 3 trailing spaces (`flattenCompactRaw`). On expansion, the `eatSpaces` mode of `applyPatterns` lets the norot consume those 3 spaces in place (cut off + warning if too few), so the expanded output is byte-identical to the old pipeline — `expandSystem` therefore reproduces the parser staffs (validated by `test:groups`), and the Step-1 goldens are unaffected because the parser's own staff path is unchanged.
- **Two width counts.** The parser uses `compactColWidths` (norot = 4) on raw measures to allocate room; edits commit through `entryColWidths` (each entry = 1 column) because the editor's measures already contain the norot padding spaces — avoiding double-counting on round-trips.
- Casting context lives at the **system** level (`System.castingInstructions`); padding is computed across the whole system in a single pass.
- `notationGroups` and `editorGroup` are left in place (deprecated, no longer populated).
- **COPY is deferred.** The parser still produces correct staffs for COPY systems, but those systems are marked (`copyFromUuid`) and **excluded** from groups-based re-derivation on load (they keep their cached staffs). Group-level COPY is a planned follow-up.
- **Grid (compact view).** `CompactSystemEditor` draws the same background grid as the expanded notation — a gridline every column plus the kempli beats in green — using `beatColWidths` (or the uniform `kempli.frequency`). Each group is rendered as one continuous line; the controller still keeps measures internally, and the cursor is mapped to/from the flat column index.

## Steps

### Step 1 — Extract the expansion pipeline (no behaviour change)

New module `frontend/src/componentlogic/expandNotation.ts` owning the whole compact→expanded transform, currently split across `tabuhParser.castGroupedNotationToPositions` and `postProcess` steps 1–4:

- `castGroupedNotationToPositions(groups, castInstructions): ParsedStaffs`
- `expandParsedStaffs(parsedStaffs): { staffs, colWidths }` — applyPatterns → pad to colWidths → flatten
- `expandGroupedNotation(groups, castInstructions): { staffs, colWidths }` — cast + expand (the entry point the live editor will reuse)
- `deriveKempli(current, execution, colWidths, hasKempliStaff): KempliSetting`

`tabuhParser` is rewired to call these (parser and editor then run identical code). A node test pins the expanded `staffs` for fixtures.

### Step 2 — Canonical compact model + derive `staffs` + storage

Add `groups` to `System`; parser populates them (ungrouped positions become single-position groups); `expandSystem(system)` refreshes `staffs`+`kempli` from `groups`. `useScoreReader.postprocessScore` re-derives staffs on load (skipping legacy/laras scores with no groups and COPY systems); `saveScore` already strips `objNotation` and now persists groups + the staffs cache (groups hold plain strings, so nothing extra to strip). Migration: re-run `import:scores:*` for tsv-backed scores (the parser now emits groups) — no separate migration code needed; legacy DB scores without groups keep working off their cached staffs until re-imported. `config.systemKeyOrder` updated; backend Zod needs no change (the score `content` schema uses `.catchall`, so `groups` passes through).

Verification: `npm run test:groups` parses every fixture and asserts `expandSystem(fromGroups)` reproduces the parser's staffs + kempli for all non-COPY systems. `npm run test:expand` (Step 1 goldens) must also still pass since the parser's own path is unchanged.

### Step 3 — Compact view editor (the new editing surface)

`useCompactSystemEditor` (analogous to `useSystemEditor`, lines = groups), reusing `inputStateMachine`/`StaffLine`; compact label chips with full-position tooltips; on edit → `expandSystem` (debounced). The existing per-position editor becomes read-only. Implement the norot space-eating / cut-off alignment here (with cut-off warning). Group-membership editing (create/add/remove) and Lezer validation are later steps (4 and 6).

Implementation notes (as built):

- **`componentlogic/editor/useCompactSystemEditor.ts`** — controller whose lines are groups and whose cursor is `{ line, measure, index }`. Measures (kempli beats) are kept as first-class units so the expansion pipeline still gets per-beat structure; the cursor wraps across measures and lines. All state-machine ops run with an `undefined` position (compact symbols are position-independent), so shorthand/aggregated input is allowed. Reuses `inputStateMachine` and the default `keyMap`.
- **`components/editor/CompactSystemEditor.tsx`** — renders one row per group: a label chip (`utils/compactGroupLabel.ts`, with the full position list as a tooltip) + the measures, each drawn with the shared `StaffLine`, divided by a thin separator.
- **`SystemNotationEditor`** gained a reactive `readOnly` mode: it renders straight from the `initialStaves` prop (so it reflects compact edits flowing through `expandSystem`), shows no cursor, and ignores input.
- **`SystemNode`** now renders the `CompactSystemEditor` (editable) above the expanded notation, and sets the expanded editor `readOnly` when the system has groups. A second debounced commit rebuilds `groups` from the compact lines, calls `expandSystem`, and `updateSystem`s. Systems without groups (legacy/laras) and COPY systems keep the old editable expanded editor.

MVP boundaries (deferred):

- Precise column alignment of compact measures against the kempli grid, and the **norot space-eating / cut-off** policy, are not yet implemented (measures are shown divided but not pixel-aligned to expanded columns).
- The per-system **"view expanded"** toggle is Step 5; for now the read-only expanded view is always shown beneath the compact editor (it also carries playback).
- Compact **paste** is minimal (first clipboard line into the active measure).
- Group-membership editing (Step 4) and Lezer validation + save gating (Step 6) are unchanged/later.