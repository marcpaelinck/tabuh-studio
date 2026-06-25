/**
 * Tabuh Studio - shared types and utilities.
 *
 * This module is consumed by both the frontend and the backend.
 * It must not import from frontend-only or backend-only packages.
 *
 * Public API - import from `@tabuhstudio/shared`:
 *   - Position type                    (position.ts)
 *   - BaliMusic font character sets    (noteChars.ts)
 *   - NoteObject class, NoteObjectError, NoteObjectFault (NoteObject.ts)
 */

export type { Position } from './position.ts'

export {
    AFTER_MODIFIERS,
    GRACE_NOTE_PREFIXES,
    OCTAVE_MODIFIERS,
    PATTERN_MODIFIERS,
    PITCH_CHARS,
    STROKE_MODIFIERS
} from './constants/noteChars.ts'

export { NoteObject, NoteObjectError } from './types/NoteObject.ts'
export type { NoteObjectFault } from './types/NoteObject.ts'
