// Guided-tour step definitions (react-joyride v3). Targets are the `data-tour` anchors added in
// Phase 1, so steps are decoupled from CSS. Desktop only (mobile is out of scope for the tour).
//
// Phase 2 ships the "initial view" tour (no score loaded): main menu, dashboard, playback menu,
// player. Later phases add situational, action-driven steps — for conditional UI use a step
// `before` hook rather than a useEffect-driven stepIndex (see react-joyride docs).

import type { Step } from 'react-joyride'

export const initialViewSteps: Step[] = [
    {
        target: '[data-tour="main-menu"]',
        title: 'Main menu',
        content: 'Create, open, save and export scores here — and reach your account and settings.',
        placement: 'left'
    },
    {
        target: '[data-tour="dashboard"]',
        title: 'Status dashboard',
        content: 'Shows the current score, the playback position, validation warnings, and the local-save status.',
        placement: 'bottom'
    },
    {
        target: '[data-tour="playback-menu"]',
        title: 'Playback options',
        content: 'Pick which instrument the animation follows, the playback speed, and the cursor style.',
        placement: 'bottom'
    },
    {
        target: '[data-tour="view-toggle"]',
        title: 'View toggle',
        content: 'Switch between the Player and Editor view.',
        placement: 'bottom'
    },
    {
        target: '[data-tour="player"]',
        title: 'Player',
        content: 'Play, pause and rewind, and drag the slider to move through the piece.',
        placement: 'top'
    }
]
