//
// Step 2 invariant check: the canonical compact `groups` must reproduce the parser's
// expanded `staffs`.
//
// For every fixture, parse it (which now populates system.groups), then re-derive the
// staffs from those groups alone via expandSystem() and compare against the parser's
// staffs. COPY systems are skipped (not yet represented in groups — see CLAUDE.dual-editor.md).
//
// Usage (from the `frontend` folder):  npm run test:groups
//
import fs from 'fs'
import path from 'path'
import { expandSystem } from '../../src/componentlogic/expandNotation.ts'
import { parseNotation } from '../../src/scoreparsers/tabuhParser.ts'
import type { System } from '../../src/typing/score.ts'
import { tabuhScores } from '../scoreparsers/notationParser/testdata.ts'

const DATA_DIR = './test/scoreparsers/notationParser/data/tabuh-notation'

function staffNotations(system: System): Record<string, string[]> {
    const out: Record<string, string[]> = {}
    for (const [pos, staff] of Object.entries(system.staffs)) {
        if (staff) out[pos] = staff.notation
    }
    return out
}

function run() {
    let failures = 0
    let systemsChecked = 0
    let systemsSkipped = 0

    for (const file of Object.values(tabuhScores)) {
        const tsvPath = path.join(DATA_DIR, file)
        if (!fs.existsSync(tsvPath)) {
            console.log(`SKIP  ${file} (fixture not found)`)
            continue
        }
        const { score } = parseNotation(fs.readFileSync(tsvPath, 'utf-8'))
        if (!score) {
            console.log(`FAIL  ${file} (no score produced)`)
            failures++
            continue
        }

        const mismatches: string[] = []
        for (const system of score.systems) {
            if (system.copyFromUuid) {
                systemsSkipped++
                continue
            }
            systemsChecked++

            const expected = JSON.stringify(staffNotations(system))
            const expectedKempli = JSON.stringify(system.kempli)

            // Re-derive from groups only, starting from the same blank kempli the parser used.
            const rebuilt = {
                groups: system.groups,
                castingInstructions: system.castingInstructions,
                execution: system.execution,
                kempli: { state: 'on' },
                staffs: {}
            } as unknown as System
            expandSystem(rebuilt)

            if (JSON.stringify(staffNotations(rebuilt)) !== expected) {
                mismatches.push(`system ${system.id}: staffs differ`)
            } else if (JSON.stringify(rebuilt.kempli) !== expectedKempli) {
                mismatches.push(`system ${system.id}: kempli differs`)
            }
        }

        if (mismatches.length === 0) {
            console.log(`OK    ${file}`)
        } else {
            failures++
            console.log(`FAIL  ${file}`)
            mismatches.slice(0, 5).forEach((m) => console.log(`        ${m}`))
            if (mismatches.length > 5) console.log(`        ...and ${mismatches.length - 5} more`)
        }
    }

    console.log(`\n${systemsChecked} systems checked, ${systemsSkipped} COPY systems skipped.`)
    if (failures > 0) {
        console.log(`${failures} fixture(s) FAILED.`)
        process.exitCode = 1
    } else {
        console.log('All groups reproduce the parser staffs.')
    }
}

run()
