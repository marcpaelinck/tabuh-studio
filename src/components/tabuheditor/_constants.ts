import type { EditorBeatCursor, EditorCellCursor } from '../../models/types'

export const noCursor: EditorCellCursor = { sysIdx: -1, position: '', measure: -1 }
export const noBeatCursor: EditorBeatCursor = { system: -1, beat: -1 }
