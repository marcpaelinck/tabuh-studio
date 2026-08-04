// Set-a-new-password drawer, opened by EmailLinkHandler when the URL carries a reset token
// (?type=reset). The token is passed in and submitted with the new password.

import { useEffect, useRef, useState } from 'react'
import { Button, Drawer, Form, Message, PasswordInput, SchemaModel, StringType, type FormInstance } from 'rsuite'
import { apiResetPassword } from '../services/apiService'

const model = SchemaModel({
    newPassword: StringType().minLength(8, 'Use at least 8 characters.').isRequired('Enter a new password.'),
    confirmPassword: StringType()
        .addRule((value, data) => value === data?.newPassword, 'The passwords do not match.')
        .isRequired('Please confirm the new password.')
})

interface ResetPasswordDrawerProps {
    token: string | null
    onClose: () => void
}

export function ResetPasswordDrawer({ token, onClose }: ResetPasswordDrawerProps) {
    const formRef = useRef<FormInstance>(null)
    const [formValue, setFormValue] = useState({ newPassword: '', confirmPassword: '' })
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
        if (token) {
            setFormValue({ newPassword: '', confirmPassword: '' })
            setError(null)
            setBusy(false)
            setDone(false)
        }
    }, [token])

    const submit = async () => {
        if (!token) return
        setError(null)
        if (!formRef.current?.check()) return
        setBusy(true)
        try {
            await apiResetPassword(token, formValue.newPassword)
            setDone(true)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not reset your password.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Drawer open={token !== null} size="sm" onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>Set a new password</Drawer.Title>
                {!done && (
                    <Drawer.Actions>
                        <Button onClick={onClose} appearance="subtle">
                            Cancel
                        </Button>
                        <Button onClick={submit} appearance="primary" loading={busy}>
                            Set password
                        </Button>
                    </Drawer.Actions>
                )}
            </Drawer.Header>
            <Drawer.Body>
                {done ? (
                    <Message type="success" showIcon>
                        Your password has been reset — you can now log in with it.
                    </Message>
                ) : (
                    <>
                        {error && (
                            <Message type="error" showIcon className="mb-3">
                                {error}
                            </Message>
                        )}
                        <Form fluid ref={formRef} formValue={formValue} onChange={(v) => setFormValue(v as typeof formValue)} model={model}>
                            <Form.Group controlId="newPassword">
                                <Form.Label>New password</Form.Label>
                                <Form.Control name="newPassword" autoComplete="new-password" accepter={PasswordInput} />
                            </Form.Group>
                            <Form.Group controlId="confirmPassword">
                                <Form.Label>Confirm new password</Form.Label>
                                <Form.Control name="confirmPassword" autoComplete="new-password" accepter={PasswordInput} />
                            </Form.Group>
                        </Form>
                    </>
                )}
            </Drawer.Body>
        </Drawer>
    )
}
