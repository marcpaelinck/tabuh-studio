# NoteObject Class Design — Conversation Summary

## Context

This document summarises a design decision made for the Tabuh Studio application regarding the `NoteObject` class. See `Claude.md` for full project context.

The problem being solved: in some parts of the editor code, the exact ordering of characters within a **symbol** (a pitch character plus its modifier characters, rendered as a single visual unit by the BaliMusic font) is important. There was no guarantee of a specific ordering, causing errors.

---

## The Problem

A **symbol** in BaliMusic font notation consists of:
- One **pitch character** (always present, e.g. `u`, `a`, `i`)
- Zero or more **modifier characters** (e.g. `,` for lower octave, `/` for damped, `<` for upper octave)

Modifier characters have **negative spacing** in the BaliMusic font, so they visually combine with (are superimposed on) the preceding pitch character. The cursor does not advance past them visually.

Because modifiers can arrive in any order during editing, the same logical note can be represented by different character sequences (e.g. `u,/` and `u/,` look the same but are different strings). This inconsistency causes errors in code that depends on character ordering.

---

## The Solution

A `NoteObject` **class** whose constructor:
1. Accepts any valid ordering of characters for a symbol as input
2. Partitions the characters into their categories
3. Stores them in a **canonical (normalised) ordering**
4. Exposes the normalised string via a `fontChar` property

Using a `class` rather than a plain interface enforces the normalisation invariant — once constructed, a `NoteObject` is always in canonical form.

---

## Character Categories

Based on the BaliMusic font character table:

```typescript
// Characters that can appear BEFORE the pitch character
GRACE_NOTE_PREFIXES = ['A', 'E', 'I', 'O', 'U', 'S', 'B', 'X']  // uppercase grace notes

// The pitch character itself (always present, always one character)
PITCH_CHARS = [
    'a', 'e', 'i', 'o', 'u', 'r', 's', 't',  // pitched (middle octave)
    'b', 'x', 'y',                              // reyong specials
    'G', 'P', 'T',                              // gong strokes
    '-', '.',                                   // duration / silence
    '(', ')', '*', '0', '8', '9'               // kendang strokes
]

// Modifiers that appear AFTER the pitch character
OCTAVE_MODIFIERS   = [',', '<']               // octave 0 and octave 2
STROKE_MODIFIERS   = ['/', '?', ';', ':', '[', ']']  // damped, mute, tremolo, etc.
PATTERN_MODIFIERS  = ['n']                    // norot — appears AFTER pitch character
```

---

## Canonical Ordering

The normalised order of characters within a symbol is:

```
[grace note prefix A/E/I/O/U/S/B/X]{0,1} [pitch char]{1} [octave ,/<]{0,1} [stroke or pattern modifier //?/;/:/[/]/n]{0,1}
Where {0,1} means zero or one occurrence and {1} means exactly one occurrence
```

1. Grace note prefix (BEFORE — uppercase character equivalent of a melodic pitch)
2. Pitch character (always present)
3. Octave modifier (`,` or `<`)
4. Stroke/articulation modifiers (`/`, `?`, `;`, `:`, `[`, `]`)
5. Pattern modifiers (`n` — norot)

---

## Where This Lives

- **File**: `shared/NoteObject.ts`
- **Reason**: Used by both frontend (editor input handling, cursor management) and potentially backend (validation). Placing it in `shared/` gives both sides access to the same implementation.
- The character set constants (`PITCH_CHARS`, `AFTER_MODIFIERS`, etc.) also live here and replace any duplicated sets currently defined in the frontend.

---

## Relationship to the Virtual Cursor Editor

The `NoteObject` class is the foundation for the planned virtual cursor editor (phase 2 of the editor refactoring). The editor will maintain state as `NoteObject[]` rather than a raw string, with a cursor index into that array. Key interactions:

- **Typing a pitch character** → opens a new `NoteObject`, appends to array
- **Typing an AFTER modifier** → attaches to the current (most recent) `NoteObject` by reconstructing it with the new character added, then re-normalising
- **Backspace** → removes the last `NoteObject` entirely (not just the last character)
- **Arrow keys** → move the cursor index by whole `NoteObject` steps

The `parseStaff` static method handles converting existing staff strings (from the database) into `NoteObject[]` arrays for editing. `serialiseStaff` converts back for storage.

---

## What Is NOT Yet Implemented

- The virtual cursor editor that uses `NoteObject[]` as its state. See CLAUDE.virtual-editor.md

