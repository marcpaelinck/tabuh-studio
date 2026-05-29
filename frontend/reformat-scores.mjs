// Reformats all score JSON files using the same logic as scoreToFormattedJson in objectUtils.ts.
// Run with: node frontend/reformat-scores.mjs

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scoresDir = path.join(__dirname, 'public', 'scores')

function scoreToFormattedJson(score) {
    const flatten = (key, value) => {
        if (/^(execution|staff|group|positions)$/.test(key) && value) {
            const json = value.map((item) => JSON.stringify(item))
            if (key !== 'execution') return '[' + json.join(', ') + ']'
            return json
        }
        if (/^[A-Z][A-Z\d_]+$/.test(key) && value && typeof value === 'object' && 'notation' in value) {
            return JSON.stringify(value)
        }
        if (key === 'starttime') return undefined
        return value
    }

    const json = JSON.stringify(score, flatten, 2)
    return json
        .replace(/"([\{\[])/g, '$1')
        .replace(/([\}\]])"/g, '$1')
        .replace(/\\"/g, '"')
        .replace(/:(?! )/g, ': ')
        .replace(/([\]\}\d"]),"/g, '$1, "')
        .replace(/(true|false),(?![ \n\r])/g, '$1, ')
        .replace(/([\d]),(?=\d)/g, '$1, ')
}

const files = fs.readdirSync(scoresDir)
    .filter(f => f.endsWith('.json') && f !== 'content.json')
    .sort()

let ok = 0, errors = 0
for (const file of files) {
    const filePath = path.join(scoresDir, file)
    try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const score = JSON.parse(raw)
        const formatted = scoreToFormattedJson(score)
        // Validate before writing
        JSON.parse(formatted)
        fs.writeFileSync(filePath, formatted, 'utf-8')
        console.log(`  ✓  ${file}`)
        ok++
    } catch (e) {
        console.error(`  ✗  ${file}: ${e.message}`)
        errors++
    }
}
console.log(`\nDone — ok: ${ok}, errors: ${errors}`)
