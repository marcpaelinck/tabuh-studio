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

const frontendPath = path.resolve(__dirname, '../../frontend-dist')

// ── Static files — before before everything else ─────────

if (fs.existsSync(frontendPath)) {
    app.use(
        express.static(frontendPath, {
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.woff2')) {
                    res.setHeader('Content-Type', 'font/woff2')
                } else if (filePath.endsWith('.woff')) {
                    res.setHeader('Content-Type', 'font/woff')
                } else if (filePath.endsWith('.ttf')) {
                    res.setHeader('Content-Type', 'font/ttf')
                } else if (filePath.endsWith('.otf')) {
                    res.setHeader('Content-Type', 'font/otf')
                }
            }
        })
    )
}

// ── Security middleware ───────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", 'data:'],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                workerSrc: ["'self'", 'blob:'],
                connectSrc: ["'self'"]
            }
        }
    })
)

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))

// ── Body parsing and cookies — only needed for API routes ─────
app.use('/api', express.json({ limit: '500kb' }))
app.use('/api', cookieParser())

const readLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })

const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })

const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later' }
})

//  ── API rate limiting — only applies to /api/* routes ─────────
app.use('/api', readLimit)

// More specific limits override for specific routes
app.use('/api/auth', authLimit)
app.use('/api/scores', (req, res, next) => {
    if (req.method === 'GET') return readLimit(req, res, next)
    return writeLimit(req, res, next)
})

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/scores', scoresRouter)

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
})

// ── React client-side routing ───────────────────────────────

if (fs.existsSync(frontendPath)) {
    // Handle React client-side routing — serve index.html for all
    // non-API routes so that refreshing a page works correctly
    app.get('/{*path}', (req, res) => {
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
