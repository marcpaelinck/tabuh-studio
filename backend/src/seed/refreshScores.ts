import dotenv from 'dotenv'
import fs from 'fs'
import { RowDataPacket } from 'mysql2'
import path from 'path'
import pool from '../db/pool'

dotenv.config()

// Refresh the bundled score files from the database:
//   1. download every score's `content` JSON from the DB,
//   2. reapply the orchestra-unique position-id migration (see prefixPositions.ts / step 5),
//   3. re-serialise with the exact `scoreToFormattedJson` formatting used by the app,
//   4. write back into SCORES_FOLDER, matched to existing files by uuid (new scores → `<title>.json`).
//
// Run on a machine that can reach the DB:  npm run seed:refresh-scores

const SCORES_FOLDER = process.env.SCORES_FOLDER || './scores'

// ── scoreToFormattedJson — VERBATIM copy of frontend/src/utils/objectUtils.ts ───────────────────
// (kept byte-for-byte identical except `_.toPairs(sys.staffs)` → `Object.entries(sys.staffs ?? {})`,
// to avoid pulling in lodash / the frontend module graph. Keep in sync if the original changes.)
const scoreKeyOrder = ['uuid', 'title', 'composer', 'instrumenttype', 'positions', 'parts', 'systems']
const systemKeyOrder = ['uuid', 'id', 'index', 'execution', 'kempli', 'line', 'groups', 'staffs', 'kempli']

function reorderKeys<T extends object>(obj: T, keyOrder: string[]): T {
    const reordered: any = {}
    for (const key of keyOrder) {
        if (key in obj) reordered[key] = (obj as any)[key]
    }
    for (const key of Object.keys(obj)) {
        if (!keyOrder.includes(key)) reordered[key] = (obj as any)[key]
    }
    return reordered as T
}

function scoreToFormattedJson(score: any, clearCache: boolean = true): string {
    if (clearCache) {
        score.systems.forEach((sys: any) =>
            Object.entries(sys.staffs ?? {}).forEach(([, staff]: [string, any]) => {
                if (staff) delete staff.notation_
            })
        )
    }

    // Reorder Score and System keys before serialisation
    const orderedScore = reorderKeys(
        { ...score, systems: score.systems.map((sys: any) => reorderKeys(sys, systemKeyOrder)) },
        scoreKeyOrder
    )

    const flatten = (key: string, value: any) => {
        if (/^(execution|notation|positions)$/.test(key) && value) {
            var json = value.map((item: any) => {
                return JSON.stringify(item)
            })
            if (key != 'execution') json = '[' + json.join(', ') + ']'
            return json
        }
        // Flatten staffs
        if (/^[A-Z][A-Z\d_]+$/.test(key) && value && typeof value === 'object' && 'notation' in value) {
            // Staff object: inline it
            return JSON.stringify(value)
        }
        if (key == 'starttime') {
            return undefined
        }
        return value
    }

    const json = JSON.stringify(orderedScore, flatten, 2)
    return json
        .replace(/"([\{\[])/g, '$1')
        .replace(/([\}\]])"/g, '$1')
        .replace(/\\"/g, '"')
        .replace(/(?<="):(?! )/g, ': ')
        .replace(/([\]\}\d"]),"/g, '$1, "')
        .replace(/(true|false),(?![ \n\r])/g, '$1, ')
        .replace(/([\d]),(?=\d)/g, '$1, ')
}

// ── Orchestra-unique position-id migration (same maps as prefixPositions.ts) ────────────────────
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

function remapPositions(content: any, unmapped: Set<string>): void {
    const map = MAPS[content?.instrumenttype]
    if (!map) return
    const orch = content.instrumenttype
    const mp = (p: string): string => {
        if (map[p]) return map[p]
        if (!VALID.has(p) && orch === 'SEMAR_PAGULINGAN') unmapped.add(p)
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
}

// ── Runner ──────────────────────────────────────────────────────────────────────────────────────
function sanitizeFilename(title: string): string {
    return (
        title
            .trim()
            .replace(/[<>:"/\\|?*]+/g, '')
            .replace(/\s+/g, ' ') + '.json'
    )
}

async function run() {
    const folder = path.resolve(SCORES_FOLDER)
    if (!fs.existsSync(folder)) {
        console.error(`Scores folder not found: ${folder}`)
        process.exit(1)
    }

    // Map existing files by the uuid they contain, so we overwrite in place and keep filenames.
    const uuidToFile: Record<string, string> = {}
    for (const f of fs.readdirSync(folder).filter((f) => f.endsWith('.json'))) {
        try {
            const j = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf-8'))
            if (j && typeof j === 'object' && j.uuid) uuidToFile[j.uuid] = f
        } catch {
            /* skip non-score json (e.g. an index file) */
        }
    }

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, content FROM scores')
    let written = 0,
        created = 0
    const problems: string[] = []
    const newFiles: string[] = []

    for (const row of rows) {
        const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
        if (!content?.uuid) {
            problems.push(`  score id ${row.id}: content has no uuid — skipped`)
            continue
        }
        const unmapped = new Set<string>()
        remapPositions(content, unmapped)
        if (unmapped.size)
            problems.push(`  ${content.title} (${content.uuid}): unmapped ${JSON.stringify([...unmapped])}`)

        const formatted = scoreToFormattedJson(content)
        let filename = uuidToFile[content.uuid]
        if (!filename) {
            filename = sanitizeFilename(content.title || content.uuid)
            newFiles.push(filename)
            created++
        }
        // Existing bundled files use CRLF (Windows); match that so the diff shows only real changes.
        fs.writeFileSync(path.join(folder, filename), formatted.replace(/\r?\n/g, '\r\n'), 'utf-8')
        written++
    }

    console.log(`\n── Refresh complete ────────────────────────`)
    console.log(`  Written : ${written} file(s) (${created} new)`)
    if (newFiles.length) {
        console.log('  New files (no existing uuid match — check the names):')
        newFiles.forEach((f) => console.log(`    + ${f}`))
    }
    if (problems.length) {
        console.error('\n!!! Review:')
        problems.forEach((p) => console.error(p))
    }
    await pool.end()
    process.exit(problems.length ? 1 : 0)
}

run()
