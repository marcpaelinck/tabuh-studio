// Per-user app preferences (stored server-side as JSON on the user, applied on login).
// See CLAUDE.user-settings.md. All keys are optional — an unset key means "use the app default".

import type { Orchestra, Position } from '@tabuhstudio/shared/types/position'
import type { KeyboardType } from '../config/config'
import type { PlaybackCursorStyle } from './animation'

// An orchestra (by name) or a music group (by id) — never both.
export type ScoreFilterPref = { type: 'orchestra'; value: string } | { type: 'group'; value: number }

export interface UserPreferences {
    /** Pre-selected filter in the "Open" drawer (a New score always starts deselected). */
    defaultScoreFilter?: ScoreFilterPref
    /** Focus option value applied when a score is opened, per orchestra. */
    defaultFocusByOrchestra?: Partial<Record<Orchestra, string>>
    /** Whether the notation panel in the Animation component is shown by default. */
    notationVisibleByDefault?: boolean
    defaultCursorStyle?: PlaybackCursorStyle
    defaultKeyboard?: KeyboardType
    /** Default staff (position) order for new scores, per orchestra. Applied only to NEW scores. */
    defaultPositionOrderByOrchestra?: Partial<Record<Orchestra, Position[]>>
}
