// Guided-tour boilerplate (react-joyride v3, uncontrolled). Renders a "?" launch button plus the
// tour element. Uncontrolled mode lets Joyride own the step index and the Next/Back/Skip buttons;
// later phases can add per-step `before` hooks for situational, action-driven steps without
// switching to controlled mode. Rendered inside the desktop layout only.

import { BsQuestionCircle } from 'react-icons/bs'
import { useJoyride } from 'react-joyride'
import { IconButton } from 'rsuite'
import { Tip } from '../components/Tooltipped'
import { initialViewSteps } from './tourSteps'

export function GuidedTour() {
    const { controls, Tour } = useJoyride({
        continuous: true,
        steps: initialViewSteps,
        // zIndex sits above rsuite drawers/popovers; skipBeacon starts straight on the tooltip.
        options: { zIndex: 10000, skipBeacon: true, buttons: ['back', 'close', 'primary', 'skip'] }
    })

    return (
        <>
            <Tip tip="Take a guided tour">
                <IconButton
                    aria-label="Guided tour"
                    appearance="subtle"
                    size="sm"
                    icon={<BsQuestionCircle />}
                    onClick={() => controls.start()}
                />
            </Tip>
            {Tour}
        </>
    )
}
