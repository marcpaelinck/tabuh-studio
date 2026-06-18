//
// Pin-down (golden) test for the compact -> expanded notation pipeline.
//
// It parses every tabuh-notation fixture and snapshots the *expanded* result of each
// system (the flattened per-position notation + the derived kempli setting). The
// snapshot is exactly what the expansion pipeline produces, so it guards
// componentlogic/expandNotation.ts (and the parser that drives it) against accidental
// behaviour changes during the dual-editor refactor.
//
// Usage (run from the `frontend` folder):
//   npm run test:expand:generate   # write/refresh the golden snapshots
//   npm run test:expand            # compare current output against the goldens
//
// To prove a refactor preserved behaviour: generate the goldens on the OLD code first
// (git stash your changes, generate, git stash pop), then run the comparison.
//
import fs from 'fs'
import path from 'path'
import { parseNotation } from '../../src/scoreparsers/tabuhParser.ts'
import type { Score } from '../../src/typing/score.ts'
import { tabuhScores } from '../scoreparsers/notationParser/testdata.ts'

const DATA_DIR = './test/scoreparsers/notationParser/data/tabuh-notation'
const GOLDEN_DIR = './test/componentlogic/golden'

// The slice of a parsed Score we pin down: per system, the derived kempli and the
// flattened notation (string symbols) for each position.
interface SystemSnapshot {
    id: number
    kempli: unknown
    staffs: Record<string, string[]>
}

function snapshotScore(score: Score): SystemSnapshot[] {
    return score.systems.map((system) => {
        const staffs: Record<string, string[]> = {}
        for (const [pos, staff] of Object.entries(system.staffs)) {
            if (staff) staffs[pos] = staff.notation
        }
        return { id: system.id, kempli: system.kempli, staffs }
    })
}

function goldenPath(name: string): string {
    return path.join(GOLDEN_DIR, name.replace(/\.tsv$/, '') + '.json')
}

function run() {
    const generate = process.argv.includes('--generate')
    if (generate && !fs.existsSync(GOLDEN_DIR)) fs.mkdirSync(GOLDEN_DIR, { recursive: true })

    let failures = 0
    let checked = 0

    for (const file of Object.values(tabuhScores)) {
        const tsvPath = path.join(DATA_DIR, file)
        if (!fs.existsSync(tsvPath)) {
            console.log(`SKIP  ${file} (fixture not found)`)
            continue
        }
        const content = fs.readFileSync(tsvPath, 'utf-8')
        const { score } = parseNotation(content)
        if (!score) {
            console.log(`FAIL  ${file} (no score produced)`)
            failures++
            continue
        }
        const snapshot = snapshotScore(score)
        const json = JSON.stringify(snapshot, null, 2)
        const gp = goldenPath(file)

        if (generate) {
            fs.writeFileSync(gp, json)
            console.log(`WROTE ${path.basename(gp)}`)
            continue
        }

        checked++
        if (!fs.existsSync(gp)) {
            console.log(`FAIL  ${file} (no golden — run test:expand:generate first)`)
            failures++
            continue
        }
        const expected = fs.readFileSync(gp, 'utf-8')
        if (expected === json) {
            console.log(`OK    ${file}`)
        } else {
            failures++
            console.log(`FAIL  ${file} (expanded output differs from golden)`)
        }
    }

    if (generate) {
        console.log('\nGoldens written.')
        return
    }
    console.log(`\n${checked - failures}/${checked} fixtures match.`)
    if (failures > 0) process.exitCode = 1
}

run()
