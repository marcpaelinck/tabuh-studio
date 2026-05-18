import dotenv from 'dotenv'
import fs from 'fs'
import { RowDataPacket } from 'mysql2'
import path from 'path'
import pool from '../db/pool'

dotenv.config()

// ── Configuration ─────────────────────────────────────────────
// Set this to the folder containing your JSON score files
const SCORES_FOLDER = process.env.SCORES_FOLDER || './scores'

// The owner of all migrated scores (your admin user)
const OWNER_EMAIL = process.env.ADMIN_EMAIL || 'marc.paelinck@proton.me'
// ─────────────────────────────────────────────────────────────

async function migrateScores() {
    // Resolve the scores folder path
    const scoresFolderPath = path.resolve(SCORES_FOLDER)

    if (!fs.existsSync(scoresFolderPath)) {
        console.error(`Scores folder not found: ${scoresFolderPath}`)
        process.exit(1)
    }

    // Get the owner's id from the database
    const [ownerRows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [OWNER_EMAIL])

    if (!ownerRows[0]) {
        console.error(`User not found: ${OWNER_EMAIL}`)
        console.error('Run the createAdminUser seed script first.')
        process.exit(1)
    }

    const ownerId = ownerRows[0].id
    console.log(`Migrating scores as user: ${OWNER_EMAIL} (id: ${ownerId})`)

    // Read all JSON files from the scores folder
    const files = fs.readdirSync(scoresFolderPath).filter((f) => f.endsWith('.json'))

    if (files.length === 0) {
        console.log('No JSON files found in scores folder.')
        process.exit(0)
    }

    console.log(`Found ${files.length} file(s) to migrate.`)

    let succeeded = 0
    let skipped = 0
    let failed = 0

    for (const file of files) {
        const filePath = path.join(scoresFolderPath, file)

        try {
            const raw = fs.readFileSync(filePath, 'utf-8')
            const score = JSON.parse(raw)

            // Basic validation — ensure the file looks like a score
            if (!score.uuid || !score.title) {
                console.warn(`  ⚠ Skipping ${file} — missing uuid or title`)
                skipped++
                continue
            }

            // Check if this score has already been migrated (by uuid)
            const [existing] = await pool.query<RowDataPacket[]>(
                `SELECT id FROM scores WHERE JSON_UNQUOTE(JSON_EXTRACT(content, '$.uuid')) = ?`,
                [score.uuid]
            )
            if (existing[0]) {
                console.log(`  ↷ Skipping ${file} — already in database (uuid: ${score.uuid})`)
                skipped++
                continue
            }

            // Insert the score
            await pool.query(`INSERT INTO scores (owner_id, instrument_set, title, content) VALUES (?, ?, ?, ?)`, [
                ownerId,
                score.instrumenttype ?? 'UNKNOWN',
                score.title,
                JSON.stringify(score)
            ])

            console.log(`  ✓ Migrated: ${score.title} (${file})`)
            succeeded++
        } catch (err) {
            console.error(`  ✗ Failed: ${file}`, err)
            failed++
        }
    }

    console.log('\n── Migration complete ──────────────────────')
    console.log(`  Succeeded : ${succeeded}`)
    console.log(`  Skipped   : ${skipped}`)
    console.log(`  Failed    : ${failed}`)

    await pool.end()
    process.exit(failed > 0 ? 1 : 0)
}

migrateScores()
