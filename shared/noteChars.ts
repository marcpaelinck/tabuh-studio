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
  "a","e","i","o","u","r","s","t","b","x","y","G","P","T","-",".","(",")","*","0","8","9"
]);

/**
 * Octave modifier characters. Appear after the pitch character.
 *
 * - `,` lower octave (octave 0)
 * - `<` upper octave (octave 2)
 */
export const OCTAVE_MODIFIERS: ReadonlySet<string> = new Set([",", "<"]);

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
// prettier-ignore
export const STROKE_MODIFIERS: ReadonlySet<string> = new Set([
  "/", "?", ";", ":", "[", "]"
]);

/**
 * Pattern modifier characters. Appear after all other modifiers.
 * At most one pattern modifier is allowed per symbol.
 *
 * - `n` norot
 */
export const PATTERN_MODIFIERS: ReadonlySet<string> = new Set(["n"]);

/** Union of all characters that may follow the pitch character. */
export const AFTER_MODIFIERS: ReadonlySet<string> = new Set([
  ...OCTAVE_MODIFIERS,
  ...STROKE_MODIFIERS,
  ...PATTERN_MODIFIERS,
]);
