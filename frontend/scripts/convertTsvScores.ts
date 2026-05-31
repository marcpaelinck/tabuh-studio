/**
 * Converts .tsv score files to formatted .json files using tabuhParser.parseNotation.
 *
 * Run from the frontend/ directory:
 *
 *   node --experimental-transform-types \
 *        --loader ./scripts/ts_loader.mjs \
 *        ./scripts/convertTsvScores.ts <folder>
 *
 * Example:
 *   node --experimental-transform-types \
 *        --loader ./scripts/ts_loader.mjs \
 *        ./scripts/convertTsvScores.ts \
 *        ./test/scoreparsers/notationParser/data/tabuh-notation
 *
 * Post-processing applied after parsing:
 *   - Parser-internal fields (line, editorGroup) are stripped from each system.
 *   - The KEMPLI staff is removed from system.staffs when kempli.state is 'on' or 'off'
 *     (the kempli notation is redundant in those cases), but kept in score.positions.
 *   - Score and System keys are ordered canonically before serialisation.
 *   - Output is formatted with scoreToFormattedJson (staves/positions inlined per line).
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import _ from 'lodash'
import { basename, extname, join } from 'path'
import { positionOrder, scoreKeyOrder, systemKeyOrder } from '../src/config/config.ts'
import { parseNotation } from '../src/scoreparsers/tabuhParser.ts'
import type { Score, System } from '../src/typing/score.ts'

// ---------------------------------------------------------------------------
// Key ordering
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------

function postProcess(score: Score): void {
    for (const sys of score.systems) {
        // Strip parser-internal fields not part of the System type.
        delete (sys as any).line
        delete (sys as any).editorGroup

        // Remove the KEMPLI staff when the state is derived from it ('on' or 'off');
        // the staff's notation is redundant once the state and frequency are known.
        if (sys.kempli.state === 'on' || sys.kempli.state === 'off') {
            delete sys.staffs['KEMPLI']
        }
    }
}

// ---------------------------------------------------------------------------
// JSON formatting (mirrors scoreToFormattedJson in objectUtils.ts, without
// the playbackPatternManager dependency that would pull in Tone.js)
// ---------------------------------------------------------------------------

function scoreToFormattedJson(score: Score): string {
    // Clear any cached notation_ fields.
    score.systems.forEach((sys: System) =>
        _.toPairs(sys.staffs).forEach(([_, staff]) => {
            if (staff) delete (staff as any).notation_
        })
    )

    const orderedScore = reorderKeys(
        {
            ...score,
            systems: score.systems.map((sys: System) => {
                return { ...reorderKeys(sys, systemKeyOrder), staffs: reorderKeys(sys.staffs, positionOrder) }
            })
        },
        scoreKeyOrder
    )

    const flatten = (key: string, value: any) => {
        // Inline array values for execution items, staff arrays, group arrays, and positions.
        if (/^(execution|staff|group|positions)$/.test(key) && value) {
            const json = value.map((item: any) => JSON.stringify(item))
            return key !== 'execution' ? '[' + json.join(', ') + ']' : json
        }
        // Inline individual staff objects (ALL_CAPS key with a 'notation' property).
        if (/^[A-Z][A-Z\d_]+$/.test(key) && value && typeof value === 'object' && 'notation' in value) {
            return JSON.stringify(value)
        }
        // Strip internal starttime fields.
        if (key === 'starttime') return undefined
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const folder = process.argv[2]
if (!folder) {
    console.error(
        'Usage: node --experimental-transform-types --loader ./scripts/ts_loader.mjs ./scripts/convertTsvScores.ts <folder>'
    )
    process.exit(1)
}

const files = readdirSync(folder).filter((f: string) => extname(f) === '.tsv')
if (files.length === 0) {
    console.warn(`No .tsv files found in ${folder}`)
    process.exit(0)
}

let success = 0
let failed = 0

for (const file of files) {
    const tsvPath = join(folder, file)
    const jsonPath = join(folder, basename(file, '.tsv') + '.json')
    try {
        const content = readFileSync(tsvPath, 'utf-8')
        const result = parseNotation(content)
        if (result.score) {
            postProcess(result.score)
            const json = scoreToFormattedJson(result.score)
            writeFileSync(jsonPath, json + '\n', 'utf-8')
            console.log(`OK:     ${file}`)
            success++
        } else {
            console.error(`FAILED: ${file}: parsed file is empty`)
            failed++
        }
    } catch (e: any) {
        console.error(`FAILED: ${file}: ${e.message}`)
        failed++
    }
}

console.log(`\n${success} converted, ${failed} failed`)
