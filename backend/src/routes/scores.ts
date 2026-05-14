import { Response, Router } from 'express'
import { z } from 'zod'
import pool from '../db/pool'
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const scoreSchema = z.object({
    title: z.string().min(1).max(200),
    instrument_set: z.string().min(1),
    content: z.object({
        notes: z.array(
            z.object({
                pitch: z.enum(['a', 'e', 'i', 'o', 'u']),
                octave: z.enum(['lower', 'middle', 'upper']),
                stroke: z.string(),
                pattern: z.string().optional(),
                duration: z.number().positive()
            })
        ),
        font: z.string().default('letter')
    })
})

// ── Public routes ─────────────────────────────────────────────

router.get('/', async (_req, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT
         s.id,
         s.title,
         s.instrument_set,
         s.created_at,
         u.email AS owner_email,
         s.content->>'uuid' AS uuid,
         s.content->>'notationversion' AS notationversion
       FROM scores s
       JOIN users u ON u.id = s.owner_id
       ORDER BY s.created_at DESC`
        )
        res.json(result.rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.get('/:id', async (req, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT s.*, u.email AS owner_email
       FROM scores s
       JOIN users u ON u.id = s.owner_id
       WHERE s.id = $1`,
            [req.params.id]
        )
        if (!result.rows[0]) {
            res.status(404).json({ error: 'Score not found' })
            return
        }
        res.json(result.rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Editor routes (login + editor role required) ──────────────

router.post(
    '/',
    requireAuth,
    requireRole('editor'),
    validate(scoreSchema),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { title, instrument_set, content } = req.body
            const result = await pool.query(
                `INSERT INTO scores (owner_id, title, instrument_set, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
                [req.user!.id, title, instrument_set, JSON.stringify(content)]
            )
            res.status(201).json(result.rows[0])
        } catch (err) {
            console.error(err)
            res.status(500).json({ error: 'Server error' })
        }
    }
)

router.patch(
    '/:id',
    requireAuth,
    requireRole('editor'),
    validate(scoreSchema.partial()),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Verify ownership or explicit permission
            const check = await pool.query(
                `SELECT 1 FROM scores s
         LEFT JOIN score_permissions sp
           ON sp.score_id = s.id AND sp.user_id = $1 AND sp.can_edit = true
         WHERE s.id = $2
           AND (s.owner_id = $1 OR sp.user_id IS NOT NULL)`,
                [req.user!.id, req.params.id]
            )
            if (!check.rows[0]) {
                res.status(403).json({ error: 'Not allowed to edit this score' })
                return
            }

            const { title, instrument_set, content } = req.body
            const result = await pool.query(
                `UPDATE scores
         SET title = COALESCE($1, title),
             instrument_set = COALESCE($2, instrument_set),
             content = COALESCE($3, content),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
                [title, instrument_set, content ? JSON.stringify(content) : null, req.params.id]
            )
            res.json(result.rows[0])
        } catch (err) {
            console.error(err)
            res.status(500).json({ error: 'Server error' })
        }
    }
)

router.delete('/:id', requireAuth, requireRole('editor'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const check = await pool.query('SELECT 1 FROM scores WHERE id = $1 AND owner_id = $2', [
            req.params.id,
            req.user!.id
        ])
        if (!check.rows[0]) {
            res.status(403).json({ error: 'Only the owner can delete a score' })
            return
        }
        await pool.query('DELETE FROM scores WHERE id = $1', [req.params.id])
        res.status(204).send()
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

export default router
