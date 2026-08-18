// Shared building blocks for the guided tours: the step-definition shape, the "action step"
// helper (gate the UI, no forward button), a wait() before-hook, and the reusable *setup* steps
// that both the Player and Editor tours run first — close any open score, then open the
// Cendrawasih / GONG KEBYAR score from the browser. See useTourController for how a tour wires
// these into react-joyride and auto-advances them.

import type { Step } from 'react-joyride'

/** A tour step plus optional predicates controlling how it advances. */
export interface TourStepDef<S> {
    id: string
    step: Step
    /** When this returns true for the active step, the tour advances automatically. */
    advanceWhen?: (s: S) => boolean
    /**
     * Alternative to `advanceWhen` for "do it, then continue at your own pace" steps: the step is NOT
     * auto-advanced. Instead its Next (`primary`) button stays hidden until this returns true, after
     * which the user clicks Next themselves. The step's own `buttons` must omit `primary`.
     */
    gateNextWhen?: (s: S) => boolean
}

/** Fields the shared setup steps need from the live snapshot. Tour-specific snapshots extend this. */
export interface SetupSnapshot {
    /** Title of the currently loaded score (undefined = none open). */
    currentScoreTitle?: string
    /** Title of the score option just selected (set synchronously on click, before the drawer closes). */
    selectedScoreTitle?: string
    /** Selected-score title captured when the "select score" step was entered (to detect a new pick). */
    selectedScoreBaseline?: string
    /** Orchestra selected in the score-browser filter (null if a group is selected). */
    browserOrchestra: string | null
    /** Whether the desktop "Open" score drawer is open. */
    scoreBrowserOpen: boolean
}

// Action steps: block everything except the spotlighted control, no forward button (the action
// advances the tour), keep a Skip to bail out.
export function actionStep(step: Step): Step {
    return { overlayClickAction: false, dismissKeyAction: false, buttons: ['skip'], ...step }
}

// Delay before-hook for step highlighting. Use it to wait until drawers/panels are fully rendered
// so the step's target exists before joyride tries to position on it.
export function wait(ms: number) {
    return async () => {
        await new Promise((resolve) => setTimeout(resolve, ms))
    }
}

// The reusable "load a known score" prologue. Index 0 ("close") is conditional: a tour starts there
// only when a score is already open, otherwise it starts at index 1 ("open"). Both tours share the
// same 0/1 layout, so the start logic is identical (see useTourController).
export const setupSteps: TourStepDef<SetupSnapshot>[] = [
    {
        id: 'close',
        step: actionStep({
            target: '[data-tour="menu-close"]',
            title: 'Close the open score',
            content: 'A score is open. Close it first via Notation → Close (you can save it if you want).',
            placement: 'left'
        }),
        advanceWhen: (s) => !s.currentScoreTitle
    },
    {
        id: 'open',
        step: actionStep({
            target: '[data-tour="menu-open"]',
            title: 'Open a score',
            content: 'The Notation menu is open — click “Open…” to browse the score library.',
            placement: 'left'
        }),
        // Wait until the drawer is actually rendered (its orchestra selector is in the DOM), so the
        // next steps' targets exist before we advance — otherwise they'd be skipped as "not found".
        advanceWhen: (s) => s.scoreBrowserOpen && !!document.querySelector('[data-tour="open-orchestra"]')
    },
    {
        id: 'orchestra',
        step: actionStep({
            target: '[data-tour="open-orchestra"]',
            title: 'Choose an orchestra',
            content: 'Select the GONG KEBYAR orchestra to filter the list.',
            placement: 'right',
            before: wait(300),
            // High zIndex puts the dialog on top of the drawer.
            zIndex: 100000
        }),
        advanceWhen: (s) => s.browserOrchestra === 'GONG_KEBYAR'
    },
    {
        id: 'selectScore',
        step: actionStep({
            target: '[data-option-label="Cendrawasih"]',
            title: 'Pick a score',
            content: 'Select “Cendrawasih” from the list to load it.',
            placement: 'right',
            before: wait(300),
            zIndex: 100000
        }),
        // Advance on a NEW selection of Cendrawasih (compared to when the step started), so a
        // pre-existing selection doesn't skip the step. Uses the selection (immediate) rather than
        // the loaded score, to move on before the drawer closes and the list target disappears.
        advanceWhen: (s) => s.selectedScoreTitle === 'Cendrawasih' && s.selectedScoreTitle !== s.selectedScoreBaseline
    }
]
