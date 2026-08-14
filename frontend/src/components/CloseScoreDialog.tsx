// Shown when closing a score that has unsaved changes. Offers the save options the user is
// authorized for (database — editors/admins; Tabuh Studio .json file — everyone) next to
// "Don't save", which asks for confirmation before discarding.

import { useEffect, useState } from 'react'
import { Button, Message, Modal } from 'rsuite'

interface CloseScoreDialogProps {
    open: boolean
    scoreTitle: string
    /** Whether the user may save to the database (editor/admin). */
    canSaveDb: boolean
    onCancel: () => void
    /** Save to DB / file — return true on success (the parent then closes the score & this dialog). */
    onSaveDb: () => Promise<boolean>
    onSaveFile: () => Promise<boolean>
    /** Discard the changes and close (already confirmed). */
    onDiscard: () => void
}

export function CloseScoreDialog({
    open,
    scoreTitle,
    canSaveDb,
    onCancel,
    onSaveDb,
    onSaveFile,
    onDiscard
}: CloseScoreDialogProps) {
    const [phase, setPhase] = useState<'choose' | 'confirm'>('choose')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setPhase('choose')
            setBusy(false)
            setError(null)
        }
    }, [open])

    const runSave = async (fn: () => Promise<boolean>) => {
        setError(null)
        setBusy(true)
        try {
            const ok = await fn()
            if (!ok) setError('Could not save. Choose another option or cancel.')
            // On success the parent closes the score, which unmounts this dialog.
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save.')
        } finally {
            setBusy(false)
        }
    }

    const title = scoreTitle || 'this score'

    return (
        <Modal open={open} onClose={onCancel} size="xs" backdrop="static">
            <Modal.Header>
                <Modal.Title>{phase === 'choose' ? 'Save changes before closing?' : 'Discard changes?'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Message type="error" showIcon className="mb-3">
                        {error}
                    </Message>
                )}
                {phase === 'choose' ? (
                    <p>
                        <b>{title}</b> has unsaved changes.
                    </p>
                ) : (
                    <p>
                        Unsaved changes to <b>{title}</b> will be lost. Are you sure?
                    </p>
                )}
            </Modal.Body>
            <Modal.Footer>
                {phase === 'choose' ? (
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button appearance="subtle" onClick={onCancel} disabled={busy}>
                            Cancel
                        </Button>
                        <Button appearance="ghost" color="red" onClick={() => setPhase('confirm')} disabled={busy}>
                            Don't save
                        </Button>
                        <Button onClick={() => runSave(onSaveFile)} loading={busy}>
                            Save to file
                        </Button>
                        {canSaveDb && (
                            <Button appearance="primary" onClick={() => runSave(onSaveDb)} loading={busy}>
                                Save to database
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-end gap-2">
                        <Button appearance="subtle" onClick={() => setPhase('choose')}>
                            Back
                        </Button>
                        <Button appearance="primary" color="red" onClick={onDiscard}>
                            Discard
                        </Button>
                    </div>
                )}
            </Modal.Footer>
        </Modal>
    )
}
