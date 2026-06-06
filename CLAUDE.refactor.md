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
                                               // Note: 'n' was reclassified from
                                               // BEFORE to AFTER modifier
```

---

## Canonical Ordering

The normalised order of characters within a symbol is:

```
[grace note prefix A/E/I/O/U/S/B/X/G/P/T/(/)/*/0/8/9] [pitch char] [octave ,/<] [stroke modifiers //?/;/:/[/]] [pattern modifiers n]
```

1. Grace note prefix (BEFORE — uppercase character equivalent of a melodic pitch)
2. Pitch character (always present)
3. Octave modifier (`,` or `<`)
4. Stroke/articulation modifiers (`/`, `?`, `;`, `:`, `[`, `]`)
5. Pattern modifiers (`n` — norot)

---

## Proposed Class Implementation

```typescript
// Location: shared/index.ts

export const GRACE_NOTE_PREFIXES = new Set(['A', 'E', 'I', 'O', 'U', 'S', 'B', 'X'])
export const PITCH_CHARS = new Set([
    'a', 'e', 'i', 'o', 'u', 'r', 's', 't',
    'b', 'x', 'y',
    'G', 'P', 'T',
    '-', '.',
    '(', ')', '*', '0', '8', '9'
])
export const OCTAVE_MODIFIERS  = new Set([',', '<'])
export const STROKE_MODIFIERS  = new Set(['/', '?', ';', ':', '[', ']'])
export const PATTERN_MODIFIERS = new Set(['n'])
export const AFTER_MODIFIERS   = new Set([
    ...OCTAVE_MODIFIERS,
    ...STROKE_MODIFIERS,
    ...PATTERN_MODIFIERS
])

export class NoteObject {
    readonly fontChar: string       // normalised canonical string
    readonly pitch: string          // the pitch character
    readonly prefix: string         // grace note prefix (before pitch)
    readonly octave: ',' | '<' | '' // octave modifier if any
    readonly modifiers: string[]    // stroke modifiers in order
    readonly patterns: string[]     // pattern modifiers (norot etc.) in order

    constructor(input: string) {
        const chars = input.split('')

        let prefixChar = ''
        let pitchChar = ''
        let octaveChar = ''
        const strokeChars: string[] = []
        const patternChars: string[] = []

        for (const ch of chars) {
            if (!pitchChar && GRACE_NOTE_PREFIXES.has(ch)) {
                prefixChar = ch
            } else if (!pitchChar && PITCH_CHARS.has(ch)) {
                pitchChar = ch
            } else if (pitchChar && OCTAVE_MODIFIERS.has(ch)) {
                octaveChar = ch
            } else if (pitchChar && STROKE_MODIFIERS.has(ch)) {
                strokeChars.push(ch)
            } else if (pitchChar && PATTERN_MODIFIERS.has(ch)) {
                patternChars.push(ch)
            } else {
                console.warn(`NoteObject: unrecognised character '${ch}' in '${input}'`)
            }
        }

        this.prefix   = prefixChar
        this.pitch    = pitchChar
        this.octave   = octaveChar as ',' | '<' | ''
        this.modifiers = strokeChars
        this.patterns  = patternChars

        // Canonical ordering: prefix + pitch + octave + stroke modifiers + pattern modifiers
        this.fontChar = this.prefix + this.pitch + this.octave +
                        this.modifiers.join('') + this.patterns.join('')
    }

    // Convenience getters
    get isGraceNote(): boolean  { return GRACE_NOTE_PREFIXES.has(this.prefix) }
    get isDamped(): boolean     { return this.modifiers.includes('/') }
    get isMuted(): boolean      { return this.modifiers.includes('?') }
    get isTremolo(): boolean    { return this.modifiers.includes(';') }
    get isNorot(): boolean      { return this.patterns.includes('n') }
    get octaveNumber(): 0|1|2  {
        if (this.octave === ',') return 0
        if (this.octave === '<') return 2
        return 1
    }

    // Parse a full staff string into an array of NoteObjects.
    // A new pitch character always starts a new symbol.
    // BEFORE modifiers (grace note prefix) accumulate until a pitch char arrives.
    static parseStaff(staff: string): NoteObject[] {
        const result: NoteObject[] = []
        let current = ''
        for (const ch of staff) {
            if (PITCH_CHARS.has(ch) && current && !GRACE_NOTE_PREFIXES.has(current)) {
                // New pitch char starts a new symbol (unless current is a pending prefix)
                result.push(new NoteObject(current))
                current = ch
            } else {
                current += ch
            }
        }
        if (current) result.push(new NoteObject(current))
        return result
    }

    // Serialise an array of NoteObjects back to a staff string
    static serialiseStaff(notes: NoteObject[]): string {
        return notes.map(n => n.fontChar).join('')
    }

    toString(): string {
        return this.fontChar
    }
}
```

---

## Where This Lives

- **File**: `shared/index.ts`
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

- Integration of `NoteObject` into the save/load pipeline
- The virtual cursor editor that uses `NoteObject[]` as its state

The current codebase stores notation as flat `NoteSymbol[]` (alias for `string[]`) with no normalisation. `NoteObject` will be introduced as a second refactoring step after the data model simplification (`Measure[]` → flat `NoteSymbol[]`) is complete and verified.
