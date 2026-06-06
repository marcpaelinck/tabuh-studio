/**
 * BaliMusic font character sets.
 *
 * These sets define every valid character in a BaliMusic font symbol and the
 * role each character plays within that symbol. They are the single source of
 * truth for character classification across the application.
 *
 * Import from `@tabuhstudio/shared` — do not duplicate these in other modules.
 */

/** Uppercase characters that prefix a grace note. Always appear before the pitch character. */
// prettier-ignore
export const GRACE_NOTE_PREFIXES: ReadonlySet<string> = new Set([
  "A",  "E",  "I",  "O",  "U",  "S",  "B",  "X",]);

/**
 * Every character that can serve as the main pitch character of a symbol.
 *
 * - Pitched notes (middle octave): `a e i o u r s t`
 * - Reyong specials: `b x y`
 * - Gong strokes: `G P T`
 * - Duration / silence: `- .`
 * - Kendang strokes: `( ) * 0 8 9`
 */
// prettier-ignore
export const PITCH_CHARS: ReadonlySet<string> = new Set([
  "a","e","i","o","u","r","s","t","b","x","y","G","P","T","-"," ", ".","(",")","*","0","8","9"
]);

/**
 * Octave modifier characters. Appear after the pitch character.
 *
 * - `,` lower octave (octave 0)
 * - `<` upper octave (octave 2)
 */
export const OCTAVE_MODIFIER_MAP: ReadonlyMap<string, number> = new Map([
    [',', -1],
    ['<', 1]
])
export const OCTAVE_MODIFIERS: ReadonlySet<string> = new Set(OCTAVE_MODIFIER_MAP.keys())

/**
 * Stroke / articulation modifier characters. Appear after the pitch character.
 * At most one stroke modifier is allowed per symbol.
 *
 * - `/` damped
 * - `?` mute
 * - `;` tremolo
 * - `:` tremolo accelerating
 * - `[` rake left
 * - `]` rake right
 */
export const STROKE_MODIFIER_MAP: ReadonlyMap<string, string> = new Map([
    ['/', 'damped'],
    ['?', 'muted'],
    ['_', 'halfduration'],
    [';', 'tremolo'],
    [':', 'acceleratingtremolo'],
    ['[', 'rakeleft'],
    [']', 'rakeright']
])
export const STROKE_MODIFIERS: ReadonlySet<string> = new Set(STROKE_MODIFIER_MAP.keys())
export const STROKE_MODIFIER_TYPES: ReadonlySet<string> = new Set(STROKE_MODIFIER_MAP.values())

/**
 * Pattern modifier characters. Appear after all other modifiers.
 * At most one pattern modifier is allowed per symbol.
 *
 * - `n` norot
 */
export const PATTERN_MODIFIER_MAP: ReadonlyMap<string, string> = new Map([['n', 'NOROT']])
export const PATTERN_MODIFIERS: ReadonlySet<string> = new Set(PATTERN_MODIFIER_MAP.keys())
export const PATTERN_MODIFIER_TYPES: ReadonlySet<string> = new Set(PATTERN_MODIFIER_MAP.values())

/** Union of all characters that may follow the pitch character. */
export const AFTER_MODIFIERS: ReadonlySet<string> = new Set([
    ...OCTAVE_MODIFIERS,
    ...STROKE_MODIFIERS,
    ...PATTERN_MODIFIERS
])

/** Union of all modifier characters (preceding or following) */
export const MODIFIER_CHARS: ReadonlySet<string> = new Set([...GRACE_NOTE_PREFIXES, ...AFTER_MODIFIERS])

/**
 * Generate types from the constants defined above.
 */
const _grace_note_prefixes_ = [...GRACE_NOTE_PREFIXES]
export type GracenoteChar = (typeof _grace_note_prefixes_)[number] | ''

const _pitch_chars_ = [...PITCH_CHARS]
export type PitchChar = (typeof _pitch_chars_)[number]

const _octave_mod_ = [...OCTAVE_MODIFIERS]
export type OctaveChar = (typeof _octave_mod_)[number] | ''

const _stroke_modifiers_ = [...STROKE_MODIFIERS]
export type StrokeModifier = (typeof _stroke_modifiers_)[number] | ''

const _stroke_modifier_types_ = [...STROKE_MODIFIER_TYPES]
export type StrokeType = (typeof _stroke_modifier_types_)[number] | ''

const _pattern_modifiers_ = [...PATTERN_MODIFIERS]
export type PatternModifier = (typeof _pattern_modifiers_)[number] | ''

const _pattern_modifier_types_ = [...PATTERN_MODIFIER_TYPES]
export type PatternType = (typeof _pattern_modifier_types_)[number] | ''
