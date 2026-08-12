// On startup, if a recovery snapshot with unsaved changes was persisted (see useRecoveryStore),
// offer the user the choice to resume that work or discard it. Shown once per app start.

import { useState } from 'react'
import { Button, Modal } from 'rsuite'
import { useRecoveryStore } from '../stores/useRecoveryStore'
import type { Score } from '../typing/score'

interface ScoreRecoveryPromptProps {
    recoverScore: (score: Score) => void
}

export function ScoreRecoveryPrompt({ recoverScore }: ScoreRecoveryPromptProps) {
    // Use `bootSnapshot` (frozen at startup), NOT `snapshot` (which the live session keeps
    // updating) — otherwise the first edit of a freshly selected score would pop this up.
    const hydrated = useRecoveryStore((s) => s.hydrated)
    const bootSnapshot = useRecoveryStore((s) => s.bootSnapshot)
    const clear = useRecoveryStore((s) => s.clear)
    const [dismissed, setDismissed] = useState(false)

    // Wait for the async IDB hydration; only prompt when the previous session left unsaved work.
    if (!hydrated || dismissed || !bootSnapshot?.dirty) return null

    const when = new Date(bootSnapshot.savedAt).toLocaleString()

    const resume = () => {
        recoverScore(bootSnapshot.score)
        setDismissed(true)
    }
    const discard = () => {
        clear()
        setDismissed(true)
    }

    return (
        <Modal open backdrop="static" size="xs" onClose={discard}>
            <Modal.Header closeButton={false}>
                <Modal.Title>Resume unsaved work?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Unsaved changes to <b>{bootSnapshot.title || 'an untitled score'}</b> from {when} were found. Resume
                editing them, or discard and start fresh?
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={discard} appearance="subtle">
                    Discard
                </Button>
                <Button onClick={resume} appearance="primary">
                    Resume
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
