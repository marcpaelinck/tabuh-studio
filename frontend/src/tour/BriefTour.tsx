// The Phase-2 "brief" walkthrough of the initial view. Starts when the tour store's active tour
// is 'brief'; clears it when the tour ends.

import { useEffect } from 'react'
import { useJoyride } from 'react-joyride'
import { initialViewSteps } from './tourSteps'
import { useTourStore } from './useTourStore'

export function BriefTour() {
    const active = useTourStore((s) => s.active)
    const { controls, on, Tour } = useJoyride({
        continuous: true,
        steps: initialViewSteps,
        options: { zIndex: 10000, skipBeacon: true, buttons: ['back', 'close', 'primary', 'skip'] }
    })

    useEffect(() => {
        if (active === 'brief') controls.start()
    }, [active, controls])

    useEffect(() => on('tour:end', () => useTourStore.getState().setActive(null)), [on])

    return <>{Tour}</>
}
