import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import pool from '../db/pool'

dotenv.config()

// ── Configuration ─────────────────────────────────────────────
// Set this to the folder containing your JSON score files
const SCORES_FOLDER = process.env.SCORES_FOLDER || './scores'

// The owner of all migrated scores (your admin user)
const OWNER_EMAIL = process.env.ADMIN_EMAIL || 'your@email.com'
// ─────────────────────────────────────────────────────────────

async function migrateScores() {
    // Resolve the scores folder path
    const scoresFolderPath = path.resolve(SCORES_FOLDER)

    if (!fs.existsSync(scoresFolderPath)) {
        console.error(`Scores folder not found: ${scoresFolderPath}`)
        process.exit(1)
    }

    // Get the owner's id from the database
    const ownerResult = await pool.query('SELECT id FROM users WHERE email = $1', [OWNER_EMAIL])

    if (!ownerResult.rows[0]) {
        console.error(`User not found: ${OWNER_EMAIL}`)
        console.error('Run the createAdminUser seed script first.')
        process.exit(1)
    }

    const ownerId = ownerResult.rows[0].id
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
            const existing = await pool.query(`SELECT id FROM scores WHERE content->>'uuid' = $1`, [score.uuid])

            if (existing.rows[0]) {
                console.log(`  ↷ Skipping ${file} — already in database (uuid: ${score.uuid})`)
                skipped++
                continue
            }

            // Insert the score
            await pool.query(
                `INSERT INTO scores (owner_id, instrument_set, title, content)
         VALUES ($1, $2, $3, $4)`,
                [ownerId, score.instrumenttype ?? 'UNKNOWN', score.title, JSON.stringify(score)]
            )

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
