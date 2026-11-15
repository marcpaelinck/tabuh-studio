import dotenv from 'dotenv'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../db/pool'

dotenv.config()

// One-off migration: prefix orchestra-shared position ids (and all Semar Pagulingan positions) so that
// no instrument/position id is shared between orchestras (see CLAUDE.refactor-configuration-settings.md).
// Rewrites the position ids inside every score's `content` JSON, in place. Idempotent per orchestra:
// already-migrated ids are left untouched.

const GK_MAP: Record<string, string> = {
    GONGS: 'GK_GONGS',
    KENDANG: 'GK_KENDANG',
    KENDANG_LANANG: 'GK_KENDANG_LANANG',
    KENDANG_WADON: 'GK_KENDANG_WADON'
}
const BAL_MAP: Record<string, string> = {
    GONGS: 'BAL_GONGS',
    KENDANG: 'BAL_KENDANG',
    KENDANG_LANANG: 'BAL_KENDANG_LANANG',
    KENDANG_WADON: 'BAL_KENDANG_WADON',
    CENGCENG_P: 'BAL_CENGCENG_P',
    CENGCENG_S: 'BAL_CENGCENG_S'
}
const SP_MAP: Record<string, string> = {
    PEMADE_POLOS: 'SP_PEMADE_POLOS',
    PEMADE_SANGSIH: 'SP_PEMADE_SANGSIH',
    KANTILAN_POLOS: 'SP_KANTILAN_POLOS',
    KANTILAN_SANGSIH: 'SP_KANTILAN_SANGSIH',
    CALUNG: 'SP_CALUNG',
    JEGOGAN: 'SP_JEGOGAN',
    TROMPONG: 'SP_TROMPONG',
    GONGS: 'SP_GONGS',
    GENDERRAMBAT: 'SP_GENDER',
    GENDER_RAMBAT: 'SP_GENDER',
    KENDANG: 'SP_KENDANG',
    KENDANG_LANANG: 'SP_KENDANG_LANANG',
    KENDANG_WADON: 'SP_KENDANG_WADON',
    KEMPLI: 'SP_KEMPLI',
    CENGCENG: 'SP_CENGCENG',
    SULING: 'SP_SULING'
}
const MAPS: Record<string, Record<string, string>> = {
    GONG_KEBYAR: GK_MAP,
    BALEGANJUR: BAL_MAP,
    SEMAR_PAGULINGAN: SP_MAP
}

const VALID = new Set(
    `CALUNG CENGCENG GENDER_RAMBAT JEGOGAN KANTILAN_POLOS KANTILAN_SANGSIH KEMPLI PEMADE_POLOS PEMADE_SANGSIH PENYACAH
     REYONG_1 REYONG_2 REYONG_3 REYONG_4 TROMPONG UGAL GK_GONGS GK_KENDANG GK_KENDANG_LANANG GK_KENDANG_WADON
     REYONGB_1 REYONGB_2 TAWATAWA PONGGANG BAL_GONGS BAL_KENDANG BAL_KENDANG_LANANG BAL_KENDANG_WADON BAL_CENGCENG_P BAL_CENGCENG_S
     SP_PEMADE_POLOS SP_PEMADE_SANGSIH SP_KANTILAN_POLOS SP_KANTILAN_SANGSIH SP_CALUNG SP_JEGOGAN SP_TROMPONG SP_GENDER SP_SULING
     SP_GONGS SP_KEMPLI SP_KENDANG SP_KENDANG_LANANG SP_KENDANG_WADON SP_CENGCENG`.split(/\s+/)
)

function remap(content: any): { changed: boolean; unmapped: string[] } {
    const orch: string = content?.instrumenttype
    const map = MAPS[orch]
    if (!map) return { changed: false, unmapped: [] }
    const unmapped: string[] = []
    let changed = false
    const mp = (p: string): string => {
        if (map[p]) {
            if (map[p] !== p) changed = true
            return map[p]
        }
        if (!VALID.has(p) && orch === 'SEMAR_PAGULINGAN') unmapped.push(p)
        return p
    }
    if (Array.isArray(content.positions)) content.positions = content.positions.map(mp)
    for (const s of content.systems ?? []) {
        if (s.staffs && typeof s.staffs === 'object') {
            s.staffs = Object.fromEntries(Object.entries(s.staffs).map(([k, v]) => [mp(k), v]))
        }
        for (const e of s.execution ?? []) {
            if (Array.isArray(e.positions)) e.positions = e.positions.map(mp)
        }
        for (const group of s.groups ?? []) {
            group.positions = group.positions.map((p: string) => mp(p))
        }
    }
    return { changed, unmapped }
}

async function run() {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, content FROM scores')
    let updated = 0
    let skipped = 0
    const problems: string[] = []
    for (const row of rows) {
        const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
        const { changed, unmapped } = remap(content)
        if (unmapped.length) problems.push(`  score id ${row.id}: unmapped ${JSON.stringify([...new Set(unmapped)])}`)
        if (changed) {
            await pool.query<ResultSetHeader>('UPDATE scores SET content = ?, updated_at = NOW() WHERE id = ?', [
                JSON.stringify(content),
                row.id
            ])
            updated++
        } else {
            skipped++
        }
    }
    console.log(`\n── Position-prefix migration complete ──────────`)
    console.log(`  Updated : ${updated}`)
    console.log(`  Skipped : ${skipped} (already migrated / other orchestra)`)
    if (problems.length) {
        console.error('\n!!! Unmapped positions (Semar Pagulingan) — review these scores:')
        problems.forEach((p) => console.error(p))
    }
    await pool.end()
    process.exit(problems.length ? 1 : 0)
}

run()
