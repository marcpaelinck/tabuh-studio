import dotenv from 'dotenv'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../db/pool'

dotenv.config()

// Name of the UNIQUE KEY constraint added to scores(uuid).
const UNIQUE_KEY_NAME = 'uq_scores_uuid'

/**
 * One-off maintenance script.
 *
 * Populates the `scores.uuid` column from the `uuid` stored inside each row's
 * JSON `content` (content.$.uuid), then adds a UNIQUE KEY constraint on the
 * column. Safe to run more than once: the UPDATE is idempotent and the
 * constraint is only added if it does not already exist.
 *
 * Run with:  npm run seed:fix-uuid   (uses the DB settings from backend/.env)
 */
async function updateScoreUuids() {
    try {
        // 1. Copy content.$.uuid into the uuid column for every row that has one.
        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE scores
             SET uuid = JSON_UNQUOTE(JSON_EXTRACT(content, '$.uuid'))
             WHERE JSON_EXTRACT(content, '$.uuid') IS NOT NULL`
        )
        console.log(`Populated uuid on ${result.affectedRows} row(s) (${result.changedRows} changed).`)

        // 2. Report any rows whose content has no uuid — these cannot be populated.
        const [missing] = await pool.query<RowDataPacket[]>(
            `SELECT id, title FROM scores WHERE uuid IS NULL OR uuid = ''`
        )
        if (missing.length > 0) {
            console.warn(`⚠ ${missing.length} row(s) still have no uuid (content.$.uuid missing):`)
            missing.forEach((r) => console.warn(`   id=${r.id} title=${r.title}`))
        }

        // 3. Refuse to add the constraint if duplicate uuids exist — report them instead.
        const [dups] = await pool.query<RowDataPacket[]>(
            `SELECT uuid, COUNT(*) AS n
             FROM scores
             WHERE uuid IS NOT NULL AND uuid <> ''
             GROUP BY uuid
             HAVING n > 1`
        )
        if (dups.length > 0) {
            console.error(`✗ Cannot add UNIQUE KEY: ${dups.length} duplicate uuid value(s):`)
            dups.forEach((r) => console.error(`   ${r.uuid} (${r.n}×)`))
            console.error('  Resolve the duplicates and re-run.')
            await pool.end()
            process.exit(1)
        }

        // 4. Add the UNIQUE KEY constraint, unless it already exists.
        const [existingIndex] = await pool.query<RowDataPacket[]>(
            `SELECT 1
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scores' AND INDEX_NAME = ?`,
            [UNIQUE_KEY_NAME]
        )
        if (existingIndex.length > 0) {
            console.log(`UNIQUE KEY '${UNIQUE_KEY_NAME}' already exists — skipping.`)
        } else {
            // Identifiers cannot be parameterised; UNIQUE_KEY_NAME is a fixed constant.
            await pool.query<ResultSetHeader>(`ALTER TABLE scores ADD UNIQUE KEY ${UNIQUE_KEY_NAME} (uuid)`)
            console.log(`Added UNIQUE KEY '${UNIQUE_KEY_NAME}' on scores(uuid).`)
        }

        console.log('\n── uuid backfill complete ──')
        await pool.end()
        process.exit(0)
    } catch (err) {
        console.error('Error updating score uuids:', err)
        await pool.end()
        process.exit(1)
    }
}

updateScoreUuids()
