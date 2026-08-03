// Account creation drawer. Collects first/last name, email and a password (entered twice),
// validates with a SchemaModel, and calls the register endpoint. On success the account is
// NOT created yet — the user must click the confirmation link emailed to them.

import { useEffect, useRef, useState } from 'react'
import { Button, Drawer, Form, Message, PasswordInput, SchemaModel, StringType, type FormInstance } from 'rsuite'
import { apiRegister } from '../services/apiService'

const model = SchemaModel({
    firstName: StringType().isRequired('First name is required.'),
    lastName: StringType().isRequired('Last name is required.'),
    email: StringType().isEmail('Enter a valid email address.').isRequired('Email is required.'),
    password: StringType().minLength(8, 'Use at least 8 characters.').isRequired('Password is required.'),
    confirmPassword: StringType()
        .addRule((value, data) => value === data?.password, 'The passwords do not match.')
        .isRequired('Please confirm the password.')
})

const EMPTY = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' }

interface RegisterDrawerProps {
    open: boolean
    onClose: () => void
}

export function RegisterDrawer({ open, onClose }: RegisterDrawerProps) {
    const formRef = useRef<FormInstance>(null)
    const [formValue, setFormValue] = useState<Record<string, string>>(EMPTY)
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [sentTo, setSentTo] = useState<string | null>(null) // email address on success

    useEffect(() => {
        if (open) {
            setFormValue(EMPTY)
            setError(null)
            setSentTo(null)
            setSubmitting(false)
        }
    }, [open])

    const handleRegister = async () => {
        setError(null)
        if (!formRef.current?.check()) return
        setSubmitting(true)
        try {
            await apiRegister(
                formValue.firstName.trim(),
                formValue.lastName.trim(),
                formValue.email.trim(),
                formValue.password
            )
            setSentTo(formValue.email.trim())
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Registration failed.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Drawer open={open} size="sm" onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>Create an account</Drawer.Title>
                {!sentTo && (
                    <Drawer.Actions>
                        <Button onClick={onClose} appearance="subtle">
                            Cancel
                        </Button>
                        <Button onClick={handleRegister} appearance="primary" loading={submitting}>
                            Register
                        </Button>
                    </Drawer.Actions>
                )}
            </Drawer.Header>
            <Drawer.Body>
                {sentTo ? (
                    <Message type="success" showIcon>
                        We've sent a confirmation link to <b>{sentTo}</b>. Open it to activate your account — the link
                        expires after a while.
                    </Message>
                ) : (
                    <>
                        {error && (
                            <Message type="error" showIcon className="mb-3">
                                {error}
                            </Message>
                        )}
                        <Form fluid ref={formRef} formValue={formValue} onChange={setFormValue} model={model}>
                            <Form.Group controlId="firstName">
                                <Form.Label>First name</Form.Label>
                                <Form.Control name="firstName" />
                            </Form.Group>
                            <Form.Group controlId="lastName">
                                <Form.Label>Last name</Form.Label>
                                <Form.Control name="lastName" />
                            </Form.Group>
                            <Form.Group controlId="email">
                                <Form.Label>Email</Form.Label>
                                <Form.Control name="email" type="email" autoComplete="email" />
                            </Form.Group>
                            <Form.Group controlId="password">
                                <Form.Label>Password</Form.Label>
                                <Form.Control name="password" type="password" autoComplete="new-password" accepter={PasswordInput} />
                            </Form.Group>
                            <Form.Group controlId="confirmPassword">
                                <Form.Label>Confirm password</Form.Label>
                                <Form.Control
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    accepter={PasswordInput}
                                />
                            </Form.Group>
                        </Form>
                    </>
                )}
            </Drawer.Body>
        </Drawer>
    )
}
