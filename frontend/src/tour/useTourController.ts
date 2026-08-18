// Shared driver for the guided tours. Uncontrolled react-joyride: Joyride owns the step index, but
// for action steps we hide the Next button and call controls.next() ourselves once the live app
// state shows the step's action was done. Each tour supplies its steps, a freshly-rebuilt snapshot
// (from its own store subscriptions), and hooks for start / end / per-step baseline capture.

import { useEffect, useRef } from 'react'
import { useJoyride, type ButtonType } from 'react-joyride'
import type { TourStepDef } from './tourShared'
import { useTourStore, type TourId } from './useTourStore'

type JoyrideConfig = NonNullable<Parameters<typeof useJoyride>[0]>

interface TourControllerParams<S> {
    tourId: TourId
    steps: TourStepDef<S>[]
    /** Live snapshot rebuilt by the component each render from its store subscriptions. */
    snapshot: S
    /** react-joyride options, merged over { skipBeacon: true }. */
    options?: JoyrideConfig['options']
    /** Index to start at (evaluated when the tour starts). Default 0. */
    startIndex?: () => number
    /** Runs once when the tour starts, before controls.start (reset signals, open a submenu…). */
    onStart?: () => void
    /** Runs when the tour ends (cleanup). setActive(null) is always called afterwards. */
    onEnd?: () => void
    /** Runs on entering each step — capture per-step baselines here. */
    onStepBefore?: (stepId: string | undefined) => void
}

export function useTourController<S>({
    tourId,
    steps,
    snapshot,
    options,
    startIndex,
    onStart,
    onEnd,
    onStepBefore
}: TourControllerParams<S>) {
    const active = useTourStore((s) => s.active)
    // Rebuilt each render (cheap): a `gateNextWhen` step reveals its Next (`primary`) button only once
    // its predicate holds, so the user can act at their own pace and then click Next. Non-gated steps
    // keep a stable object identity; joyride deep-compares steps, so this only pushes an update when a
    // gated step's buttons actually change.
    const joyrideSteps = steps.map((def) => {
        if (!def.gateNextWhen) return def.step
        const base = def.step.buttons ?? []
        const buttons: ButtonType[] =
            def.gateNextWhen(snapshot) && !base.includes('primary') ? [...base, 'primary'] : base
        return { ...def.step, buttons }
    })
    const { controls, state, on, Tour } = useJoyride({
        continuous: true,
        steps: joyrideSteps,
        options: { skipBeacon: true, ...options }
    })
    const advancedRef = useRef<number>(-1)

    // Start when this tour becomes active.
    useEffect(() => {
        if (active === tourId) {
            advancedRef.current = -1
            onStart?.()
            controls.start(startIndex ? startIndex() : 0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, controls])

    // End cleanup.
    useEffect(
        () =>
            on('tour:end', () => {
                onEnd?.()
                const t = useTourStore.getState()
                t.setMainMenuActiveItem('')
                t.setActive(null)
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [on]
    )

    // Per-step baseline capture (so a pre-existing value doesn't satisfy the step on entry).
    useEffect(
        () =>
            on('step:before', (data) => {
                onStepBefore?.(steps[data.index]?.id)
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [on]
    )

    // Auto-advance the current action step once its predicate is satisfied.
    useEffect(() => {
        if (state.status !== 'running' || state.lifecycle !== 'tooltip') return
        const def = steps[state.index]
        if (!def?.advanceWhen || advancedRef.current === state.index) return
        if (def.advanceWhen(snapshot)) {
            advancedRef.current = state.index
            controls.next()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.index, state.status, state.lifecycle, snapshot, controls])

    return Tour
}
