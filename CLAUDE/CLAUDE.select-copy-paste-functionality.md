# Selection, clipboard, undo and overwrite functionality

This document describes additional editing requirements — selection, an improved
clipboard, an undo/redo history, and an overwrite mode — and the agreed design and
phased plan for implementing them.

## Context

A basic copy-paste facility is in place (`notationClipboard.ts` and `keyMap.ts` in
`frontend/src/componentlogic/editor/`). Several pieces are still missing: replacing a
selection on paste, deleting a selection, cut, undo/redo, and an overwrite typing mode.

### Current state of the editors

- The grouped/compact notation is the **single source of truth**, so the expanded
  per-position view is **read-only at all times**. The former editable expanded
  controller (`useSystemEditor`) has been removed; `SystemNotationViewer` is now a
  purely presentational, read-only component that renders from its `staves` prop.
- There is therefore **one editor controller**, `useCompactSystemEditor` — the compact,
  grouped view. It is caret-only (no selection state): one flat `NoteObject[]` per group
  *line* + a single cursor `CompactCursor { line, index }`.
- **Copy** currently relies on the browser's *native* text selection — `Ctrl/Cmd+C`
  is deliberately left to the browser (the glyphs are real DOM text). There is no
  internal notion of a selection.
- **Paste** is wired in both controllers (`onPaste`): clipboard text is parsed line by
  line and distributed across consecutive staves/lines starting at the cursor. It does
  not consult any selection.
- **Cut** (`Ctrl/Cmd+X`) is swallowed (`{ type: 'ignore' }`) to avoid desyncing the DOM
  from editor state.
- All state-machine operations are **pure and immutable** (each returns a fresh state,
  `onChange` fires when notation changed). Edits reach the store through
  `useDebouncedCommit`; the store is the source of truth that gets persisted.

The single most important consequence: **every requirement below presupposes a
selection abstraction that does not exist yet.** Building it is the first real task.

## Design decisions

1. **Internal selection model, not the native DOM selection.** A native `Selection`
   yields character offsets in the spaced-font text, but one symbol may be several font
   characters (grace prefix + pitch + octave + modifier). Mapping DOM offsets back to
   symbol boundaries — including mid-symbol edges — is error-prone. The selection is
   therefore held in editor state as symbol indices, and copy/cut serialise the selected
   `NoteObject`s directly (exact by construction).

2. **Restrict a selection to a single stave/line (a contiguous symbol range) to start
   with.** This removes the hardest problems up front: no cross-controller ownership, no
   rectangular block semantics, no partially-applicable multi-target history entries.
   Cross-line/-system selection is a later phase.

3. **Snapshot-based undo, not inverse operations.** Because the state ops are immutable,
   each undoable action stores a small snapshot (the affected line's `symbols` +
   cursor, and — for structural context — the owning system `uuid` and the group
   line's `id`). Undo/redo are plain stacks of snapshots. This is simpler and far more
   robust than computing inverse operations (e.g. "un-paste").

4. **Stable identity keying.** History entries reference their target by system `uuid`
   and group-line `id` (`GroupedNotation.id`), **never** by numeric `index`/system `id`.
   Structural actions (move/delete) reassign system `id`/`index` via `renumberSystems`,
   so index-keyed history would silently point at the wrong system.

5. **Shared state lives in a Zustand store.** Each system renders its own
   `useCompactSystemEditor` instance, so the cross-cutting state — the internal
   clipboard, the undo/redo stacks, the overwrite-mode flag, and the active selection
   context — is held in a dedicated Zustand store (see decision 6) rather than in any
   single controller. This keeps it accessible to other components (menus, toolbars,
   status indicators) and lets an undo drive focus/caret to whichever system it targets.

6. **New store: `useEditorStateStore`** (Zustand), holding:
   - `overwriteMode: boolean` (session-scoped; toggled by `Insert`);
   - `clipboard` — the last internally copied/cut symbols (as text, so it also
     interoperates with the OS clipboard);
   - `selection` — the active selection as `{ systemUuid, lineId, anchor, focus }` or
     `null` (single line; see decision 2);
   - `undo` / `redo` — stacks of snapshot entries keyed by `systemUuid` + `lineId`
     (see the history section).

   An existing store could host these, but a focused new store keeps the editor concerns
   separate from user-selection/keymap/score state.

## Required functionality

### Selection (new foundation)

- Selection state = an `anchor` and `focus` symbol index within **one** stave/line.
- Creation gestures: `Shift`+`ArrowLeft`/`ArrowRight` (extend), `Shift`+`Home`/`End`,
  `Shift`+click, and `Ctrl/Cmd+A` (select the whole **current stave/line**).
- A visual highlight is rendered in `StaffGrid` (none exists today).
- Moving the caret without `Shift` collapses the selection.

### Copy / Cut / Paste / Delete of a selection

- **Copy** (`Ctrl/Cmd+C`): serialise the selected symbols to the clipboard as text
  (reuse `serializeStaff`). With no selection: copy the whole active stave/line.
- **Cut** (`Ctrl/Cmd+X`): copy the selection, then remove it (replacing the current
  no-op). With no selection: no-op (decision, see Open questions).
- **Paste** (`Ctrl/Cmd+V`): if a selection exists, **replace** it with the clipboard
  content; otherwise insert at the caret (current behaviour).
- **Delete selection**: `Backspace`/`Delete` remove the entire selection when one exists.
- **Typing replaces a selection**: when a selection is active, typing a symbol (or
  pasting, in any mode) replaces it — matching standard editor behaviour.

### Overwrite mode (new)

- `Insert` toggles between **insert** (current, default) and **overwrite** mode; the
  mode is a controller/store flag surfaced to the user via the cursor style (bar vs.
  block/underline).
- In overwrite mode, typing a symbol **replaces** the symbol at the cursor and advances;
  at end-of-line it degrades to insert (nothing to overwrite).
- Overwrite affects **single-symbol typing only**. Paste stays insert-only (except when
  it replaces a selection). Modifier/octave keys keep targeting the symbol left of the
  cursor, unchanged.

### Undo / Redo history

- `Ctrl/Cmd+Z` = undo; `Ctrl/Cmd+Y` and `Ctrl/Cmd+Shift+Z` = redo. (Redo is essentially
  free with snapshot stacks.)
- **Undoable actions** (each pushes one history entry): insert a symbol, delete
  left/right, delete a selection, cut, paste, overwrite-type, octave change
  (`Ctrl+↑/↓`), and modifier attach/toggle.
- **Not history events**: cursor moves, selection changes, view toggles.
- **Out of scope (initially)**: structural operations that go through `useScoreManager`
  rather than the editor controllers — add/remove staff (label menu), add/remove/move
  system (hamburger menu), add/remove position. See the next section for how they affect
  history.
- Optional coalescing of consecutive single-symbol typing into one undo step is a
  possible refinement; the default granularity is one entry per action.

## Effect of structural deletions on history

Deleting a system, or a group line within a system, can invalidate history entries that
reference it. Two options were considered:

- **Option A — clear the whole history on any structural change.** Safe and trivial, but
  heavy: deleting one line discards unrelated undo steps.
- **Option B — prune only entries that reference the deleted system/line.** Better UX,
  but only sound if (a) entries are keyed by `uuid`+`lineId` (decision 4), and (b) each
  entry is treated atomically (with single-line selections this is automatic, since an
  action touches exactly one target).

**Decision:** ship **Option A** first, but build entries `uuid`+`lineId`-keyed and
atomic from day one, so upgrading to Option B later is a localised change. (Note that the
structural deletion itself is not undoable in this design; Option A simply means "a
structural change resets the notation-edit history.")

## Interaction concerns to handle during implementation

- **Undo vs. the debounced commit.** An undo must re-commit through the store (flushing
  any pending debounce first), or the visible state and the persisted state desync.
- **Re-derivation.** In the compact editor an edit changes a group's notation and
  triggers `expandSystem` re-derivation (casting/pokok). Undo must restore the canonical
  `groups` and re-derive — not patch a rendered staff in isolation.
- **Focus/caret after undo.** When an undo targets a system other than the focused one,
  the shared owner routes focus and places the caret there.
- **Paste shape vs. selection.** Replacing a single-line selection with multi-line
  clipboard content: paste only the first line into the selected range (the rest is
  ignored while selections are single-line); revisit when block selection lands.

## Phased implementation plan

**Phase 1 — selection + clipboard + overwrite (single line).**
Create `useEditorStateStore` (selection, clipboard, overwrite flag). Internal
single-line selection model, highlight rendering in `StaffGrid`, `Shift`-gestures /
`Shift`-click / `Ctrl+A`; symbol-accurate copy/cut; delete-selection;
paste-replaces-selection; typing-replaces-selection; and overwrite mode (`Insert` toggle
+ cursor style). No history yet.

**Phase 2 — undo/redo.**
Add the snapshot `undo`/`redo` stacks to `useEditorStateStore`, `uuid`+`lineId`-keyed,
driving focus and re-committing through the score store. Option A on any structural
change. Covers all undoable actions listed above.

**Phase 3 — cross-line selection + Option B.**
Extend selection to multiple lines (block semantics), multi-line copy/cut/paste, and
switch history pruning from Option A to Option B.

## Resolved decisions

- **Cut with no selection:** no-op.
- **View toggle mid-history:** not applicable — the expanded view is read-only, so all
  editing (and thus all history) happens in the single compact controller.
- **Typing coalescing:** one undo entry per symbol (no coalescing).
- **Overwrite-mode persistence:** per editor session (held in `useEditorStateStore`, not
  persisted to user settings).
