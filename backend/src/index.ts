import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import authRouter from './routes/auth'
import scoresRouter from './routes/scores'

dotenv.config()

const app = express()

// ── Security middleware ───────────────────────────────────────
app.use(helmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"] } }))

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '500kb' }))
app.use(cookieParser())

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true // required for cookies
    })
)

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        standardHeaders: true,
        legacyHeaders: false
    })
)

// Stricter rate limit on auth routes
app.use(
    '/api/auth',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { error: 'Too many login attempts, please try again later' }
    })
)

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/scores', scoresRouter)

// ── Health check (useful for deployment platforms) ────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
})

// ── Global error handler ──────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
})
