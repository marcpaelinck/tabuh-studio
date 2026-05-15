import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import fs from 'fs'
import helmet from 'helmet'
import path from 'path'

import authRouter from './routes/auth'
import scoresRouter from './routes/scores'

dotenv.config()

const app = express()

// ── Security middleware ───────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: false // adjust later once frontend is working
    })
)

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }))

app.use(
    '/api/auth',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { error: 'Too many login attempts, please try again later' }
    })
)

app.use(express.json({ limit: '500kb' }))
app.use(cookieParser())

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/scores', scoresRouter)

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
})

// ── Serve frontend static files ───────────────────────────────
const frontendPath = path.resolve(__dirname, '../../frontend-dist')

if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath))

    // Handle React client-side routing — serve index.html for all
    // non-API routes so that refreshing a page works correctly
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(frontendPath, 'index.html'))
        }
    })
} else {
    console.warn('Frontend dist folder not found at:', frontendPath)
}

// ── Global error handler ──────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
})
