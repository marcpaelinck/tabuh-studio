// The Phase-3 hands-on Player tour. Uncontrolled react-joyride: Joyride owns the index, but for
// action steps we hide the Next button and call controls.next() ourselves when the app state
// shows the step's action was completed. Situational, gated, action-driven.

import { useEffect, useMemo, useRef } from 'react'
import { useJoyride } from 'react-joyride'
import { useScoreStore } from '../stores/useScoreStore'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'
import { handsOnSteps, type TourSnapshot } from './playerTourSteps'
import { useTourStore } from './useTourStore'

export function HandsOnTour() {
    const active = useTourStore((s) => s.active)
    const scoreBrowserOpen = useTourStore((s) => s.scoreBrowserOpen)
    const browserOrchestra = useTourStore((s) => s.browserOrchestra)
    const playbackPlaying = useTourStore((s) => s.playbackPlaying)

    const currentScore = useScoreStore((s) => s.currentScore)
    const selectedScoreOption = useUserSelectionStore((s) => s.selectedScoreOption)
    const selectedFocusOption = useUserSelectionStore((s) => s.selectedFocusOption)
    const notationVisible = useUserSelectionStore((s) => s.notationVisible)
    const selectedCursorStyle = useUserSelectionStore((s) => s.selectedCursorStyle)
    const selectedSpeedOption = useUserSelectionStore((s) => s.selectedSpeedOption)

    const joyrideSteps = useMemo(() => handsOnSteps.map((h) => h.step), [])
    const { controls, state, on, Tour } = useJoyride({
        continuous: true,
        steps: joyrideSteps,
        options: { /*zIndex: 10000,*/ skipBeacon: true }
    })

    const cursorBaselineRef = useRef<string>('')
    const scoreBaselineRef = useRef<string | undefined>(undefined)
    const notationBaselineRef = useRef<boolean>(false)
    const speedBaselineRef = useRef<number>(1)
    const advancedRef = useRef<number>(-1)

    // Start when this tour becomes active; open the Notation submenu first so "Open…" is visible.
    // Reset the tour signals so stale values from a previous run don't auto-advance early steps.
    useEffect(() => {
        if (active === 'handsOn') {
            advancedRef.current = -1
            const t = useTourStore.getState()
            t.setScoreBrowserOpen(false)
            t.setBrowserOrchestra(null)
            t.setPlaybackPlaying(false)
            t.requestMenu('0')
            controls.start()
        }
    }, [active, controls])

    // On end: release the menu request and clear the active tour.
    useEffect(
        () =>
            on('tour:end', () => {
                useTourStore.getState().requestMenu(null)
                useTourStore.getState().setActive(null)
            }),
        [on]
    )

    // Capture per-step baselines on entry, so a pre-existing value doesn't satisfy the step.
    useEffect(
        () =>
            on('step:before', (data) => {
                const id = handsOnSteps[data.index]?.id
                const sel = useUserSelectionStore.getState()
                if (id === 'cursor') {
                    cursorBaselineRef.current = sel.selectedCursorStyle
                } else if (id === 'selectScore') {
                    scoreBaselineRef.current = sel.selectedScoreOption?.objValue?.title
                } else if (id === 'notationOff' || id === 'notationOn') {
                    notationBaselineRef.current = sel.notationVisible
                } else if (id === 'speedChange') {
                    speedBaselineRef.current = sel.selectedSpeedOption.objValue
                }
            }),
        [on]
    )

    // Auto-advance the current action step when its condition is satisfied.
    useEffect(() => {
        if (state.status !== 'running' || state.lifecycle !== 'tooltip') return
        const def = handsOnSteps[state.index]
        if (!def?.advanceWhen || advancedRef.current === state.index) return

        const snapshot: TourSnapshot = {
            currentScoreTitle: currentScore?.title,
            selectedScoreTitle: selectedScoreOption?.objValue?.title,
            focusValue: selectedFocusOption.value,
            notationVisible,
            cursorStyle: selectedCursorStyle,
            speedFactor: selectedSpeedOption.objValue,
            browserOrchestra,
            scoreBrowserOpen,
            playbackPlaying,
            cursorBaseline: cursorBaselineRef.current,
            selectedScoreBaseline: scoreBaselineRef.current,
            notationBaseline: notationBaselineRef.current,
            speedBaseline: speedBaselineRef.current
        }
        if (def.advanceWhen(snapshot)) {
            advancedRef.current = state.index
            controls.next()
        }
    }, [
        state.index,
        state.status,
        state.lifecycle,
        currentScore,
        selectedScoreOption,
        selectedFocusOption,
        notationVisible,
        selectedCursorStyle,
        selectedSpeedOption,
        browserOrchestra,
        scoreBrowserOpen,
        playbackPlaying,
        controls
    ])

    return <>{Tour}</>
}
