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
    const { snapshot, hydrated, clear } = useRecoveryStore()
    const [dismissed, setDismissed] = useState(false)

    // Wait for the async IDB hydration; only prompt when there is genuinely unsaved work.
    if (!hydrated || dismissed || !snapshot?.dirty) return null

    const when = new Date(snapshot.savedAt).toLocaleString()

    const resume = () => {
        recoverScore(snapshot.score)
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
                Unsaved changes to <b>{snapshot.title || 'an untitled score'}</b> from {when} were found. Resume editing
                them, or discard and start fresh?
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
