import dotenv from 'dotenv'
import fs from 'fs'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import path from 'path'
import pool from '../db/pool'

dotenv.config()

// ── Configuration ─────────────────────────────────────────────
const SCORES_FOLDER = process.env.SCORES_FOLDER || './scores'
const OWNER_EMAIL = process.env.ADMIN_EMAIL || 'your@email.com'
// ─────────────────────────────────────────────────────────────

async function migrateScores() {
    const scoresFolderPath = path.resolve(SCORES_FOLDER)

    if (!fs.existsSync(scoresFolderPath)) {
        console.error(`Scores folder not found: ${scoresFolderPath}`)
        process.exit(1)
    }

    const [ownerRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [OWNER_EMAIL])

    if (!ownerRows[0]) {
        console.error(`User not found: ${OWNER_EMAIL}`)
        console.error('Run the createAdminUser seed script first.')
        process.exit(1)
    }

    const ownerId = ownerRows[0].id
    console.log(`Migrating scores as user: ${OWNER_EMAIL} (id: ${ownerId})`)

    const files = fs.readdirSync(scoresFolderPath).filter((f) => f.endsWith('.json'))

    if (files.length === 0) {
        console.log('No JSON files found in scores folder.')
        process.exit(0)
    }

    console.log(`Found ${files.length} file(s) to migrate.`)

    let inserted = 0
    let updated = 0
    let failed = 0

    for (const file of files) {
        const filePath = path.join(scoresFolderPath, file)

        try {
            const raw = fs.readFileSync(filePath, 'utf-8')
            const score = JSON.parse(raw)

            if (!score.uuid || !score.title) {
                console.warn(`  ⚠ Skipping ${file} — missing uuid or title`)
                failed++
                continue
            }

            // Check if this score already exists in the database
            const [existing] = await pool.query<RowDataPacket[]>(
                `SELECT id FROM scores
                 WHERE JSON_UNQUOTE(JSON_EXTRACT(content, '$.uuid')) = ?`,
                [score.uuid]
            )

            if (existing[0]) {
                // Update the existing record with the file's content
                await pool.query<ResultSetHeader>(
                    `UPDATE scores
                     SET title          = ?,
                         instrument_set = ?,
                         content        = ?,
                         updated_at     = NOW()
                     WHERE id = ?`,
                    [score.title, score.instrumenttype ?? 'UNKNOWN', JSON.stringify(score), existing[0].id]
                )
                console.log(`  ↺ Updated:  ${score.title} (${file})`)
                updated++
            } else {
                // Insert as a new record
                await pool.query<ResultSetHeader>(
                    `INSERT INTO scores (owner_id, instrument_set, title, content)
                     VALUES (?, ?, ?, ?)`,
                    [ownerId, score.instrumenttype ?? 'UNKNOWN', score.title, JSON.stringify(score)]
                )
                console.log(`  ✓ Inserted: ${score.title} (${file})`)
                inserted++
            }
        } catch (err) {
            console.error(`  ✗ Failed:   ${file}`, err)
            failed++
        }
    }

    console.log('\n── Migration complete ──────────────────────')
    console.log(`  Inserted : ${inserted}`)
    console.log(`  Updated  : ${updated}`)
    console.log(`  Failed   : ${failed}`)

    await pool.end()
    process.exit(failed > 0 ? 1 : 0)
}

migrateScores()
