import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { Request, Response, Router } from 'express'
import jwt from 'jsonwebtoken'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { z } from 'zod'
import pool from '../db/pool'
import {
    APP_URL,
    emailChangeConfirmEmail,
    emailChangeNoticeEmail,
    passwordChangedEmail,
    passwordResetEmail,
    sendMail,
    verificationEmail
} from '../mailer'
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const loginSchema = z.object({ email: z.email(), password: z.string().min(8) })

// Link validity windows.
const VERIFY_TTL_HOURS = Number(process.env.VERIFY_TTL_HOURS || 24)
const RESET_TTL_HOURS = Number(process.env.RESET_TTL_HOURS || 2)

/** Creates a random token and its sha256 hash (only the hash is stored). */
function makeToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(32).toString('hex')
    return { raw, hash: crypto.createHash('sha256').update(raw).digest('hex') }
}
const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex')

/**
 * Signs access + refresh tokens for a session and sets them as httpOnly cookies.
 * `tv` (token_version) is embedded so /refresh can reject tokens issued before a
 * password change/reset (see requireAuth/refresh).
 */
function issueSession(res: Response, claims: { id: number; email: string; role: string; tv: number }) {
    const accessToken = jwt.sign(claims, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRY as any })
    const refreshToken = jwt.sign(claims, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: process.env.JWT_REFRESH_EXPIRY as any
    })
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
    }).cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh'
    })
}

/** Assembles the user object returned to the client from a DB row. */
function userView(row: RowDataPacket) {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
        email: row.email,
        role: row.role
    }
}

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    const { email, password } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, first_name, last_name, email, role, token_version, password_hash FROM users WHERE email = ?',
            [email]
        )
        const user = rows[0]
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            res.status(401).json({ error: 'Invalid email or password' })
            return
        }

        issueSession(res, { id: user.id, email: user.email, role: user.role, tv: user.token_version })
        res.json({ user: userView(user) })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.post('/refresh', async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token
    if (!token) {
        res.status(401).json({ error: 'No refresh token' })
        return
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
            id: number
            email: string
            role: string
            tv?: number
        }
        // Reject tokens issued before the user's last password change/reset. Also picks up the
        // current email/role, so a refreshed access token stays in sync with the DB.
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT email, role, token_version FROM users WHERE id = ?',
            [payload.id]
        )
        const user = rows[0]
        if (!user || (payload.tv ?? 0) !== user.token_version) {
            res.status(401).json({ error: 'Session expired, please log in again' })
            return
        }
        const accessToken = jwt.sign(
            { id: payload.id, email: user.email, role: user.role, tv: user.token_version },
            process.env.JWT_SECRET!,
            { expiresIn: process.env.JWT_EXPIRY as any }
        )
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        }).json({ ok: true })
    } catch {
        res.status(401).json({ error: 'Invalid refresh token' })
    }
})

// Returns the currently authenticated user (from the DB, so name/email/role are fresh).
// Used by the frontend to restore the session after a silent token refresh and to prefill
// the profile editor.
router.get('/me', requireAuth, async (req: Request, res: Response) => {
    const { id } = (req as AuthenticatedRequest).user!
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
            [id]
        )
        const user = rows[0]
        if (!user) {
            res.status(404).json({ error: 'User not found' })
            return
        }
        res.json({ user: userView(user) })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Registration (with email confirmation) ────────────────────────────
// register → stores a pending signup + emails a one-time confirmation link.
// verify-email → consumes the token and creates the actual `users` row (role 'viewer').

const registerSchema = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.email(),
    password: z.string().min(8).max(200)
})

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body
    try {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email])
        if (existing.length) {
            res.status(409).json({ error: 'This email address is already registered.' })
            return
        }
        const password_hash = await bcrypt.hash(password, 12)
        // Drop any earlier unused pending signup for this address.
        await pool.query(
            "DELETE FROM auth_tokens WHERE type = 'verify_email' AND used_at IS NULL AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.email')) = ?",
            [email]
        )
        const { raw, hash } = makeToken()
        const payload = JSON.stringify({ first_name: firstName, last_name: lastName, email, password_hash })
        await pool.query(
            "INSERT INTO auth_tokens (user_id, type, token_hash, payload, expires_at) VALUES (NULL, 'verify_email', ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
            [hash, payload, VERIFY_TTL_HOURS]
        )
        const link = `${APP_URL}/?token=${raw}&type=verify`
        const mail = verificationEmail(firstName, link, VERIFY_TTL_HOURS)
        await sendMail({ to: email, subject: mail.subject, html: mail.html, text: mail.text })
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

const verifySchema = z.object({ token: z.string().min(10) })

router.post('/verify-email', validate(verifySchema), async (req: Request, res: Response) => {
    const { token } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT id, payload FROM auth_tokens WHERE token_hash = ? AND type = 'verify_email' AND used_at IS NULL AND expires_at > NOW() LIMIT 1",
            [hashToken(token)]
        )
        const tokenRow = rows[0]
        if (!tokenRow) {
            res.status(400).json({ error: 'This confirmation link is invalid or has expired.' })
            return
        }
        const data = typeof tokenRow.payload === 'string' ? JSON.parse(tokenRow.payload) : tokenRow.payload
        // Consume the token first so it can't be replayed even if the insert races.
        await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [tokenRow.id])

        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [data.email])
        if (existing.length) {
            res.status(409).json({ error: 'This email address is already registered.' })
            return
        }
        await pool.query<ResultSetHeader>(
            "INSERT INTO users (email, first_name, last_name, password_hash, role) VALUES (?, ?, ?, ?, 'viewer')",
            [data.email, data.first_name, data.last_name, data.password_hash]
        )
        res.json({ ok: true, email: data.email })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Profile editing (authenticated) ───────────────────────────────────

const profileSchema = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100)
})

// Update first/last name — applies immediately.
router.patch('/profile', requireAuth, validate(profileSchema), async (req: Request, res: Response) => {
    const { id } = (req as AuthenticatedRequest).user!
    const { firstName, lastName } = req.body
    try {
        await pool.query('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [firstName, lastName, id])
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
            [id]
        )
        res.json({ user: userView(rows[0]) })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

const changeEmailSchema = z.object({ newEmail: z.email() })

// Request an email change — sends a confirmation link to the NEW address (change is deferred
// until confirmed) and a heads-up notice to the current address.
router.post('/change-email', requireAuth, validate(changeEmailSchema), async (req: Request, res: Response) => {
    const { id } = (req as AuthenticatedRequest).user!
    const { newEmail } = req.body
    try {
        const [taken] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [newEmail])
        if (taken.length) {
            res.status(409).json({ error: 'This email address is already in use.' })
            return
        }
        const [rows] = await pool.query<RowDataPacket[]>('SELECT first_name, email FROM users WHERE id = ?', [id])
        const u = rows[0]
        if (!u) {
            res.status(404).json({ error: 'User not found' })
            return
        }
        if (u.email === newEmail) {
            res.status(400).json({ error: 'That is already your email address.' })
            return
        }
        // Drop any earlier pending change for this user.
        await pool.query("DELETE FROM auth_tokens WHERE type = 'change_email' AND used_at IS NULL AND user_id = ?", [id])
        const { raw, hash } = makeToken()
        await pool.query(
            "INSERT INTO auth_tokens (user_id, type, token_hash, payload, expires_at) VALUES (?, 'change_email', ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
            [id, hash, JSON.stringify({ new_email: newEmail }), VERIFY_TTL_HOURS]
        )
        const link = `${APP_URL}/?token=${raw}&type=change_email`
        const confirm = emailChangeConfirmEmail(u.first_name, link, VERIFY_TTL_HOURS)
        await sendMail({ to: newEmail, subject: confirm.subject, html: confirm.html, text: confirm.text })
        const notice = emailChangeNoticeEmail(u.first_name, newEmail)
        await sendMail({ to: u.email, subject: notice.subject, html: notice.html, text: notice.text })
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// Confirm an email change from the link (front-end reads the token). Public — the token is the proof.
router.post('/confirm-email-change', validate(verifySchema), async (req: Request, res: Response) => {
    const { token } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT id, user_id, payload FROM auth_tokens WHERE token_hash = ? AND type = 'change_email' AND used_at IS NULL AND expires_at > NOW() LIMIT 1",
            [hashToken(token)]
        )
        const tokenRow = rows[0]
        if (!tokenRow) {
            res.status(400).json({ error: 'This link is invalid or has expired.' })
            return
        }
        const data = typeof tokenRow.payload === 'string' ? JSON.parse(tokenRow.payload) : tokenRow.payload
        await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [tokenRow.id])
        const [taken] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [data.new_email])
        if (taken.length) {
            res.status(409).json({ error: 'This email address is already in use.' })
            return
        }
        await pool.query('UPDATE users SET email = ? WHERE id = ?', [data.new_email, tokenRow.user_id])
        res.json({ ok: true, email: data.new_email })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(200)
})

// Change password (requires the current one). Emails a notice with a reset link in case it wasn't the user.
router.post('/change-password', requireAuth, validate(changePasswordSchema), async (req: Request, res: Response) => {
    const { id, role } = (req as AuthenticatedRequest).user!
    const { currentPassword, newPassword } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT first_name, email, token_version, password_hash FROM users WHERE id = ?',
            [id]
        )
        const u = rows[0]
        if (!u) {
            res.status(404).json({ error: 'User not found' })
            return
        }
        if (!(await bcrypt.compare(currentPassword, u.password_hash))) {
            res.status(400).json({ error: 'Your current password is incorrect.' })
            return
        }
        // Bump token_version to invalidate all OTHER sessions, then re-issue this one so the
        // user who just changed their password stays logged in.
        const newTv = u.token_version + 1
        await pool.query('UPDATE users SET password_hash = ?, token_version = ? WHERE id = ?', [
            await bcrypt.hash(newPassword, 12),
            newTv,
            id
        ])
        issueSession(res, { id, email: u.email, role, tv: newTv })
        // Emailed reset link so the real owner can undo an unauthorized change.
        const { raw, hash } = makeToken()
        await pool.query(
            "INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES (?, 'reset_password', ?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
            [id, hash, RESET_TTL_HOURS]
        )
        const link = `${APP_URL}/?token=${raw}&type=reset`
        const mail = passwordChangedEmail(u.first_name, link, RESET_TTL_HOURS)
        await sendMail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text })
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Forgot / reset password (public) ──────────────────────────────────

const forgotSchema = z.object({ email: z.email() })

// Always responds the same way to avoid revealing whether an address is registered.
router.post('/forgot-password', validate(forgotSchema), async (req: Request, res: Response) => {
    const { email } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id, first_name FROM users WHERE email = ?', [email])
        const u = rows[0]
        if (u) {
            await pool.query("DELETE FROM auth_tokens WHERE type = 'reset_password' AND used_at IS NULL AND user_id = ?", [u.id])
            const { raw, hash } = makeToken()
            await pool.query(
                "INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES (?, 'reset_password', ?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
                [u.id, hash, RESET_TTL_HOURS]
            )
            const link = `${APP_URL}/?token=${raw}&type=reset`
            const mail = passwordResetEmail(u.first_name, link, RESET_TTL_HOURS)
            await sendMail({ to: email, subject: mail.subject, html: mail.html, text: mail.text })
        }
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

const resetSchema = z.object({ token: z.string().min(10), newPassword: z.string().min(8).max(200) })

router.post('/reset-password', validate(resetSchema), async (req: Request, res: Response) => {
    const { token, newPassword } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT id, user_id FROM auth_tokens WHERE token_hash = ? AND type = 'reset_password' AND used_at IS NULL AND expires_at > NOW() LIMIT 1",
            [hashToken(token)]
        )
        const tokenRow = rows[0]
        if (!tokenRow) {
            res.status(400).json({ error: 'This reset link is invalid or has expired.' })
            return
        }
        await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [tokenRow.id])
        // Bump token_version so any session that existed before the reset is invalidated at
        // its next /refresh (e.g. an attacker who prompted the reset).
        await pool.query('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [
            await bcrypt.hash(newPassword, 12),
            tokenRow.user_id
        ])
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Account deletion (GDPR) ────────────────────────────────────────────

const deleteAccountSchema = z.object({ password: z.string().min(1) })

router.post('/delete-account', requireAuth, validate(deleteAccountSchema), async (req: Request, res: Response) => {
    const { id } = (req as AuthenticatedRequest).user!
    const { password } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT password_hash FROM users WHERE id = ?', [id])
        const u = rows[0]
        if (!u) {
            res.status(404).json({ error: 'User not found' })
            return
        }
        if (!(await bcrypt.compare(password, u.password_hash))) {
            res.status(400).json({ error: 'Your password is incorrect.' })
            return
        }
        // Removes the user and, via ON DELETE CASCADE, their scores and tokens.
        await pool.query('DELETE FROM users WHERE id = ?', [id])
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        })
            .clearCookie('refresh_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/api/auth/refresh'
            })
            .json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Admin: manage users ────────────────────────────────────────────────
// All guarded by requireRole('admin'). An admin cannot change their own role or delete
// themselves here (prevents locking the last admin out or self-deletion by accident).

router.get('/users', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at ASC, id ASC'
        )
        res.json({
            users: rows.map((r) => ({
                id: r.id,
                firstName: r.first_name,
                lastName: r.last_name,
                name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
                email: r.email,
                role: r.role,
                createdAt: r.created_at
            }))
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

const roleSchema = z.object({ role: z.enum(['viewer', 'editor', 'admin']) })

router.patch('/users/:id/role', requireAuth, requireRole('admin'), validate(roleSchema), async (req: Request, res: Response) => {
    const targetId = Number(req.params.id)
    const { id: selfId } = (req as AuthenticatedRequest).user!
    const { role } = req.body
    if (!Number.isInteger(targetId)) {
        res.status(400).json({ error: 'Invalid user id.' })
        return
    }
    if (targetId === selfId) {
        res.status(400).json({ error: "You can't change your own role." })
        return
    }
    try {
        const [result] = await pool.query<ResultSetHeader>('UPDATE users SET role = ? WHERE id = ?', [role, targetId])
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'User not found.' })
            return
        }
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    const targetId = Number(req.params.id)
    const { id: selfId } = (req as AuthenticatedRequest).user!
    if (!Number.isInteger(targetId)) {
        res.status(400).json({ error: 'Invalid user id.' })
        return
    }
    if (targetId === selfId) {
        res.status(400).json({ error: "You can't delete your own account here — use 'Edit my profile'." })
        return
    }
    try {
        // Removes the user and, via ON DELETE CASCADE, their scores and tokens.
        const [result] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [targetId])
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'User not found.' })
            return
        }
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    })
        .clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth/refresh'
        })
        .json({ ok: true })
})

export default router
