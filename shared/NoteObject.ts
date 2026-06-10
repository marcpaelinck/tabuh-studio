/**
 * NoteObject — immutable, normalised representation of a BaliMusic font symbol.
 */

import { positionConfigs } from '../frontend/src/config/config.ts'
import { ERROR_PITCH_CHAR, SILENCE_EXTENDING_CHARS, SILENCE_MUTING_CHARS } from './noteChars'

import { noteRange } from '../frontend/src/utils/alphabet.ts'
import { debug } from '../frontend/src/utils/debugger.ts'
import type {
    GracenoteChar,
    OctaveChar,
    PatternModifier,
    PatternType,
    PitchChar,
    StrokeModifier,
    StrokeType
} from './noteChars.ts'
import {
    GRACE_NOTE_PREFIXES,
    MELODIC_PITCH_CHARS,
    OCTAVE_MODIFIERS,
    PATTERN_MODIFIER_MAP,
    PATTERN_MODIFIERS,
    PITCH_CHARS,
    SILENCE_CHARS,
    STROKE_MODIFIER_MAP,
    STROKE_MODIFIERS
} from './noteChars.ts'
import type { Position } from './position.ts'

// Re-export so that consumers can import everything from a single file if needed.
export {
    AFTER_MODIFIERS,
    GRACE_NOTE_PREFIXES,
    OCTAVE_MODIFIERS,
    PATTERN_MODIFIERS,
    PITCH_CHARS,
    STROKE_MODIFIERS
} from './noteChars.ts'

// ---------------------------------------------------------------------------
// NoteObjectFault
// ---------------------------------------------------------------------------

/**
 * The nature of a validation error recorded on a {@link NoteObject}.
 *
 * - `'invalidSymbol'`  — structural error: the input string contains
 *   unrecognised or incorrectly ordered characters. The NoteObject's
 *   decomposed properties (`pitch`, `octave`, …) hold empty fallback values
 *   and `symbol` is `ERROR_PITCH_CHAR`.
 *
 * - `'invalidCasting'` — semantic error: the symbol is structurally valid but
 *   is not playable on the bound position (set by `castingRulesManager`). All
 *   decomposed properties are correctly populated; `symbol` retains the
 *   normalised form.
 *
 * In both cases the calling code (e.g. `tabuhParser`) is responsible for
 * substituting `ERROR_PITCH_CHAR` in the `NoteSymbol[]` output when
 * `error !== undefined`.
 */
export type NoteObjectFault = 'invalidSymbol' | 'invalidCasting'

// ---------------------------------------------------------------------------
// NoteObject
// ---------------------------------------------------------------------------

/**
 * An immutable, normalised representation of a single BaliMusic font symbol.
 *
 * A symbol is the visual unit made up of one pitch character plus any
 * modifier characters (octave, stroke, pattern) that are superimposed on it
 * via the font's negative spacing. The same logical note can be written as
 * `u,/` or `u/,` — this class normalises them both to `u,/`.
 *
 * ## Canonical ordering
 * ```
 * [grace note prefix] [pitch] [octave ,/<] [stroke //?/;/:/[/]] [pattern n]
 * ```
 *
 * ## Error handling
 * The constructor never throws. Structural errors are caught internally and
 * recorded in the `error` property as `'invalidSymbol'`. Semantic errors
 * (symbol not playable on its bound position) are signalled by passing
 * `'invalidCasting'` as the third constructor argument — this is done by
 * `castingRulesManager` after position-specific validation.
 *
 * Use the static `validate()` method when you want strict validation that
 * throws on any error (e.g. in unit tests or guaranteed-valid editor input).
 *
 * ## Binding
 * A NoteObject can be *unbound* (`position === undefined`) or *bound* to a
 * specific instrument position (`position` is set). Use `isBound` as a quick
 * guard. Once set, the binding is immutable.
 *
 * ## Immutability
 * All properties are `readonly` and the object is frozen after construction.
 * Boolean flags are stored as precomputed `readonly` properties rather than
 * getters — equivalent in value for an immutable object, but directly
 * visible in the debugger and free of function-call overhead.
 */
export class NoteObject {
    // --- Raw and normalised strings ---

    /** The input string exactly as passed to the constructor. */
    readonly inputSymbol: string

    /** The canonical, normalised form of the symbol.
     * Use this value to compare note objects
     * **/
    readonly canonicalSymbol: string
    /**
     * The canonical, normalised form of the symbol.
     *
     * - When `error === undefined` or `error === 'invalidCasting'`: the
     *   normalised character sequence, e.g. `'u,/'`.
     * - When `error === 'invalidSymbol'`: `ERROR_PITCH_CHAR` (the symbol could not
     *   be parsed; no meaningful normalisation is possible).
     *
     * prefix: can currently only contain a grace note character
     * pitch: note pitch character. Empty string `''` when `error === 'invalidSymbol'`.
     * octave: Octave: `','` -> lower, octave -1, `'<'` -> upper, octave 1,
     *         or `''`-> middle, octave 0 — also the fallback for `'invalidSymbol'`).
     * modifier:  Single stroke / articulation modifier character:
     *                  '/': dampted
     *                  '?': muted
     *                  ';': tremolo
     *                  ':': accelerated tremolo
     *                  '[': rake left
     *                  ']': rake right
     *            or pattern:
     *                  'n': norot
     *            or `''` if none (or if `error === 'invalidSymbol'`).
     */
    readonly symbol: {
        prefix: string
        pitch: PitchChar
        octave: OctaveChar
        modifier: PatternModifier | StrokeModifier
    }

    /**
     * Grace note prefix character, or `''` if the note is not a grace note
     * (or if `error === 'invalidSymbol'`).
     */
    readonly graceNote?: { pitch: PitchChar; octave: OctaveChar }

    /**
     * Single stroke / articulation modifier character:
     *  '/': dampted
     *  '?': muted
     *  ';': tremolo
     *  ':': accelerated tremolo
     *  '[': rake left
     *  ']': rake right
     * or pattern:
     *  'n': norot
     * or `''` if none (or if `error === 'invalidSymbol'`).
     */
    readonly stroke: Record<StrokeType, boolean>
    readonly pattern: Record<PatternType, boolean>
    readonly hasStroke: boolean
    readonly hasPattern: boolean

    /**
     * The instrument position this note is bound to, or `undefined` if the
     * note is not bound to any specific position.
     */
    readonly position: Position | undefined

    // --- Fault ---

    /**
     * The validation error, if any.
     *
     * - `undefined`: no error — the symbol is structurally valid and (if bound)
     *   playable on its position.
     * - `'invalidSymbol'`: structural error detected during construction.
     * - `'invalidCasting'`: semantic error set externally by `castingRulesManager`.
     *
     * Check `note.error !== undefined` to decide whether to substitute `ERROR_PITCH_CHAR`
     * when converting back to `NoteSymbol[]`.
     */
    readonly error: NoteObjectFault | undefined

    // --- Precomputed boolean properties ---
    // Stored as readonly properties (not getters) because NoteObject is
    // immutable: the values never change after construction, so precomputing
    // them avoids repeated function-call overhead and makes each flag
    // directly visible in the debugger.

    /** True if this note is bound to a specific instrument position. */
    readonly isBound: boolean
    readonly isExtensionSilence: boolean
    readonly isMutingSilence: boolean
    readonly hasSample: boolean

    /** Octave as a number: `0` (lower), `1` (middle), `2` (upper). */
    readonly octaveNumber: -1 | 0 | 1

    // ---------------------------------------------------------------------------

    /**
     * @param input     The raw symbol string.
     * @param position  Optional instrument position to bind this note to.
     * @param fault     Optional fault to record. Pass `'invalidCasting'` when
     *   external position-specific validation (e.g. `castingRulesManager`) has
     *   determined the symbol is not playable on `position`. The symbol must
     *   still be structurally valid when `'invalidCasting'` is supplied; if it
     *   is not, `'invalidSymbol'` takes precedence.
     */
    constructor(input: string, position: Position | undefined, fault?: NoteObjectFault) {
        this.inputSymbol = input
        this.position = position
        this.isBound = position !== undefined
        this.isExtensionSilence = false
        this.isMutingSilence = false
        this.hasSample = false
        this.octaveNumber = 0

        // Attempt structural parsing regardless of any supplied fault, so that
        // decomposed properties are populated whenever the symbol is parseable.
        this.symbol = { prefix: '', pitch: '', octave: '', modifier: '' }
        let structurallyValid = true
        this.hasStroke = false
        this.hasPattern = false
        this.stroke = {
            damped: false,
            muted: false,
            halfduration: false,
            tremolo: false,
            acceleratingtremolo: false,
            rakeleft: false,
            rakeright: false
        }
        this.pattern = { norot: false }

        try {
            NoteObject.validate(input, position)

            for (const ch of input) {
                if (GRACE_NOTE_PREFIXES.has(ch)) {
                    this.symbol.prefix = ch as GracenoteChar
                    this.graceNote = { pitch: this.symbol.prefix[0].toLocaleLowerCase() as PitchChar, octave: '' }
                } else if (PITCH_CHARS.has(ch)) {
                    this.symbol.pitch = ch as PitchChar
                } else if (OCTAVE_MODIFIERS.has(ch)) {
                    this.symbol.octave = ch as OctaveChar
                } else if (STROKE_MODIFIERS.has(ch)) {
                    this.symbol.modifier = ch as StrokeModifier
                    this.hasStroke = true
                } else if (PATTERN_MODIFIERS.has(ch)) {
                    this.symbol.modifier = ch as PatternModifier
                    this.hasPattern = true
                }
            }
        } catch {
            structurallyValid = false
        }

        if (!structurallyValid) {
            // Structural error takes precedence over any externally supplied fault.
            this.error = 'invalidSymbol'
            this.symbol.pitch = ERROR_PITCH_CHAR
            this.canonicalSymbol = ERROR_PITCH_CHAR
            console.error(`invalid symbol '${input}' for ${position}`)
        } else {
            // Symbol is structurally valid; use the externally supplied fault (if any).
            this.error = fault

            this.canonicalSymbol = this.symbol.prefix + this.symbol.pitch + this.symbol.octave + this.symbol.modifier
            this.octaveNumber = this.symbol.octave === ',' ? -1 : this.symbol.octave === '<' ? 1 : 0
            const stroke = STROKE_MODIFIER_MAP.get(this.symbol.modifier as StrokeModifier)
            if (stroke) this.stroke[stroke] = true
            const pattern = PATTERN_MODIFIER_MAP.get(this.symbol.modifier as PatternModifier)
            if (pattern) this.stroke[pattern] = true

            this.isExtensionSilence = SILENCE_EXTENDING_CHARS.has(this.symbol.pitch)
            this.isMutingSilence = SILENCE_MUTING_CHARS.has(this.symbol.pitch)
            if (this.position) {
                const symbol = this.symbol.pitch + this.symbol.octave + this.symbol.modifier
                this.hasSample = symbol in positionConfigs[this.position].symbolToNoteNames
                if (!this.hasSample && !SILENCE_CHARS.has(symbol))
                    debug(`Sample not found for '${symbol}' on ${this.position}`)
            }

            Object.freeze(this)
        }
    }

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------

    /**
     * Validates a raw symbol string and throws `NoteObjectError` if invalid.
     *
     * Use this method when you need strict validation that fails loudly — for
     * example in unit tests or when processing input that is guaranteed to be
     * correct. For graceful error handling, prefer the constructor directly
     * (which records errors in the `error` property instead of throwing).
     *
     * Checks performed:
     * - Non-empty string
     * - Exactly one pitch character present
     * - At most one grace note prefix
     * - At most one octave modifier
     * - At most one stroke modifier
     * - At most one pattern modifier
     * - No unrecognised characters
     *
     * @param rawSymbol    The raw symbol string to validate.
     * @param position  Optional. Reserved for future position-specific
     *   validation: once valid-note sets per position are defined, this method
     *   will also verify the note is playable on the given instrument.
     */
    static validate(rawSymbol: string, position?: Position): void {
        if (!rawSymbol || rawSymbol.length === 0) {
            throw new NoteObjectError('empty symbol', rawSymbol ?? '')
        }

        let prefixCount = 0
        let octaveCount = 0
        let strokeCount = 0
        let patternCount = 0
        let hasPitch = false

        for (const ch of rawSymbol) {
            if (!hasPitch && GRACE_NOTE_PREFIXES.has(ch)) {
                prefixCount++
                if (prefixCount > 1) throw new NoteObjectError('symbol has multiple grace note prefixes', rawSymbol)
            } else if (!hasPitch && PITCH_CHARS.has(ch)) {
                hasPitch = true
            } else if (hasPitch && OCTAVE_MODIFIERS.has(ch)) {
                octaveCount++
                if (octaveCount > 1) throw new NoteObjectError('symbol has multiple octave modifiers', rawSymbol)
            } else if (hasPitch && STROKE_MODIFIERS.has(ch)) {
                strokeCount++
                if (strokeCount > 1) throw new NoteObjectError('symbol has multiple stroke modifiers', rawSymbol)
            } else if (hasPitch && PATTERN_MODIFIERS.has(ch)) {
                patternCount++
                if (patternCount > 1) throw new NoteObjectError('symbol has multiple pattern modifiers', rawSymbol)
                if (patternCount + strokeCount > 1)
                    throw new NoteObjectError('symbol has both stroke and pattern modifiers', rawSymbol)
            } else {
                throw new NoteObjectError(`unrecognised character '${ch}'`, rawSymbol)
            }
        }

        if (!hasPitch) throw new NoteObjectError('no pitch character found', rawSymbol)

        // TODO: position-specific validation.
        // When implemented, verify that `symbol` belongs to the set of notes
        // valid for `position` (derived from positionConfigs in config.ts).
        // The signature already accepts `position` for forward compatibility.
        if (position !== undefined) {
            void position
        }
    }

    // ---------------------------------------------------------------------------
    // Calculated values
    // ---------------------------------------------------------------------------

    /**
     * Determine the octave for the grace note (if it exists)
     * **/

    static isMelodic(pitch: PitchChar) {
        return pitch.length > 0 && MELODIC_PITCH_CHARS.has(pitch)
    }

    // Returns a new NoteObject where the grace note is resolved to the correct octave
    resolveGraceNoteOctave(): void {
        // Determine the correct octave for the grace note
        if (
            !this.graceNote ||
            !this.position ||
            NoteObject.isMelodic(this.symbol.pitch) ||
            NoteObject.isMelodic(this.graceNote.pitch)
        )
            return

        const pitchChar = this.symbol.prefix.toLocaleLowerCase()
        var nearestOctave = pitchChar // grace tone (note + octave) nearest to the 'main' tone.
        const instrumentRange = noteRange(this.position)
        const nextSymbolIndex = instrumentRange.indexOf(this.symbol.pitch)
        var shortestDistance = 99

        // Try different octavations and keep the value that is 'nearest' to the next this.
        const octaveOptions = new Set(['']).union(OCTAVE_MODIFIERS)
        for (const octaveChar of octaveOptions) {
            const tryNote = pitchChar + octaveChar
            if (instrumentRange.includes(tryNote)) {
                const tryDistance = Math.abs(instrumentRange.indexOf(tryNote) - nextSymbolIndex)
                if (tryDistance < shortestDistance) {
                    nearestOctave = octaveChar
                    shortestDistance = tryDistance
                }
            }
        }
        this.graceNote.octave = nearestOctave
    }

    // ---------------------------------------------------------------------------
    // Static factory / serialisation helpers
    // ---------------------------------------------------------------------------

    /**
     * Converts a flat `NoteSymbol[]` notation array into `NoteObject[]`.
     * Each element of the input array is treated as one complete symbol.
     * Invalid symbols produce NoteObjects with `error === 'invalidSymbol'`.
     *
     * @param notation  Flat notation array (one symbol string per element).
     * @param position  Optional position to bind every produced NoteObject to.
     */
    static fromNotation(notation: string[], position?: Position): NoteObject[] {
        return notation.map((sym) => new NoteObject(sym, position))
    }

    /**
     * Serialises `NoteObject[]` back to a `NoteSymbol[]` notation array.
     * Notes with `error !== undefined` are serialised as `ERROR_PITCH_CHAR`.
     */
    static toNotation(notes: NoteObject[]): string[] {
        return notes.map((n) => (n.error !== undefined ? ERROR_PITCH_CHAR : n.canonicalSymbol))
    }

    /**
     * Parses a raw concatenated text string (e.g. live editor input) into
     * `NoteObject[]`. A new symbol boundary is detected whenever a pitch
     * character or grace note prefix is encountered while the current
     * accumulator already contains a pitch character.
     * Invalid symbols produce NoteObjects with `error === 'invalidSymbol'`.
     *
     * @param text      Concatenated string of one or more symbols.
     * @param position  Optional position to bind every produced NoteObject to.
     */
    static parseText(text: string, position?: Position): NoteObject[] {
        const result: NoteObject[] = []
        let current = ''
        let hasPitch = false

        for (const ch of text) {
            const startsNewSymbol = hasPitch && (PITCH_CHARS.has(ch) || GRACE_NOTE_PREFIXES.has(ch))
            if (startsNewSymbol) {
                result.push(new NoteObject(current, position))
                current = ''
                hasPitch = false
            }
            current += ch
            if (PITCH_CHARS.has(ch)) hasPitch = true
        }

        if (current) result.push(new NoteObject(current, position))
        return result
    }

    // ---------------------------------------------------------------------------

    /**
     * Returns the canonical symbol string, or `ERROR_PITCH_CHAR` if this note has an error.
     * This matches the serialisation behaviour of `toNotation()`.
     */
    toString(): string {
        return this.error !== undefined ? ERROR_PITCH_CHAR : this.canonicalSymbol
    }
}

// ---------------------------------------------------------------------------
// NoteObjectError
// ---------------------------------------------------------------------------

/**
 * Thrown by `NoteObject.validate()` when a symbol string is invalid.
 * Carries the offending symbol in `invalidSymbol` for diagnostic use.
 *
 * Note: this is distinct from {@link NoteObjectFault}, which is the
 * non-throwing `error` property recorded on a `NoteObject` instance.
 */
export class NoteObjectError extends Error {
    readonly invalidSymbol: string

    constructor(reason: string, symbol: string) {
        super(`NoteObject: ${reason} in '${symbol}'`)
        this.name = 'NoteObjectError'
        this.invalidSymbol = symbol
    }
}
