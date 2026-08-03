// Handles the one-time links emailed to users (Option A: the front-end reads the token from
// the URL). On load, if the URL carries `?token=…&type=…`, it strips the token from the
// address bar and runs the matching flow. Phase 2 handles `type=verify` (account
// confirmation); `type=reset` (password reset) lands in phase 3.

import { useEffect } from 'react'
import { Message, useToaster } from 'rsuite'
import { apiVerifyEmail } from '../services/apiService'

export function EmailLinkHandler() {
    const toaster = useToaster()

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

        const notify = (type: 'success' | 'error', text: string) =>
            toaster.push(
                <Message type={type} showIcon closable>
                    {text}
                </Message>,
                { placement: 'topCenter', duration: 8000 }
            )

        if (type === 'verify') {
            apiVerifyEmail(token)
                .then(() => notify('success', 'Your account is confirmed — you can now log in.'))
                .catch((e) => notify('error', e instanceof Error ? e.message : 'Could not confirm the account.'))
        }
        // 'reset' → phase 3.
    }, [])

    return null
}
