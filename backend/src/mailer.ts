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

/** Confirmation email sent to the NEW address when a user changes their email. */
export function emailChangeConfirmEmail(firstName: string, link: string, ttlHours: number) {
    const subject = 'Confirm your new Tabuh Studio email address'
    const text = `Hi ${firstName},\n\nConfirm this as your new Tabuh Studio email address by opening this link within ${ttlHours} hours:\n${link}\n\nYour address will only change once you confirm. If you didn't request this, you can ignore this email.`
    const html =
        `<p>Hi ${escapeHtml(firstName)},</p>` +
        `<p>Confirm this as your new Tabuh Studio email address by clicking the link below (valid for ${ttlHours} hours):</p>` +
        `<p><a href="${link}">Confirm my new email</a></p>` +
        `<p>Your address will only change once you confirm. If you didn't request this, you can ignore this email.</p>`
    return { subject, text, html }
}

/** Notice sent to the OLD address when an email change is requested (security awareness). */
export function emailChangeNoticeEmail(firstName: string, newEmail: string) {
    const subject = 'Your Tabuh Studio email change was requested'
    const text = `Hi ${firstName},\n\nSomeone requested to change your Tabuh Studio email address to ${newEmail}. The change only takes effect after it is confirmed from the new address.\n\nIf this wasn't you, please change your password immediately.`
    const html =
        `<p>Hi ${escapeHtml(firstName)},</p>` +
        `<p>Someone requested to change your Tabuh Studio email address to <b>${escapeHtml(newEmail)}</b>. The change only takes effect after it is confirmed from the new address.</p>` +
        `<p>If this wasn't you, please change your password immediately.</p>`
    return { subject, text, html }
}

/** Password-reset email (forgot-password flow). */
export function passwordResetEmail(firstName: string, link: string, ttlHours: number) {
    const subject = 'Reset your Tabuh Studio password'
    const text = `Hi ${firstName},\n\nWe received a request to reset your Tabuh Studio password. Open this link within ${ttlHours} hours to set a new one:\n${link}\n\nIf you didn't request this, you can ignore this email — your password stays unchanged.`
    const html =
        `<p>Hi ${escapeHtml(firstName)},</p>` +
        `<p>We received a request to reset your Tabuh Studio password. Click the link below (valid for ${ttlHours} hours) to set a new one:</p>` +
        `<p><a href="${link}">Reset my password</a></p>` +
        `<p>If you didn't request this, you can ignore this email — your password stays unchanged.</p>`
    return { subject, text, html }
}

/** Notification sent after a password change, with a reset link in case it wasn't the user. */
export function passwordChangedEmail(firstName: string, link: string, ttlHours: number) {
    const subject = 'Your Tabuh Studio password was changed'
    const text = `Hi ${firstName},\n\nYour Tabuh Studio password was just changed. If this was you, no action is needed.\n\nIf you did NOT change it, reset your password immediately using this link (valid ${ttlHours} hours):\n${link}`
    const html =
        `<p>Hi ${escapeHtml(firstName)},</p>` +
        `<p>Your Tabuh Studio password was just changed. If this was you, no action is needed.</p>` +
        `<p>If you did <b>not</b> change it, reset your password immediately using the link below (valid for ${ttlHours} hours):</p>` +
        `<p><a href="${link}">Reset my password</a></p>`
    return { subject, text, html }
}
