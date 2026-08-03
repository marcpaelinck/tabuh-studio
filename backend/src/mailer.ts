// Outgoing email (nodemailer). Configured from MAIL_* env vars; when none are set the
// mailer runs in "dev mode" and simply logs what it would have sent — so registration and
// the reset flows work locally without SMTP credentials.

import nodemailer, { type Transporter } from 'nodemailer'

const FROM = process.env.MAIL_FROM || 'Tabuh Studio <no-reply@tabuh.studio>'

/** Base URL of the front-end, used to build the links inside emails. */
export const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')

let transporter: Transporter | null | undefined

function getTransport(): Transporter | null {
    if (transporter !== undefined) return transporter
    const host = process.env.MAIL_HOST
    if (!host) {
        transporter = null // no SMTP configured → dev mode
        return null
    }
    const port = Number(process.env.MAIL_PORT || 587)
    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = TLS/SSL; 587 = STARTTLS
        auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined
    })
    return transporter
}

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<void> {
    const tx = getTransport()
    if (!tx) {
        console.log(`\n[mailer:dev] To: ${opts.to}\n[mailer:dev] Subject: ${opts.subject}\n${opts.text}\n`)
        return
    }
    await tx.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text })
}

function escapeHtml(s: string): string {
    return s.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
    )
}

/** Account-confirmation email for a new registration. */
export function verificationEmail(firstName: string, link: string, ttlHours: number) {
    const subject = 'Confirm your Tabuh Studio account'
    const text = `Hi ${firstName},\n\nConfirm your Tabuh Studio account by opening this link within ${ttlHours} hours:\n${link}\n\nIf you didn't request this, you can ignore this email.`
    const html =
        `<p>Hi ${escapeHtml(firstName)},</p>` +
        `<p>Confirm your Tabuh Studio account by clicking the link below (valid for ${ttlHours} hours):</p>` +
        `<p><a href="${link}">Confirm my account</a></p>` +
        `<p>If you didn't request this, you can ignore this email.</p>`
    return { subject, text, html }
}
