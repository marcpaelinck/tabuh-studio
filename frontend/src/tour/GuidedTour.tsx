// Tour launcher: a "?" button that opens a small menu (Whisper + Popover, the pattern that
// avoids rsuite's Dropdown toggle race) offering the two tours. Renders both tour components,
// which start themselves when their id becomes the active tour. Desktop only.

import { useRef } from 'react'
import { BsQuestionCircle } from 'react-icons/bs'
import { Dropdown, IconButton, Popover, Whisper, type WhisperInstance } from 'rsuite'
import { BriefTour } from './BriefTour'
import { HandsOnTour } from './HandsOnTour'
import { useTourStore } from './useTourStore'

export function GuidedTour() {
    const setActive = useTourStore((s) => s.setActive)
    const menuRef = useRef<WhisperInstance>(null)
    const runAndClose = (fn: () => void) => () => {
        menuRef.current?.close()
        fn()
    }

    return (
        <>
            <Whisper
                ref={menuRef}
                placement="bottomEnd"
                trigger="click"
                speaker={
                    <Popover full>
                        <Dropdown.Menu>
                            <Dropdown.Item onSelect={runAndClose(() => setActive('brief'))}>
                                Basic functionality
                            </Dropdown.Item>
                            <Dropdown.Item onSelect={runAndClose(() => setActive('handsOn'))}>The Player</Dropdown.Item>
                        </Dropdown.Menu>
                    </Popover>
                }>
                <IconButton
                    aria-label="Guided tours"
                    title="Guided tours"
                    appearance="subtle"
                    size="sm"
                    icon={<BsQuestionCircle />}
                />
            </Whisper>
            <BriefTour />
            <HandsOnTour />
        </>
    )
}
