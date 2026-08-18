// The Phase-3 hands-on Player tour. Thin wrapper: it rebuilds the live PlayerSnapshot from its
// store subscriptions each render and hands the steps + snapshot to useTourController, which owns
// the react-joyride wiring and auto-advance. Baselines (captured on step entry) live in refs here.

import { useRef } from 'react'
import { useScoreStore } from '../stores/useScoreStore'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'
import { handsOnSteps, type PlayerSnapshot } from './playerTourSteps'
import { useTourController } from './useTourController'
import { useTourStore } from './useTourStore'

export function HandsOnTour() {
    const { scoreBrowserOpen, browserOrchestra, playbackPlaying } = useTourStore()

    const currentScore = useScoreStore((s) => s.currentScore)
    const {
        selectedScoreOption,
        selectedFocusOption,
        notationVisible,
        selectedCursorStyle,
        selectedSpeedOption,
        mainView
    } = useUserSelectionStore()

    const cursorBaselineRef = useRef<string>('')
    const scoreBaselineRef = useRef<string | undefined>(undefined)
    const notationBaselineRef = useRef<boolean>(false)
    const speedBaselineRef = useRef<number>(1)

    const snapshot: PlayerSnapshot = {
        currentScoreTitle: currentScore?.title,
        selectedScoreTitle: selectedScoreOption?.objValue?.title,
        selectedScoreBaseline: scoreBaselineRef.current,
        browserOrchestra,
        scoreBrowserOpen,
        currentView: mainView,
        focusValue: selectedFocusOption.value,
        notationVisible,
        cursorStyle: selectedCursorStyle,
        speedFactor: selectedSpeedOption.objValue,
        playbackPlaying,
        cursorBaseline: cursorBaselineRef.current,
        notationBaseline: notationBaselineRef.current,
        speedBaseline: speedBaselineRef.current
    }

    const Tour = useTourController<PlayerSnapshot>({
        tourId: 'handsOn',
        steps: handsOnSteps,
        snapshot,
        // Open the Notation submenu first so "Close…"/"Open…" are visible; reset the signals so a
        // stale value from a previous run can't auto-advance an early step.
        onStart: () => {
            const t = useTourStore.getState()
            t.setScoreBrowserOpen(false)
            t.setBrowserOrchestra(null)
            t.setPlaybackPlaying(false)
            t.requestMenu('0')
        },
        onEnd: () => useTourStore.getState().requestMenu(null),
        // Step 0 ("close") is conditional: start there only if a score is already open, otherwise
        // skip straight to "open" (step 1).
        startIndex: () => (useScoreStore.getState().currentScore ? 0 : 1),
        onStepBefore: (id) => {
            const sel = useUserSelectionStore.getState()
            if (id === 'cursor') cursorBaselineRef.current = sel.selectedCursorStyle
            else if (id === 'selectScore') scoreBaselineRef.current = sel.selectedScoreOption?.objValue?.title
            else if (id === 'notationOff' || id === 'notationOn') notationBaselineRef.current = sel.notationVisible
            else if (id === 'speedChange') speedBaselineRef.current = sel.selectedSpeedOption.objValue
        }
    })

    return <>{Tour}</>
}
