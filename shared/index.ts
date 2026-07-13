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

export { instrumentTypes } from './types/basetypes.ts'
export type { InstrumentType } from './types/basetypes.ts'

export { DEFAULT_KEMPLI } from './config/defaults.ts'

export { keyMaps } from './config/keymap.ts'

export {
    AFTER_MODIFIERS,
    ERROR_PITCH_CHAR,
    EXTENDING_CHAR,
    GRACE_NOTE_PREFIXES,
    KEMPLI_BEAT_CHAR,
    MUTING_CHAR,
    OCTAVE_MODIFIERS,
    PATTERN_MODIFIERS,
    PITCH_CHARS,
    SILENCE_EXTENDING_CHARS,
    SILENCE_MUTING_CHARS,
    SPACE_CHAR,
    STROKE_MODIFIERS
} from './constants/noteChars.ts'

export type { EditableKeyMapping, EditorAction, EditorActionType, KeyMapDefinition, Keystroke } from './types/keymap'
export { NoteObject, NoteObjectError } from './types/NoteObject'
export type { NoteObjectFault } from './types/NoteObject'
export type { Position, PositionGroup } from './types/position'
