// Hands-on "Player" tour: state-aware, action-driven steps. Each step gates the UI (only the
// spotlighted control is usable) and auto-advances when the app state shows the action was done
// (see HandsOnTour's watcher). Steps without an `advanceWhen` use the normal Next/Done button.
//
// Assumptions (data-dependent): a score titled "Cendrawasih" exists in the GONG KEBYAR
// repertoire, and it has a PEMADE part and a panggul in its SVG. Simplifications for this first
// iteration: the orchestra step is a single "select GONG KEBYAR" (not the switch-and-back-again
// demo); the animation and slider steps advance with the Next/Done button.

import type { Step } from 'react-joyride'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'

/** Live snapshot passed to the per-step advance predicates. */
export interface TourSnapshot {
    currentScoreTitle?: string
    /** Title of the score option just selected (set synchronously on click, before the drawer closes). */
    selectedScoreTitle?: string
    focusValue: string
    notationVisible: boolean
    cursorStyle: string
    speedFactor: number // objValue of the speed option (1 = 100%)
    browserOrchestra: string | null
    scoreBrowserOpen: boolean
    playbackPlaying: boolean
    // Baselines captured when a step is entered, so a step advances on an actual user *transition*
    // rather than because its end state happened to be true already.
    cursorBaseline: string
    /** Selected-score title captured when the "select score" step was entered (to detect a new pick). */
    selectedScoreBaseline?: string
    notationBaseline: boolean
    speedBaseline: number
}

export interface HandsOnStep {
    id: string
    step: Step
    /** When this returns true for the active step, the tour advances automatically. */
    advanceWhen?: (s: TourSnapshot) => boolean
}

// Action steps: block everything except the spotlighted control, no forward button (the action
// advances the tour), keep a Skip to bail out.
function actionStep(step: Step): Step {
    return { overlayClickAction: false, dismissKeyAction: false, buttons: ['skip'], ...step }
}

// Delay function for the step highlighting.
// Should be used to wait until drawers are fully opened.
function wait(ms: number) {
    return async () => {
        await new Promise((resolve) => setTimeout(resolve, ms))
    }
}

// Live explanation of the currently selected animation (panggul) option.
function PanggulExplanation() {
    const value = useUserSelectionStore((s) => s.selectedPanggulOption?.value)
    const text =
        value === 'Panggul'
            ? 'Panggul + highlight: shows the mallet animation and highlights the played note.'
            : value === 'Highlight'
              ? 'Highlight only: highlights the played note without the mallet animation.'
              : value
                ? `Follows the “${value}” panggul.`
                : 'Pick an option to see what it does.'
    return (
        <div>
            <p>Try the different values of the “animation” selector.</p>
            <p className="mt-2 text-sm text-gray-600">{text}</p>
        </div>
    )
}

export const handsOnSteps: HandsOnStep[] = [
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
            // High zIndex puts the dialog on top of the drawer.
            zIndex: 100000
        }),
        // Advance on a NEW selection of Cendrawasih (compared to when the step started), so a
        // pre-existing selection doesn't skip the step. Uses the selection (immediate) rather than
        // the loaded score, to move on before the drawer closes and the list target disappears.
        advanceWhen: (s) => s.selectedScoreTitle === 'Cendrawasih' && s.selectedScoreTitle !== s.selectedScoreBaseline
    },
    {
        id: 'focus',
        step: actionStep({
            target: '[data-tour="pb-focus"]',
            title: 'Focus',
            content: 'Set the focus to PEMADE — the animation will follow that instrument.',
            placement: 'right',
            disableFocusTrap: true
        }),
        advanceWhen: (s) => s.focusValue.toLowerCase() === 'pemade'
    },
    {
        id: 'notationOff',
        step: actionStep({
            target: '[data-tour="notation-toggle"]',
            title: 'Notation panel',
            content: 'Toggle the “notation” switch — the notation panel hides or shows.',
            placement: 'top'
        }),
        // Require an actual toggle (change from the value when the step began).
        advanceWhen: (s) => s.notationVisible !== s.notationBaseline
    },
    {
        id: 'notationOn',
        step: actionStep({
            target: '[data-tour="notation-toggle"]',
            title: 'Notation panel',
            content: 'Toggle it once more to bring the notation back.',
            placement: 'top'
        }),
        advanceWhen: (s) => s.notationVisible !== s.notationBaseline
    },
    {
        id: 'play',
        step: actionStep({
            target: '[data-tour="player-play"]',
            title: 'Play',
            content: 'Start playback with the play button.',
            placement: 'top'
        }),
        advanceWhen: (s) => s.playbackPlaying
    },
    {
        id: 'cursor',
        step: {
            target: '[data-tour="pb-cursor"]',
            title: 'Cursor style',
            content: "Change the cursor style and watch how the notation's highlight changes.",
            placement: 'right'
        }
    },
    {
        id: 'animation',
        step: {
            target: '[data-tour="panggul-selector"]',
            title: 'Animation',
            content: <PanggulExplanation />,
            placement: 'right'
        }
    },
    {
        id: 'speedChange',
        step: actionStep({
            target: '[data-tour="pb-speed"]',
            title: 'Speed',
            content: 'Change the playback speed.',
            placement: 'right'
        }),
        // Require a real change from the speed when the step began (not just "not 100%").
        advanceWhen: (s) => s.speedFactor !== s.speedBaseline
    },
    {
        id: 'speedReset',
        step: actionStep({
            target: '[data-tour="pb-speed"]',
            title: 'Speed',
            content: 'Now set it back to 100%.',
            placement: 'right'
        }),
        advanceWhen: (s) => s.speedFactor === 1
    },
    {
        id: 'slider',
        step: {
            target: '[data-tour="player-seek"]',
            title: 'Seek',
            content: 'Drag the slider to jump to another position, then click Last.',
            placement: 'top'
        }
    }
]
