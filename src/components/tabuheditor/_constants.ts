import type { EditorCellCursor, EditorBeatCursor } from '../../models/types'

export const noCursor: EditorCellCursor = { system: -1, position: '', measure: -1 }
export const noBeatCursor: EditorBeatCursor = { system: -1, beat: -1 }
