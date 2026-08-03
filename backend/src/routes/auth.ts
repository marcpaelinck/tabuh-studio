import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { Request, Response, Router } from 'express'
import jwt from 'jsonwebtoken'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { z } from 'zod'
import pool from '../db/pool'
import { APP_URL, sendMail, verificationEmail } from '../mailer'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const loginSchema = z.object({ email: z.email(), password: z.string().min(8) })

// Validity of an account-confirmation link.
const VERIFY_TTL_HOURS = Number(process.env.VERIFY_TTL_HOURS || 24)

/** Creates a random token and its sha256 hash (only the hash is stored). */
function makeToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(32).toString('hex')
    return { raw, hash: crypto.createHash('sha256').update(raw).digest('hex') }
}
const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex')

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
            'SELECT id, first_name, last_name, email, role, password_hash FROM users WHERE email = ?',
            [email]
        )
        const user = rows[0]
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            res.status(401).json({ error: 'Invalid email or password' })
            return
        }

        const payload = { id: user.id, email: user.email, role: user.role }

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRY as any })
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
            expiresIn: process.env.JWT_REFRESH_EXPIRY as any
        })

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        })
            .cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/api/auth/refresh'
            })
            .json({ user: userView(user) })
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
        }
        const accessToken = jwt.sign(
            { id: payload.id, email: payload.email, role: payload.role },
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
        const expiresAt = new Date(Date.now() + VERIFY_TTL_HOURS * 3600 * 1000)
        await pool.query(
            "INSERT INTO auth_tokens (user_id, type, token_hash, payload, expires_at) VALUES (NULL, 'verify_email', ?, ?, ?)",
            [hash, payload, expiresAt]
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
