// Profile editor (logged-in users). Four independent sections, each with its own submit:
//  • Name — applied immediately.
//  • Email — a confirmation link is sent to the NEW address; the change only takes effect
//    once that link is opened (handled by EmailLinkHandler → confirm-email-change).
//  • Password — requires the current password; the backend also emails a "was this you?" notice.
//  • Delete account (GDPR) — requires the password, then removes the account and logs out.

import { useEffect, useRef, useState } from 'react'
import { Button, Divider, Drawer, Form, Input, Message, PasswordInput, SchemaModel, StringType, type FormInstance } from 'rsuite'
import { useAuth } from '../context/AuthContext'
import { apiChangeEmail, apiChangePassword } from '../services/apiService'

const nameModel = SchemaModel({
    firstName: StringType().isRequired('First name is required.'),
    lastName: StringType().isRequired('Last name is required.')
})
const emailModel = SchemaModel({
    newEmail: StringType().isEmail('Enter a valid email address.').isRequired('Email is required.')
})
const passwordModel = SchemaModel({
    currentPassword: StringType().isRequired('Enter your current password.'),
    newPassword: StringType().minLength(8, 'Use at least 8 characters.').isRequired('Enter a new password.'),
    confirmPassword: StringType()
        .addRule((value, data) => value === data?.newPassword, 'The passwords do not match.')
        .isRequired('Please confirm the new password.')
})

type Note = { type: 'success' | 'error'; text: string } | null
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

interface EditProfileDrawerProps {
    open: boolean
    onClose: () => void
}

export function EditProfileDrawer({ open, onClose }: EditProfileDrawerProps) {
    const { user, updateProfile, deleteAccount } = useAuth()

    const nameRef = useRef<FormInstance>(null)
    const [nameVal, setNameVal] = useState({ firstName: '', lastName: '' })
    const [nameNote, setNameNote] = useState<Note>(null)
    const [nameBusy, setNameBusy] = useState(false)

    const emailRef = useRef<FormInstance>(null)
    const [emailVal, setEmailVal] = useState({ newEmail: '' })
    const [emailNote, setEmailNote] = useState<Note>(null)
    const [emailBusy, setEmailBusy] = useState(false)

    const pwdRef = useRef<FormInstance>(null)
    const [pwdVal, setPwdVal] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [pwdNote, setPwdNote] = useState<Note>(null)
    const [pwdBusy, setPwdBusy] = useState(false)

    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deletePwd, setDeletePwd] = useState('')
    const [deleteErr, setDeleteErr] = useState<string | null>(null)
    const [deleteBusy, setDeleteBusy] = useState(false)

    // Initialise from the current user each time the drawer opens (not on every user change,
    // so a success message isn't wiped when the user object updates after a save).
    useEffect(() => {
        if (!open) return
        setNameVal({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' })
        setEmailVal({ newEmail: '' })
        setPwdVal({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setNameNote(null)
        setEmailNote(null)
        setPwdNote(null)
        setConfirmingDelete(false)
        setDeletePwd('')
        setDeleteErr(null)
        setNameBusy(false)
        setEmailBusy(false)
        setPwdBusy(false)
        setDeleteBusy(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const saveName = async () => {
        setNameNote(null)
        if (!nameRef.current?.check()) return
        setNameBusy(true)
        try {
            await updateProfile(nameVal.firstName.trim(), nameVal.lastName.trim())
            setNameNote({ type: 'success', text: 'Your name was updated.' })
        } catch (e) {
            setNameNote({ type: 'error', text: errText(e, 'Could not update your name.') })
        } finally {
            setNameBusy(false)
        }
    }

    const changeEmail = async () => {
        setEmailNote(null)
        if (!emailRef.current?.check()) return
        setEmailBusy(true)
        const target = emailVal.newEmail.trim()
        try {
            await apiChangeEmail(target)
            setEmailNote({
                type: 'success',
                text: `We've sent a confirmation link to ${target}. Your email changes only once you open it.`
            })
            setEmailVal({ newEmail: '' })
        } catch (e) {
            setEmailNote({ type: 'error', text: errText(e, 'Could not change your email.') })
        } finally {
            setEmailBusy(false)
        }
    }

    const changePassword = async () => {
        setPwdNote(null)
        if (!pwdRef.current?.check()) return
        setPwdBusy(true)
        try {
            await apiChangePassword(pwdVal.currentPassword, pwdVal.newPassword)
            setPwdNote({ type: 'success', text: 'Your password was changed. We emailed you a confirmation.' })
            setPwdVal({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (e) {
            setPwdNote({ type: 'error', text: errText(e, 'Could not change your password.') })
        } finally {
            setPwdBusy(false)
        }
    }

    const doDelete = async () => {
        setDeleteErr(null)
        if (!deletePwd) {
            setDeleteErr('Enter your password to confirm.')
            return
        }
        setDeleteBusy(true)
        try {
            await deleteAccount(deletePwd)
            onClose() // user is now null; the profile menu returns to logged-out state
        } catch (e) {
            setDeleteErr(errText(e, 'Could not delete your account.'))
            setDeleteBusy(false)
        }
    }

    const note = (n: Note) =>
        n && (
            <Message type={n.type} showIcon className="mb-3">
                {n.text}
            </Message>
        )

    return (
        <Drawer open={open} size="sm" onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>Edit my profile</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={onClose} appearance="subtle">
                        Close
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                <h6>Name</h6>
                {note(nameNote)}
                <Form fluid ref={nameRef} formValue={nameVal} onChange={(v) => setNameVal(v as typeof nameVal)} model={nameModel}>
                    <Form.Group controlId="firstName">
                        <Form.Label>First name</Form.Label>
                        <Form.Control name="firstName" />
                    </Form.Group>
                    <Form.Group controlId="lastName">
                        <Form.Label>Last name</Form.Label>
                        <Form.Control name="lastName" />
                    </Form.Group>
                    <Button appearance="primary" onClick={saveName} loading={nameBusy}>
                        Save name
                    </Button>
                </Form>

                <Divider />

                <h6>Email</h6>
                <p className="text-gray-500 mb-2">Current: {user?.email}</p>
                {note(emailNote)}
                <Form fluid ref={emailRef} formValue={emailVal} onChange={(v) => setEmailVal(v as typeof emailVal)} model={emailModel}>
                    <Form.Group controlId="newEmail">
                        <Form.Label>New email</Form.Label>
                        <Form.Control name="newEmail" type="email" autoComplete="email" />
                    </Form.Group>
                    <Button appearance="primary" onClick={changeEmail} loading={emailBusy}>
                        Send confirmation
                    </Button>
                </Form>

                <Divider />

                <h6>Password</h6>
                {note(pwdNote)}
                <Form fluid ref={pwdRef} formValue={pwdVal} onChange={(v) => setPwdVal(v as typeof pwdVal)} model={passwordModel}>
                    <Form.Group controlId="currentPassword">
                        <Form.Label>Current password</Form.Label>
                        <Form.Control name="currentPassword" autoComplete="current-password" accepter={PasswordInput} />
                    </Form.Group>
                    <Form.Group controlId="newPassword">
                        <Form.Label>New password</Form.Label>
                        <Form.Control name="newPassword" autoComplete="new-password" accepter={PasswordInput} />
                    </Form.Group>
                    <Form.Group controlId="confirmPassword">
                        <Form.Label>Confirm new password</Form.Label>
                        <Form.Control name="confirmPassword" autoComplete="new-password" accepter={PasswordInput} />
                    </Form.Group>
                    <Button appearance="primary" onClick={changePassword} loading={pwdBusy}>
                        Change password
                    </Button>
                </Form>

                <Divider />

                <h6>Delete account</h6>
                {!confirmingDelete ? (
                    <Button appearance="ghost" color="red" onClick={() => setConfirmingDelete(true)}>
                        Delete my account…
                    </Button>
                ) : (
                    <>
                        <Message type="warning" showIcon className="mb-3">
                            This permanently deletes your account and all your scores. This cannot be undone.
                        </Message>
                        {deleteErr && (
                            <Message type="error" showIcon className="mb-3">
                                {deleteErr}
                            </Message>
                        )}
                        <Form fluid>
                            <Form.Group controlId="deletePwd">
                                <Form.Label>Confirm your password</Form.Label>
                                <Input
                                    name="deletePwd"
                                    type="password"
                                    autoComplete="current-password"
                                    value={deletePwd}
                                    onChange={setDeletePwd}
                                />
                            </Form.Group>
                            <div className="flex gap-2">
                                <Button appearance="primary" color="red" onClick={doDelete} loading={deleteBusy}>
                                    Permanently delete
                                </Button>
                                <Button appearance="subtle" onClick={() => setConfirmingDelete(false)} disabled={deleteBusy}>
                                    Cancel
                                </Button>
                            </div>
                        </Form>
                    </>
                )}
            </Drawer.Body>
        </Drawer>
    )
}
