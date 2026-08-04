// Handles the one-time links emailed to users (Option A: the front-end reads the token from
// the URL). On load, if the URL carries `?token=…&type=…`, it strips the token from the
// address bar and runs the matching flow:
//   • verify        → confirm a new account (phase 2)
//   • change_email  → confirm a new email address (phase 3)
//   • reset         → open the set-new-password drawer (phase 3)

import { useEffect, useState } from 'react'
import { Message, useToaster } from 'rsuite'
import { apiConfirmEmailChange, apiVerifyEmail } from '../services/apiService'
import { ResetPasswordDrawer } from './ResetPasswordDrawer'

export function EmailLinkHandler() {
    const toaster = useToaster()
    const [resetToken, setResetToken] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')
        const type = params.get('type')
        if (!token || !type) return

        // Remove the token from the address bar immediately (single-use, don't leave it in history).
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        url.searchParams.delete('type')
        window.history.replaceState({}, '', url.pathname + url.search + url.hash)

        const notify = (kind: 'success' | 'error', text: string) =>
            toaster.push(
                <Message type={kind} showIcon closable>
                    {text}
                </Message>,
                { placement: 'topCenter', duration: 8000 }
            )

        if (type === 'verify') {
            apiVerifyEmail(token)
                .then(() => notify('success', 'Your account is confirmed — you can now log in.'))
                .catch((e) => notify('error', e instanceof Error ? e.message : 'Could not confirm the account.'))
        } else if (type === 'change_email') {
            apiConfirmEmailChange(token)
                .then(({ email }) => notify('success', `Your email address is now ${email}.`))
                .catch((e) => notify('error', e instanceof Error ? e.message : 'Could not confirm the email change.'))
        } else if (type === 'reset') {
            setResetToken(token)
        }
    }, [])

    return <ResetPasswordDrawer token={resetToken} onClose={() => setResetToken(null)} />
}
