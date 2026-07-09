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
// Named `GroupedNotation` in the code (typing/score.ts).
interface NotationGroup {
    id: string
    positions: Position[]    // 1..n; a single-position group is a "solo" line
    notation: NoteSymbol[]   // FLAT compact symbols (a norot is followed by its space columns)
}
// System gains:
//   groups: GroupedNotation[]                   // CANONICAL compact store
//   beatSlices: BeatSliceInfo[]                 // per-kempli-beat boundaries (from getBeatSlices)
//   castingInstructions?: CastingInstruction[]  // system-wide casting context (AUTOKEMPYUNG=off)
//   staffs stays, but becomes a DERIVED CACHE (recomputed via expandSystem)
```

Implementation notes (as built):

- **Flat notation (like a Staff).** A group's `notation` is a single flat `NoteSymbol[]`. `System.beatSlices` holds the per-beat boundaries, derived by `getBeatSlices` from the kempli (frequency, or the `KEMPLI` staff's beat characters); they're used to draw the grid.
- **Norot occupies its full width.** A norot occupies 4 columns (`presume norot = 4 symbols`). The **tabuhParser** pads the individual measures with spaces before flattening, so the `group.notation` it returns already has every staff correctly aligned (a norot is followed by its space columns). On expansion, the `eatSpaces` mode of `applyPatterns` consumes those spaces in place (cut off + warning if too few). Outside the parsers, measures do not exist as explicit objects — they can be reconstructed on the fly via `getBeatSlices`. `expandSystem` reproduces the parser staffs (validated by `test:groups`).
- **Compact editor uses a FLAT model (no measures).** `CompactLine` is `{ id, positions, notation: NoteObject[] }` and the cursor is `{ line, index }` — a flat index into the line's notation (see `CLAUDE.refactor-remove-measure.md`). The earlier per-measure representation (and the `splitFlat`/`flattenCompact`/`entryColWidths` helpers) was removed; columns are now the user's to align with spaces, consistent with the frequency-based grid.
- Casting context lives at the **system** level (`System.castingInstructions`).
- `notationGroups` and `editorGroup` are left in place (deprecated, no longer populated).
- **COPY is deferred.** The parser still produces correct staffs for COPY systems, but those systems are marked (`copyFromUuid`) and **excluded** from groups-based re-derivation on load (they keep their cached staffs). Group-level COPY is a planned follow-up.
- **Grid (compact view).** `CompactSystemEditor` draws the same background grid as the expanded notation — a gridline every column plus the kempli beats in green — using the per-beat widths derived from `beatSlices` (or the uniform `kempli.frequency`). Each group is rendered as one continuous flat line; the cursor is the flat index into the line's notation.

## Steps

### Step 1 — Extract the expansion pipeline (no behaviour change)

New module `frontend/src/componentlogic/expandNotation.ts` owning the whole compact→expanded transform, currently split across `tabuhParser.castGroupedNotationToPositions` and `postProcess` steps 1–4:

- `castGroupedNotationToPositions(groups, castInstructions): ParsedStaffs`
- `expandParsedStaffs(parsedStaffs): { staffs, colWidths }` — applyPatterns → pad to colWidths → flatten
- `expandGroupedNotation(groups, castInstructions): { staffs, colWidths }` — cast + expand (the entry point the live editor will reuse)
- `deriveKempli(current, execution, colWidths, hasKempliStaff): KempliSetting`

`tabuhParser` is rewired to call these (parser and editor then run identical code). A node test pins the expanded `staffs` for fixtures.

> **Superseded.** The pipeline has since been refactored to the flat model: `castGroupedNotationToPositions(system, castInstructions)` → `getBeatSlices(system)` → `applyPatterns(…, beatSlices, eatSpaces)`. `expandParsedStaffs`, `expandGroupedNotation` and `deriveKempli` no longer exist, and `colWidths` is now `System.beatSlices`. See the Implementation notes above and `CLAUDE.refactor-remove-measure.md`.

### Step 2 — Canonical compact model + derive `staffs` + storage

Add `groups` to `System`; parser populates them (ungrouped positions become single-position groups); `expandSystem(system)` refreshes `staffs`+`kempli` from `groups`. `useScoreReader.postprocessScore` re-derives staffs on load (skipping legacy/laras scores with no groups and COPY systems); `saveScore` already strips `objNotation` and now persists groups + the staffs cache (groups hold plain strings, so nothing extra to strip). Migration: re-run `import:scores:*` for tsv-backed scores (the parser now emits groups) — no separate migration code needed; legacy DB scores without groups keep working off their cached staffs until re-imported. `config.systemKeyOrder` updated; backend Zod needs no change (the score `content` schema uses `.catchall`, so `groups` passes through).

Verification: `npm run test:groups` parses every fixture and asserts `expandSystem(fromGroups)` reproduces the parser's staffs + kempli for all non-COPY systems. `npm run test:expand` (Step 1 goldens) must also still pass since the parser's own path is unchanged.

### Step 3 — Compact view editor (the new editing surface)

`useCompactSystemEditor` (analogous to `useSystemEditor`, lines = groups), reusing `inputStateMachine`/`StaffLine`; compact label chips with full-position tooltips; on edit → `expandSystem` (debounced). The existing per-position editor becomes read-only. Implement the norot space-eating / cut-off alignment here (with cut-off warning). Group-membership editing (create/add/remove) and Lezer validation are later steps (4 and 6).

Implementation notes (as built):

- **`componentlogic/editor/useCompactSystemEditor.ts`** — controller whose lines are groups, each holding a flat `notation: NoteObject[]`; the cursor is `{ line, index }` (flat). Left/right wrap to the adjacent line at the ends; up/down keep the column clamped to the target line. All state-machine ops run with an `undefined` position (compact symbols are position-independent), so shorthand/aggregated input is allowed. Reuses `inputStateMachine` and the default `keyMap`.
- **`components/editor/CompactSystemEditor.tsx`** — renders one row per group: a label chip (`utils/compactGroupLabel.ts`, with the full position list as a tooltip) + the group's notation drawn as one continuous `StaffLine` over the kempli grid. Clicks pass the flat index straight to the cursor. The label chip opens a popover for group-membership editing (Step 4).
- **`SystemNotationEditor`** gained a reactive `readOnly` mode: it renders straight from the `initialStaves` prop (so it reflects compact edits flowing through `expandSystem`), shows no cursor, and ignores input.
- **`SystemNode`** now renders the `CompactSystemEditor` (editable) above the expanded notation, and sets the expanded editor `readOnly` when the system has groups. A second debounced commit rebuilds `groups` from the compact lines, calls `expandSystem`, and `updateSystem`s. Systems without groups (legacy/laras) and COPY systems keep the old editable expanded editor.

MVP boundaries (deferred):

- The per-system **"view expanded"** toggle is Step 5; for now the read-only expanded view is always shown beneath the compact editor (it also carries playback).
- Compact **paste** is minimal (first clipboard line into the active line at the cursor).
- Group-membership editing (Step 4) and Lezer validation + save gating (Step 6) are unchanged/later.

### Step 4 — Compact view editor refinement (part 1)
- Add the full position list as a tooltip to the compact position tags at the beginning of each staff.
- Enable add/remove a staff above/below the pointer. Initially fill the `Position` group with a single, random position which does not yet occur in another staff of the same system. Adding a staff should be disabled if all positions are accounted for in the current system.
- Enable add/remove positions to groups. Only allow to add positions that do not occur yet in the current system. 
Adding a position that already has its own notation pops the warning you described before overwriting it with the cast result.

#### Implementation

Everything here is a mutation of `System.groups` (each group's `positions` / `.notation`); edits flow through the commit path (`NoteObject.toNotation` → `expandSystem`) — no new expansion machinery. Group-structure edits commit **immediately** (not the 300 ms typing debounce).

**Membership rule — strict "unused only".** A position lives in exactly one group. Every picker offers `universe \ used`, where `used = ⋃ group.positions` and `universe = positionOrder` minus `used`. `KEMPLI` is included in `universe` **only when `system.kempli.state === 'notation'`** (i.e. the kempli is written as notation rather than derived from a frequency); otherwise it is excluded. No move / overwrite / confirm-dialog path (dropped).

**Aggregation validity — `allowedGroups`.** A group's positions are valid iff they are all contained in one `allowedGroups[]` array (in `castingRulesManager`). Helpers, co-located with `allowedGroups`:
- adding to a group offers only `p ∈ (universe \ used)` such that `group.positions ∪ {p}` ⊆ some `allowedGroups` entry;
- a fresh solo staff accepts any `p ∈ (universe \ used)` (a single position is trivially valid).

**KEMPLI.** `KEMPLI` is offered as an addable/editable staff **only while `system.kempli.state === 'notation'`** (see the universe rule above); when the kempli is frequency-driven it is not an editable position. When a `KEMPLI` group is present, `expandSystem` already sets `kempli.state = 'notation'` (`hasKempliStaff`), so the two stay consistent.

**Labels — `positionGroups` + `positionAbbr` (rewrite `compactGroupLabel`).** Greedily cover the position set with the largest matching `positionGroups` entries, render each covered piece (and any leftover single positions) via `positionAbbr` (falling back to the position/group name), and join with `/` → `ga/ugal`, `reyong13`, `pokok`. The `tooltip` stays the full comma-separated position names (bullet 1); the chip keeps `title={tooltip}` (optionally upgraded to a `Whisper`).

**Controller ops (`useCompactSystemEditor`).**
- `addLine(atIndex, positions)` — insert `{ id, positions, notation: [] }` (empty → rests); move cursor into it. Disabled when `universe \ used` is empty. (The UI collects the position selection first, then creates the staff.)
- `removeLine(index)` — drop the group; clamp cursor.
- `addPosition(lineIndex, position)` — append to `positions` (candidates constrained as above).
- `removePosition(lineIndex, position)` — **split into a solo staff**: remove `p` from the group and insert a new solo group `{ positions:[p], notation: cast of the group's notation to p }` so `p` keeps the notation it had. The cast is a small flat helper next to `castNotation` (`castGroupToSolo(groupPositions, notation, p)`), preserving norot shorthand; disallow removing a group's **last** position (remove the line instead).

**UI (`CompactSystemEditor`).** Per-line control cluster by the label chip: add-above / add-below / remove-line `IconButton`s (disabled states per the rules); clicking the label chip opens a `Popover` showing the group's positions as removable chips + a picker limited to the valid candidates.

**Wiring (`SystemNode`).** Pass `availablePositions` (the `universe`) down; commit path unchanged, so added/removed positions and lines flow to the derived staffs, kempli and playback.

**Edge cases.** Removing the last line leaves an empty system (dovetails with Step 5's "new empty system"). The grid re-derives from `beatSlices` (via `getBeatSlices`) on each commit, so adding/removing lines and positions is reflected automatically.

### Step 5 — Compact view editor refinement (part 2), separate expanded view
- In the compact view display a read-only expanded view immediately below the grouped staff which contains the editing cursor. The expanded staff view should only display the staffs for the positions that are in the grouped staff. If the editor cursor is not visible no expanded staff view should be displayed.
- Remove the expanded systems from the compact view and display them in a separate view. Add a toggle above the editor window to switch between the compact view and the editor view.
- Playback should be enabled both in the compact and the expanded view. Don't implement the cursor in the compact view yet, we'll get to that once we agree on the new architecture for the split editor view concept.
- During playback the expanded staffs in the compact view should be hidden.
- In the expanded view all `SummaryItems` should be disabled. Editing should only be possible in the compact view.

#### Implementation

- **`groups` are leading.** A system with no groups renders nothing (`SystemNode` returns `null`). The legacy editable per-position path was removed: the expanded view is now **always read-only**, and editing happens only in the compact view. (laras is being adapted to emit one-position groups; a brand-new empty system with `groups: []` therefore shows nothing until Step 6 seeds it.)
- **View toggle.** `editorView: 'compact' | 'expanded'` lives in `useUserSelectionStore` (typed in `typing/playback.ts`). `EditorWindow` renders a `SegmentedControl` at the top, wrapped in a `sticky top-0` bar so it stays pinned while the systems scroll. `SystemNode` subscribes to the store directly (no prop threading, so `React.memo` stays effective).
- **`SystemNode` branch.** In **compact** view it renders only the `CompactSystemEditor`; in **expanded** view it renders only the read-only per-position notation (the textarea + `SystemNotationEditor readOnly`, which also carries the playback highlight). The header (`PlaybackButtons` + `SummaryItem`s) is shown in both; the `SummaryItem`s get `disabled={editorView === 'expanded'}`.
- **`SummaryItem.disabled`.** New prop that blocks the button action and prevents/cancels field editing (`useEffect` forces `editing = false` when disabled; the `IconButton` is disabled).
- **Per-line expansion snippet.** `CompactSystemEditor` renders, immediately below the line holding the cursor, read-only `StaffLine`s for just that group's positions, taken from the derived `systemData.staffs` (passed in as `staffs`). Shown only when the editor is **focused** (cursor visible) and **not** while playing (`playing` prop). The snippet uses the same `w-36` label column as the compact staff so its **notation columns line up 1:1** with the compact notation (a norot occupies its 4 padded columns in both); the label is styled to stand out.
- **Playback.** Audio is view-independent (the header play buttons work in both). No visual cursor is drawn in the compact view yet (deferred): the expanded textarea isn't mounted there, so the grid-paint effect just no-ops; `editorView` was added to that effect's deps so the expanded grid repaints when you switch back.
- **Caret placement fix.** `StaffLine` places the caret on `mousedown` (not `click`), so the target staff/column is captured at press time — before focusing the editor re-renders and the snippet shifts the layout, which previously made the first click after a scroll land on the wrong staff.

### Step 6 — Creating a new score
- Add a menu option `New` under `Notation` in the MainMenu and add functionality that creates a new score. The function should enable the user to fill in the title, instrument type and composer. The first two items are compulsory. The instrument type should be chosen from the possible values of the `InstrumentType` interface, except 'UNDEFINED'.
- A new score should initially contain one system with an empty `groups`.
- The user should be able to modify the title and composer of the score at any time.
