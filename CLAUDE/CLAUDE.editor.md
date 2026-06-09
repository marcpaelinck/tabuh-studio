# Virtual Editor — Implementation Summary

This document describes how the notation editor actually works as implemented. It
is the companion to the design notes in `CLAUDE.virtual-editor.md` (the original
decision) and `CLAUDE.NoteObject.md` (the symbol model). See `CLAUDE.md` for the
overall project context.

---

## Overview

The editor lets the user type Balinese gamelan notation directly, with a custom
blinking cursor that always sits **between whole symbols**, even though a symbol
(pitch character + modifiers) is rendered as a single glyph by the negatively
spaced BaliMusic font. The browser never manages the cursor or text — every
keystroke is intercepted and applied to an in-memory model.

The editor's state is a list of `NoteObject` per staff. `NoteObject`
(`shared/NoteObject.ts`) is the immutable, normalised representation of one
symbol; the editor builds on it directly rather than introducing a separate
symbol type. Character classification (pitch / grace prefix / octave / stroke /
pattern) comes from `shared/noteChars.ts`.

One editor instance covers a whole **system**: all of its instrument staves are
edited together as a grid, so the cursor can move up and down between staves and
a multi-line paste can land across several staves at once.

---

## File map

Logic (`frontend/src/componentlogic/editor/`):

| File | Responsibility |
|---|---|
| `inputStateMachine.ts` | Pure, framework-agnostic operations on one staff (`NoteObject[]` + cursor index). No React. |
| `keyMap.ts` | Translates a keystroke into an abstract `EditorAction`. The seam for future per-user key mappings. |
| `useSystemEditor.ts` | The multi-staff controller hook: owns the grid state and a single cursor, routes keys/paste, handles cross-staff navigation. |
| `useEditorKeyboard.ts` | Single-staff keyboard hook (a reusable building block; the integrated editor uses `useSystemEditor`). |
| `useNotationEditor.ts` | Single-staff convenience hook bundling state + `useEditorKeyboard`. |
| `notationClipboard.ts` | Serialise / parse notation as plain text for copy-paste. |
| `useDebouncedCommit.ts` | Generic debounce-with-flush-on-unmount used to defer the expensive score commit. |

Components (`frontend/src/components/editor/`):

| File | Responsibility |
|---|---|
| `SystemNotationEditor.tsx` | The focusable, transparent, multi-line editor element; wires `useSystemEditor` and renders the staves. |
| `StaffLine.tsx` | Presentational render of one staff line: symbol spans + the cursor + click handling. |
| `NotationEditor.tsx` | Standalone single-staff presentational editor (building block; not used by the integrated path). |
| `SystemNode.tsx` | Hosts the editor: overlays it on the playback textarea and commits edits to the score. |

Styling: the cursor (`.notation-cursor`) and its blink keyframes live in
`frontend/src/index.css`.

---

## Data model

```typescript
// One staff being edited (inputStateMachine.ts)
interface EditorStaffState {
    symbols: NoteObject[]   // the notation
    cursorIndex: number     // BETWEEN symbols: 0..symbols.length
}

// One staff in the multi-staff controller (useSystemEditor.ts)
interface EditorStaff {
    position: Position      // the instrument position this staff belongs to
    symbols: NoteObject[]
}

// The cursor across the staff grid
interface SystemCursor {
    staff: number          // index into the staff list (display order)
    index: number          // BETWEEN symbols within that staff
}
```

The cursor index sits between symbols, exactly like a text caret sits between
characters. Index `0` is before the first symbol; `symbols.length` is after the
last. Because every symbol occupies exactly one character cell in the spaced
font, the **visual column equals the cursor index** — which is what makes
up/down navigation trivial (keep the index, clamp to the target staff length).

---

## The input state machine (`inputStateMachine.ts`)

A set of pure functions, each taking an `EditorStaffState` and returning a new
one (never mutating; returns the same reference when nothing changes). Invalid
results are rejected by pre-validating with `NoteObject.validate` (this also
avoids console noise from the `NoteObject` constructor).

- `typeChar(state, char, position)` — routes a typed character:
  - a **pitch** character (`PITCH_CHARS`) opens a new symbol at the cursor and advances it (`insertSymbol`);
  - a **grace prefix / octave / stroke / pattern** modifier is applied to the symbol left of the cursor (`setModifier`);
  - anything else is ignored.
- `setModifier(state, char, position)` — sets a modifier on the symbol left of the cursor. Each symbol has one slot per modifier kind (prefix, octave, stroke-or-pattern), so this **replaces** whatever is in the relevant slot. Typing the modifier that is already there **toggles it off**. Since stroke and pattern share one slot, this also switches between them. The cursor does not move.
- `changeOctave(state, delta, position)` — raises/lowers the octave of the **melodic** note left of the cursor by changing its octave modifier (`,` = −1, `''` = 0, `<` = +1). No-op for non-melodic notes and at the limits (cannot go below −1 or above +1).
- `insertSymbol`, `attachModifier`, `moveCursor`, `clampCursor`, `deleteLeft`, `deleteRight` — the remaining primitives. Backspace/Delete remove a whole symbol; they do not merge staves.

`attachModifier` (append/prepend then re-normalise) is retained as a building
block, but the integrated path goes through `setModifier` so modifiers replace
and toggle rather than being rejected as duplicates.

---

## Keyboard mapping (`keyMap.ts`)

A `KeyMap` is a function `(Keystroke) => EditorAction | undefined`. The handler
resolves each keystroke to an abstract action and executes it. This indirection
is the foundation for future personal key mappings: a settings screen only needs
to supply a different `KeyMap`; the handler and state machine are untouched. For
example the default maps `A` to `insertChar` (which the state machine resolves to
"grace note"), but a custom map could return `{ type: 'insertSymbol', value: 'a,' }`.

Default mapping (`defaultKeyMap`):

| Keystroke | Action |
|---|---|
| Left / Right | Move cursor one symbol (wraps to the adjacent staff at line ends) |
| Up / Down | Move to the staff above/below, keeping the column |
| Ctrl/Cmd + Up / Down | Octave up/down of the melodic note left of the cursor |
| Home / End | Cursor to start / end of the staff |
| Backspace / Delete | Remove the symbol left / right of the cursor |
| printable character | `insertChar` → input state machine |
| Ctrl/Cmd + C | Left to the browser's native selection copy |
| Ctrl/Cmd + V | Handled by the editor's `onPaste` |
| Ctrl/Cmd + X | Swallowed for now (cut would desync the DOM from editor state) |

A recognised keystroke always calls `preventDefault`, so native text editing
never interferes.

---

## The multi-staff controller (`useSystemEditor.ts`)

Owns the editor state — one `NoteObject[]` per staff plus a single
`{ staff, index }` cursor — and a `focused` flag. It:

- delegates within-staff edits (insert / delete / modifier / octave) to the pure
  state-machine functions, applied to the active staff;
- handles **cross-staff navigation** itself: Up/Down move between staves keeping
  the column; Left at index 0 wraps to the end of the previous staff, Right at
  the end wraps to the start of the next;
- handles **paste** (`onPaste`): the clipboard text is split into lines and
  distributed across consecutive staves starting at the cursor; each pasted
  symbol is bound to its target staff's `position`. Lines beyond the available
  staves are dropped.
- exposes `onKeyDown`, `onPaste`, `onFocus`, `onBlur`, `setCursor` (used by
  clicks), plus `staves`, `cursor`, `focused` for rendering.

It calls an `onChange(staves)` callback only when the **notation** actually
changes (not on pure cursor moves).

---

## Rendering — layered over the playback textarea

`SystemNotationEditor` is a single focusable `<div>` with a transparent
background and the spaced BaliMusic font. It renders one `StaffLine` per staff;
each `StaffLine` renders each symbol in its own `<span>` (so intra-symbol negative
spacing is preserved) and draws the blinking cursor between symbols on the active
staff.

In `SystemNode` this editor is **layered on top of the existing playback
textarea**:

- The textarea remains the playback animation surface — `setGrid` still paints
  the kempli grid and the yellow playback band as CSS background gradients
  positioned in `ch` units. Its text is set to `color: transparent`, so only the
  highlight shows through.
- The editor overlays it (`position: absolute; inset: 0`) with matching font,
  line-height (`leading-5.5`), padding (`p-0`) and a transparent `border-1`, so
  the glyphs and the highlight align row-for-row and column-for-column.

This keeps playback completely unchanged while giving the editor full control of
glyphs, cursor and input. The cursor element has negative margins on both sides
so it has zero net width and does not shift the symbols after it.

Clicking a symbol snaps the cursor to the nearest boundary (left/right half);
clicking past the last symbol parks it at the end.

---

## Copy / paste (`notationClipboard.ts`)

Notation is exchanged as plain text so it round-trips with the textarea
representation and with external text files: one staff per line (its symbols
concatenated), staves separated by `\n`.

- `serializeStaff` / `serializeStaves` — model → text.
- `splitClipboardLines` — split text into lines, tolerant of CRLF and a trailing newline.
- `parseClipboard(text, positions)` — text → one `NoteObject[]` per line, each bound to the matching staff position.

Paste is wired (distributed at the cursor as described above). Copy currently
relies on the browser's native selection copy of the rendered glyph text; cut is
swallowed. Selection-based copy/cut is a future feature.

---

## Editing flow and persistence

1. A keystroke updates `useSystemEditor`'s internal state synchronously, so the
   on-screen glyphs and cursor change **instantly**.
2. On a notation change, `onChange(staves)` runs. In `SystemNode` this rebuilds
   the affected staffs (`objNotation` plus `notation` via `NoteObject.toNotation`)
   into a new `System` and calls `updateSystem` — but **debounced** (~300 ms,
   `useDebouncedCommit`), so the global score only catches up once typing pauses.
   A pending edit is flushed on unmount.
3. `updateSystem` → `setScore` re-renders the editor tree and triggers the
   `useScoreManager` `[score]` effect, which re-numbers systems, rebuilds goto
   tooltips, and writes the whole score to IndexedDB for recovery — the IndexedDB
   write is itself **debounced** (~800 ms).

The editor is the **source of truth** while editing; the score is downstream.

---

## Performance notes

Typing used to commit to the global score on every keystroke, which re-rendered
all systems and serialised the entire score to IndexedDB each time. The fixes:

- **Editor owns its state** — keystrokes re-render only the editor, not the score.
- **Debounced commit** (`SystemNode`, 300 ms) — the score update fans out once per pause.
- **Debounced IndexedDB write** (`useScoreManager`, 800 ms).
- **`SystemNode` is `React.memo`'d**, and the props from `EditorWindow` are kept
  referentially stable so the memo is effective: `updateSystem` and
  `updateCursorFunction` are `useCallback([])`; `executeItemAction` depends on
  `[labels]` (not `[score]`); `gotoTargets` keeps the same `Set` reference when
  its contents are unchanged. Committing one system no longer re-renders the others.

Trade-off: because the commit is deferred, the playback grid width and kempli
highlight for the system being edited update ~300 ms after you pause; the glyphs
you type appear immediately (they come from the editor, not the textarea).

---

## Known limitations / future work

- The editor seeds its state once on mount and is the source of truth thereafter,
  so external changes to the same system are not reflected in an already-mounted
  editor. New / copied systems are fine because they remount (their React key is
  the system `uuid`).
- Selection-based copy/cut is not implemented (native selection copy works; cut
  is swallowed).
- Per-user keyboard mappings: the `KeyMap` layer is in place; the settings UI to
  produce custom maps is not built yet.
- Overlay alignment relies on the editor and textarea sharing font / line / box
  metrics; if it ever drifts, the fix is local to the two className/style blocks
  in `SystemNode` and the `.notation-cursor` rule in `index.css`.
