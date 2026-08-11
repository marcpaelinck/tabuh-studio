import { Response, Router } from 'express'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import { z } from 'zod'
import pool from '../db/pool'
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const groupSchema = z.object({
    name: z.string().trim().min(1).max(150),
    city: z.string().max(150).nullish(),
    country: z.string().max(150).nullish(),
    contactName: z.string().max(150).nullish(),
    contactEmail: z.string().max(255).nullish(),
    website: z.string().max(255).nullish()
})
const groupUpdateSchema = groupSchema.partial()

// JSON_ARRAYAGG may arrive parsed (array) or as a JSON string depending on the driver; handle both.
function toIdArray(v: unknown): number[] {
    if (Array.isArray(v)) return v as number[]
    if (typeof v === 'string') {
        try {
            return JSON.parse(v)
        } catch {
            return []
        }
    }
    return []
}

function groupView(row: RowDataPacket) {
    return {
        id: row.id,
        name: row.name,
        city: row.city,
        country: row.country,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        website: row.website,
        managerIds: toIdArray(row.managerIds),
        scoreCount: Number(row.scoreCount ?? 0)
    }
}

/** True if the user may manage the given group (admin, or listed in group_managers). */
async function canManageGroup(userId: number, role: string, groupId: number): Promise<boolean> {
    if (role === 'admin') return true
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT 1 FROM group_managers WHERE group_id = ? AND user_id = ? LIMIT 1',
        [groupId, userId]
    )
    return rows.length > 0
}

// List all groups (any logged-in user — needed for subscriptions and filtering). `managedByMe`
// marks the groups the caller may manage (admins manage all), so an editor's UI can show only
// their groups' repertoire.
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId, role } = req.user!
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT g.*,
              (SELECT JSON_ARRAYAGG(gm.user_id) FROM group_managers gm WHERE gm.group_id = g.id) AS managerIds,
              (SELECT COUNT(*) FROM group_scores gs WHERE gs.group_id = g.id) AS scoreCount,
              (? = 'admin' OR EXISTS(SELECT 1 FROM group_managers gm2 WHERE gm2.group_id = g.id AND gm2.user_id = ?)) AS managedByMe
       FROM music_groups g
       ORDER BY g.name`,
            [role, userId]
        )
        res.json({ groups: rows.map((r) => ({ ...groupView(r), managedByMe: Boolean(r.managedByMe) })) })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// ── Admin: create / edit / delete groups ──────────────────────────────

router.post('/', requireAuth, requireRole('admin'), validate(groupSchema), async (req: AuthenticatedRequest, res: Response) => {
    const { name, city, country, contactName, contactEmail, website } = req.body
    try {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM music_groups WHERE name = ?', [name])
        if (existing.length) {
            res.status(409).json({ error: 'A group with this name already exists.' })
            return
        }
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO music_groups (name, city, country, contact_name, contact_email, website)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [name, city ?? null, country ?? null, contactName ?? null, contactEmail ?? null, website ?? null]
        )
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM music_groups WHERE id = ?', [result.insertId])
        res.status(201).json({ group: groupView(rows[0]) })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.patch('/:id', requireAuth, requireRole('admin'), validate(groupUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id)
    const b = req.body as Record<string, string | null | undefined>
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Invalid group id.' })
        return
    }
    try {
        await pool.query(
            `UPDATE music_groups SET
         name          = COALESCE(?, name),
         city          = COALESCE(?, city),
         country       = COALESCE(?, country),
         contact_name  = COALESCE(?, contact_name),
         contact_email = COALESCE(?, contact_email),
         website       = COALESCE(?, website)
       WHERE id = ?`,
            [
                b.name ?? null,
                b.city ?? null,
                b.country ?? null,
                b.contactName ?? null,
                b.contactEmail ?? null,
                b.website ?? null,
                id
            ]
        )
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT g.*,
              (SELECT JSON_ARRAYAGG(gm.user_id) FROM group_managers gm WHERE gm.group_id = g.id) AS managerIds,
              (SELECT COUNT(*) FROM group_scores gs WHERE gs.group_id = g.id) AS scoreCount
       FROM music_groups g WHERE g.id = ?`,
            [id]
        )
        if (!rows[0]) {
            res.status(404).json({ error: 'Group not found.' })
            return
        }
        res.json({ group: groupView(rows[0]) })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.delete('/:id', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Invalid group id.' })
        return
    }
    try {
        await pool.query('DELETE FROM music_groups WHERE id = ?', [id])
        res.status(204).send()
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// Admin: set the group's editor-managers (replaces the set).
const managersSchema = z.object({ userIds: z.array(z.number().int()) })
router.put('/:id/managers', requireAuth, requireRole('admin'), validate(managersSchema), async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id)
    const { userIds } = req.body as { userIds: number[] }
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Invalid group id.' })
        return
    }
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        await conn.query('DELETE FROM group_managers WHERE group_id = ?', [id])
        if (userIds.length) {
            await conn.query('INSERT INTO group_managers (group_id, user_id) VALUES ?', [
                userIds.map((uid) => [id, uid])
            ])
        }
        await conn.commit()
        res.json({ ok: true })
    } catch (err) {
        await conn.rollback()
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    } finally {
        conn.release()
    }
})

// ── Repertoire (admin or a group manager) ─────────────────────────────

router.get('/:id/scores', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Invalid group id.' })
        return
    }
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT s.id, s.uuid, s.title, s.instrument_set
       FROM group_scores gs JOIN scores s ON s.id = gs.score_id
       WHERE gs.group_id = ? ORDER BY s.title`,
            [id]
        )
        res.json({ scores: rows })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

const addScoreSchema = z.object({ scoreId: z.number().int() })
router.post('/:id/scores', requireAuth, validate(addScoreSchema), async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id)
    const { scoreId } = req.body as { scoreId: number }
    const { id: userId, role } = req.user!
    if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'Invalid group id.' })
        return
    }
    try {
        if (!(await canManageGroup(userId, role, id))) {
            res.status(403).json({ error: 'You are not allowed to manage this group.' })
            return
        }
        // Any score may be added (no ownership check, per spec). Idempotent.
        await pool.query('INSERT IGNORE INTO group_scores (group_id, score_id) VALUES (?, ?)', [id, scoreId])
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

router.delete('/:id/scores/:scoreId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id)
    const scoreId = Number(req.params.scoreId)
    const { id: userId, role } = req.user!
    if (!Number.isInteger(id) || !Number.isInteger(scoreId)) {
        res.status(400).json({ error: 'Invalid id.' })
        return
    }
    try {
        if (!(await canManageGroup(userId, role, id))) {
            res.status(403).json({ error: 'You are not allowed to manage this group.' })
            return
        }
        await pool.query('DELETE FROM group_scores WHERE group_id = ? AND score_id = ?', [id, scoreId])
        res.status(204).send()
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

// Groups whose repertoire includes a given score (read-only, shown in Score details).
router.get('/for-score/:uuid', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT g.id, g.name
       FROM group_scores gs
       JOIN scores s ON s.id = gs.score_id
       JOIN music_groups g ON g.id = gs.group_id
       WHERE s.uuid = ? ORDER BY g.name`,
            [req.params.uuid]
        )
        res.json({ groups: rows })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Server error' })
    }
})

export default router
