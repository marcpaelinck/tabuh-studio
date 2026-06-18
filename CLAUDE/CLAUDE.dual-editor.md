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
    positions: Position[]            // 1..n; a single-position group is a "solo" line
    measures: NoteObject[][]         // compact symbols per kempli beat (may contain shorthand)
    castingInstructions?: CastingInstruction[]   // nokempyung / norot context
}
// System gains: groups: NotationGroup[]   (subsumes notationGroups + the dead editorGroup)
//               staffs stays, but becomes a DERIVED CACHE (recomputed via expandSystem)
```

## Steps

### Step 1 — Extract the expansion pipeline (no behaviour change)

New module `frontend/src/componentlogic/expandNotation.ts` owning the whole compact→expanded transform, currently split across `tabuhParser.castGroupedNotationToPositions` and `postProcess` steps 1–4:

- `castGroupedNotationToPositions(groups, castInstructions): ParsedStaffs`
- `expandParsedStaffs(parsedStaffs): { staffs, colWidths }` — applyPatterns → pad to colWidths → flatten
- `expandGroupedNotation(groups, castInstructions): { staffs, colWidths }` — cast + expand (the entry point the live editor will reuse)
- `deriveKempli(current, execution, colWidths, hasKempliStaff): KempliSetting`

`tabuhParser` is rewired to call these (parser and editor then run identical code). A node test pins the expanded `staffs` for fixtures.

### Step 2 — Canonical compact model + derive `staffs` + storage

Add `groups` to `System`; parser populates them (ungrouped positions become single-position groups); `expandSystem(system)` refreshes `staffs`+`kempli` from `groups`. `useScoreReader.postprocessScore` re-derives staffs on load; `saveScore` persists groups + cached staffs. Migration: re-run `importTsvScores` for tsv-backed scores; all-solo groups for the rest. Update `config.systemKeyOrder` and backend Zod.

### Step 3 — Compact view editor (the new editing surface)

`useCompactSystemEditor` (analogous to `useSystemEditor`, lines = groups), reusing `inputStateMachine`/`StaffLine`; compact label chips with full-position tooltips; on edit → `expandSystem` (debounced). The existing per-position editor becomes read-only. Implement the norot space-eating / cut-off alignment here (with cut-off warning). Group-membership editing (create/add/remove) and Lezer validation are later steps (4 and 6).