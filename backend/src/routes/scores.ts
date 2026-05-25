import { Response, Router } from 'express'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { z } from 'zod'
import pool from '../db/pool'
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const scoreSchema = z.object({
    title: z.string().min(1).max(200),
    instrument_set: z.string().min(1),
    content: z.record(z.string(), z.unknown())
})
const scoreUpdateSchema = scoreSchema.partial()

// ── Public routes ─────────────────────────────────────────────

router.get('/', async (_req, res: Response) => {
    try {
        console.log('Submitting query to DB')
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT
         s.id,
         s.title,
         s.instrument_set,
         s.created_at,
         u.email AS owner_email,
         JSON_UNQUOTE(JSON_EXTRACT(s.content, '$.uuid')) AS uuid,
         JSON_UNQUOTE(JSON_EXTRACT(s.content, '$.notationversion')) AS notationversion
       FROM scores s
       JOIN users u ON u.id = s.owner_id
       ORDER BY s.created_at DESC`
        )
        console.log('content of score list:', rows ? rows : rows)
        res.json(rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.get('/:id', async (req, res: Response) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT s.*, u.email AS owner_email
       FROM scores s
       JOIN users u ON u.id = s.owner_id
       WHERE s.id = ?`,
            [req.params.id]
        )
        if (!rows[0]) {
            res.status(404).json({ error: 'Score not found' })
            return
        }
        const record = rows[0]
        // Temporary debug logging
        console.log('content type:', typeof record.content)
        console.log(
            'content value preview:',
            typeof record.content === 'string'
                ? record.content.substring(0, 50)
                : JSON.stringify(record.content).substring(0, 50)
        )

        // Parse content if mysql2 returned it as a string
        if (typeof record.content === 'string') {
            record.content = JSON.parse(record.content)
        }
        res.json(record)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Editor routes ─────────────────────────────────────────────

router.post(
    '/',
    requireAuth,
    requireRole('editor'),
    validate(scoreSchema),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { title, instrument_set, content } = req.body
            const [result] = await pool.query<ResultSetHeader>(
                `INSERT INTO scores (owner_id, instrument_set, title, content)
         VALUES (?, ?, ?, ?)`,
                [req.user!.id, instrument_set, title, JSON.stringify(content)]
            )
            const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM scores WHERE id = ?', [result.insertId])
            res.status(201).json(rows[0])
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
    validate(scoreUpdateSchema.partial()),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Verify ownership or explicit permission
            const [check] = await pool.query<RowDataPacket[]>(
                `SELECT 1 FROM scores s
         LEFT JOIN score_permissions sp
           ON sp.score_id = s.id AND sp.user_id = ? AND sp.can_edit = 1
         WHERE s.id = ?
           AND (s.owner_id = ? OR sp.user_id IS NOT NULL)`,
                [req.user!.id, req.params.id, req.user!.id]
            )
            if (!check[0]) {
                res.status(403).json({ error: 'Not allowed to edit this score' })
                return
            }

            const { title, instrument_set, content } = req.body
            await pool.query(
                `UPDATE scores
         SET title          = COALESCE(?, title),
             instrument_set = COALESCE(?, instrument_set),
             content        = COALESCE(?, content)
         WHERE id = ?`,
                [title ?? null, instrument_set ?? null, content ? JSON.stringify(content) : null, req.params.id]
            )
            const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM scores WHERE id = ?', [req.params.id])
            const record = rows[0]
            console.log(JSON.stringify(record))
            if (typeof record.content === 'string') {
                record.content = JSON.parse(record.content)
            }
            res.json(record)
        } catch (err) {
            console.error(err)
            res.status(500).json({ error: 'Server error' })
        }
    }
)

router.delete('/:id', requireAuth, requireRole('editor'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const [check] = await pool.query<RowDataPacket[]>('SELECT 1 FROM scores WHERE id = ? AND owner_id = ?', [
            req.params.id,
            req.user!.id
        ])
        if (!check[0]) {
            res.status(403).json({ error: 'Only the owner can delete a score' })
            return
        }
        await pool.query('DELETE FROM scores WHERE id = ?', [req.params.id])
        res.status(204).send()
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

export default router
