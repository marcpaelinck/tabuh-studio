// Per-user app preferences (stored server-side as JSON on the user, applied on login).
// See CLAUDE.user-settings.md. All keys are optional — an unset key means "use the app default".

import type { KeyboardType } from '../config/config'
import type { PlaybackCursorStyle } from './animation'

// Phase 1: orchestra only. Phase 2 will add `{ type: 'group'; value: number }`.
export type ScoreFilterPref = { type: 'orchestra'; value: string }

export interface UserPreferences {
    /** Pre-selected filter in the "Open" drawer (a New score always starts deselected). */
    defaultScoreFilter?: ScoreFilterPref
    /** Focus option value applied when a score is opened. */
    defaultFocus?: string
    /** Whether the notation panel in the Animation component is shown by default. */
    notationVisibleByDefault?: boolean
    defaultCursorStyle?: PlaybackCursorStyle
    defaultKeyboard?: KeyboardType
}
