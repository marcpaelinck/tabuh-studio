// Hands-on "Player" tour: state-aware, action-driven steps. It runs the shared setup prologue
// (close/open/orchestra/selectScore — see tourShared.ts) and then the Player-specific steps below.
// Each action step gates the UI (only the spotlighted control is usable) and auto-advances when the
// app state shows the action was done (see useTourController's watcher). Steps without an
// `advanceWhen` use the normal Next/Done button.
//
// Assumptions (data-dependent): a score titled "Cendrawasih" exists in the GONG KEBYAR repertoire,
// and it has a PEMADE part and a panggul in its SVG. See CLAUDE.user-onboarding.md — the plan is to
// ship dedicated read-only tour scores so these assumptions always hold.

import { useUserSelectionStore, type MainView } from '../stores/useUserSettingsStore'
import { actionStep, setupSteps, type SetupSnapshot, type TourStepDef } from './tourShared'

/** Live snapshot passed to the Player tour's per-step advance predicates. */
export interface PlayerSnapshot extends SetupSnapshot {
    currentView: MainView
    focusValue: string
    notationVisible: boolean
    cursorStyle: string
    speedFactor: number // objValue of the speed option (1 = 100%)
    playbackPlaying: boolean
    // Baselines captured when a step is entered, so a step advances on an actual user *transition*
    // rather than because its end state happened to be true already.
    cursorBaseline: string
    notationBaseline: boolean
    speedBaseline: number
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

// Player-specific steps, appended after the shared setup prologue.
const playerSteps: TourStepDef<PlayerSnapshot>[] = [
    {
        // Conditional step: request switching to the Player mode if the Editor mode is selected.
        // Auto-skips (advanceWhen already true) when the Player view is active.
        id: 'playerView',
        step: actionStep({
            target: '[data-tour="view-toggle"]',
            title: 'Select the Player view',
            content: 'The view selector is currently set to the Editor view. Switch it to the Player view.',
            placement: 'left'
        }),
        advanceWhen: (s) => s.currentView.toLowerCase() === 'player'
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
            content: 'Start playback with the play button and wait a few seconds for the playback start up.',
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

export const handsOnSteps: TourStepDef<PlayerSnapshot>[] = [...setupSteps, ...playerSteps]
