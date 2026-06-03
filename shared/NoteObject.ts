/**
 * NoteObject — immutable, normalised representation of a BaliMusic font symbol.
 */

import type {
    GracenotePrefix,
    OctaveModifier,
    PatternModifiers as PatternModifier,
    PitchChar,
    StrokeModifier
} from './noteChars.ts'
import { GRACE_NOTE_PREFIXES, OCTAVE_MODIFIERS, PATTERN_MODIFIERS, PITCH_CHARS, STROKE_MODIFIERS } from './noteChars.ts'
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
 *   and `symbol` is `'!'`.
 *
 * - `'invalidCasting'` — semantic error: the symbol is structurally valid but
 *   is not playable on the bound position (set by `castingRulesManager`). All
 *   decomposed properties are correctly populated; `symbol` retains the
 *   normalised form.
 *
 * In both cases the calling code (e.g. `tabuhParser`) is responsible for
 * substituting `'!'` in the `NoteSymbol[]` output when `error !== undefined`.
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

    /**
     * The canonical, normalised form of the symbol.
     *
     * - When `error === undefined` or `error === 'invalidCasting'`: the
     *   normalised character sequence, e.g. `'u,/'`.
     * - When `error === 'invalidSymbol'`: `'!'` (the symbol could not be
     *   parsed; no meaningful normalisation is possible).
     *
     * Always use `symbol` for storage, comparison, and rendering.
     */
    readonly symbol: string

    // --- Decomposed components ---

    /**
     * Grace note prefix character, or `''` if the note is not a grace note
     * (or if `error === 'invalidSymbol'`).
     */
    readonly prefix: GracenotePrefix

    /**
     * The pitch character.
     * Empty string `''` when `error === 'invalidSymbol'`.
     */
    readonly pitch: PitchChar

    /**
     * Octave modifier: `','` (lower, octave 0), `'<'` (upper, octave 2),
     * or `''` (middle, octave 1 — also the fallback for `'invalidSymbol'`).
     */
    readonly octave: OctaveModifier

    /**
     * Single stroke / articulation modifier character (`/ ? ; : [ ]`),
     * or `''` if none (or if `error === 'invalidSymbol'`).
     */
    readonly stroke: StrokeModifier

    /**
     * Single pattern modifier character (currently only `'n'` for norot),
     * or `''` if none (or if `error === 'invalidSymbol'`).
     */
    readonly pattern: PatternModifier

    // --- Binding ---

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
     * Check `note.error !== undefined` to decide whether to substitute `'!'`
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

    /** True if the note has a grace note prefix. */
    readonly hasGraceNote: boolean

    /** True if the stroke modifier is `'/'` (damped). */
    readonly isDamped: boolean

    /** True if the stroke modifier is `'?'` (muted). */
    readonly isMuted: boolean

    /** True if the stroke modifier is `';'` or `':'` (tremolo). */
    readonly isTremolo: boolean

    /** True if the pattern modifier is `'n'` (norot). */
    readonly isNorot: boolean

    /** Octave as a number: `0` (lower), `1` (middle), `2` (upper). */
    readonly octaveNumber: 0 | 1 | 2

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
    constructor(input: string, position?: Position, fault?: NoteObjectFault) {
        this.inputSymbol = input
        this.position = position
        this.isBound = position !== undefined

        // Attempt structural parsing regardless of any supplied fault, so that
        // decomposed properties are populated whenever the symbol is parseable.
        let prefix = ''
        let pitch = ''
        let octave: OctaveModifier = ''
        let stroke = ''
        let pattern = ''
        let structurallyValid = true

        try {
            NoteObject.validate(input, position)

            for (const ch of input) {
                if (GRACE_NOTE_PREFIXES.has(ch)) {
                    prefix = ch
                } else if (PITCH_CHARS.has(ch)) {
                    pitch = ch
                } else if (OCTAVE_MODIFIERS.has(ch)) {
                    octave = ch as OctaveModifier
                } else if (STROKE_MODIFIERS.has(ch)) {
                    stroke = ch
                } else if (PATTERN_MODIFIERS.has(ch)) {
                    pattern = ch
                }
            }
        } catch {
            structurallyValid = false
        }

        if (!structurallyValid) {
            // Structural error takes precedence over any externally supplied fault.
            this.error = 'invalidSymbol'
            this.prefix = ''
            this.pitch = ''
            this.octave = ''
            this.stroke = ''
            this.pattern = ''
            this.symbol = '!'
        } else {
            // Symbol is structurally valid; use the externally supplied fault (if any).
            this.error = fault
            this.prefix = prefix
            this.pitch = pitch
            this.octave = octave
            this.stroke = stroke
            this.pattern = pattern
            this.symbol = prefix + pitch + octave + stroke + pattern
        }

        this.hasGraceNote = this.prefix !== ''
        this.isDamped = this.stroke === '/'
        this.isMuted = this.stroke === '?'
        this.isTremolo = this.stroke === ';' || this.stroke === ':'
        this.isNorot = this.pattern === 'n'
        this.octaveNumber = this.octave === ',' ? 0 : this.octave === '<' ? 2 : 1

        Object.freeze(this)
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
     * Notes with `error !== undefined` are serialised as `'!'`.
     */
    static toNotation(notes: NoteObject[]): string[] {
        return notes.map((n) => (n.error !== undefined ? '!' : n.symbol))
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
     * Returns `symbol`, or `'!'` if this note has an error.
     * This matches the serialisation behaviour of `toNotation()`.
     */
    toString(): string {
        return this.error !== undefined ? '!' : this.symbol
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
