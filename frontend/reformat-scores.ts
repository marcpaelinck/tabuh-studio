import * as fs from 'fs'
import * as path from 'path'
import { scoreToFormattedJson } from './src/utils/objectUtils'
import type { Score } from './src/typing/score'

const scoresDir = path.join(__dirname, 'public', 'scores')
const files = fs.readdirSync(scoresDir).filter(f => f.endsWith('.json') && f !== 'content.json')

let reformatted = 0
let errors = 0

for (const file of files.sort()) {
    const filePath = path.join(scoresDir, file)
    try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const score: Score = JSON.parse(raw)
        const formatted = scoreToFormattedJson(score, false)
        fs.writeFileSync(filePath, formatted, 'utf-8')
        console.log(`  ✓  ${file}`)
        reformatted++
    } catch (e) {
        console.error(`  ✗  ${file}: ${e}`)
        errors++
    }
}

console.log(`\nDone — reformatted: ${reformatted}, errors: ${errors}`)
