import bcrypt from 'bcrypt'
import { Request, Response, Router } from 'express'
import jwt from 'jsonwebtoken'
import { RowDataPacket } from 'mysql2'
import { z } from 'zod'
import pool from '../db/pool'
import { validate } from '../middleware/validate'

const router = Router()

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    const { email, password } = req.body
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, name, email, role, password_hash FROM users WHERE email = ?',
            [email]
        )
        const user = rows[0]
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            res.status(401).json({ error: 'Invalid email or password' })
            return
        }

        const payload = { id: user.id, name: user.name, email: user.email, role: user.role }

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
            .json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
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
