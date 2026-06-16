/**
 * Parses all .tsv notation files in a folder with the tabuh parser and either
 *   - writes each result as a formatted .json file next to the .tsv, or
 *   - saves each result to the database via the REST API (creating new scores
 *     and updating existing ones, matched by uuid).
 *
 * A score's uuid comes from the `uuid` property in the .tsv INFO section when
 * present; otherwise the parser generates one. So a .tsv with a uuid updates the
 * matching score, and a .tsv without one creates a new score.
 *
 * DB mode goes through the public API (login + /api/scores) rather than talking
 * to MySQL directly, so it keeps working unchanged if the database schema changes.
 *
 * Run from the frontend/ directory:
 *
 *   node --experimental-transform-types --loader ./scripts/ts_loader.mjs \
 *        ./scripts/importTsvScores.ts <file|db> [folder] [--target=<name>]
 *
 * Examples:
 *   # Write .json files next to the .tsv files (default folder):
 *   node ... ./scripts/importTsvScores.ts file
 *
 *   # Save/update scores in the local DB (loads scripts/.env.local):
 *   node ... ./scripts/importTsvScores.ts db --target=local
 *
 *   # Save/update scores in the remote DB (loads scripts/.env.remote):
 *   node ... ./scripts/importTsvScores.ts db --target=remote
 *
 * Connection settings (DB mode) come from scripts/.env.<target> — see
 * scripts/.env.example. Any variable already set in the shell takes precedence,
 * so you can also override ad hoc. Recognised variables:
 *   TABUH_API_BASE   API base URL        (default http://localhost:3001/api)
 *   TABUH_EMAIL      editor/admin email  (required)
 *   TABUH_PASSWORD   password            (required)
 *
 * The target defaults to the TABUH_TARGET env var, or 'local'.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import _ from 'lodash'
import { basename, dirname, extname, join } from 'path'
import { fileURLToPath } from 'url'
import { positionOrder, scoreKeyOrder, systemKeyOrder } from '../src/config/config.ts'
import { parseNotation } from '../src/scoreparsers/tabuhParser.ts'
import type { Score, System } from '../src/typing/score.ts'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_FOLDER = './test/scoreparsers/notationParser/data/tabuh-notation'

// ---------------------------------------------------------------------------
// Environment files — scripts/.env.<target>
// ---------------------------------------------------------------------------

/**
 * Loads KEY=VALUE pairs from an env file into process.env. Existing environment
 * variables are NOT overwritten, so a value set in the shell always wins. Simple
 * parser (no interpolation); surrounding single/double quotes are stripped.
 */
function loadEnvFile(path: string): boolean {
    if (!existsSync(path)) return false
    for (const rawLine of readFileSync(path, 'utf-8').split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const key = line.slice(0, eq).trim()
        let value = line.slice(eq + 1).trim()
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }
        if (!(key in process.env)) process.env[key] = value
    }
    return true
}

// ---------------------------------------------------------------------------
// Post-processing — produce a clean, storable Score
// ---------------------------------------------------------------------------

function postProcess(score: Score): void {
    for (const sys of score.systems) {
        // Strip parser-/editor-internal fields not meant for storage.
        delete (sys as any).line
        delete (sys as any).editorGroup

        // Remove the KEMPLI staff when the state is derived from it ('on' or 'off');
        // the staff's notation is redundant once state and frequency are known.
        if (sys.kempli.state === 'on' || sys.kempli.state === 'off') {
            delete sys.staffs['KEMPLI']
        }

        // Drop the NoteObject caches — only the raw `notation` belongs in storage.
        _.values(sys.staffs).forEach((staff) => {
            if (!staff) return
            delete (staff as any).objNotation
            delete (staff as any).objNotation_
            delete (staff as any).notation_
        })
        sys.notationGroups?.forEach((group) =>
            group.staff.forEach((staff) => {
                delete (staff as any).objNotation
                delete (staff as any).objNotation_
                delete (staff as any).notation_
            })
        )
    }
}

// ---------------------------------------------------------------------------
// JSON formatting (mirrors scoreToFormattedJson in objectUtils.ts, without the
// playbackStrokeManager dependency that would pull in Tone.js)
// ---------------------------------------------------------------------------

function reorderKeys<T extends object>(obj: T, keyOrder: string[]): T {
    const reordered: any = {}
    for (const key of keyOrder) if (key in obj) reordered[key] = (obj as any)[key]
    for (const key of Object.keys(obj)) if (!keyOrder.includes(key)) reordered[key] = (obj as any)[key]
    return reordered as T
}

function scoreToFormattedJson(score: Score): string {
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
        if (/^(execution|staff|group|positions)$/.test(key) && value) {
            const json = value.map((item: any) => JSON.stringify(item))
            return key !== 'execution' ? '[' + json.join(', ') + ']' : json
        }
        if (/^[A-Z][A-Z\d_]+$/.test(key) && value && typeof value === 'object' && 'notation' in value) {
            return JSON.stringify(value)
        }
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
// Database mode — save via the REST API
// ---------------------------------------------------------------------------

interface ScoreListItem {
    uuid: string
}

class Api {
    private cookie = ''
    private readonly base: string

    constructor(base: string) {
        this.base = base
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const res = await fetch(`${this.base}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(this.cookie ? { Cookie: this.cookie } : {}),
                ...options.headers
            }
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }))
            throw new Error(`${res.status} ${err.error ?? res.statusText}`)
        }
        return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
    }

    async login(email: string, password: string): Promise<void> {
        const res = await fetch(`${this.base}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }))
            throw new Error(`Login failed: ${res.status} ${err.error ?? res.statusText}`)
        }
        // getSetCookie() exists on Node's (undici) Headers but not in the DOM lib types.
        const headersAny = res.headers as unknown as { getSetCookie?: () => string[] }
        const setCookies =
            typeof headersAny.getSetCookie === 'function'
                ? headersAny.getSetCookie()
                : [res.headers.get('set-cookie') ?? '']
        const access = setCookies.map((c) => c.split(';')[0]).find((c) => c.startsWith('access_token='))
        if (!access) throw new Error('Login succeeded but no access_token cookie was returned')
        this.cookie = access
    }

    async listUuids(): Promise<Set<string>> {
        const rows = await this.request<ScoreListItem[]>('/scores')
        return new Set(rows.map((r) => r.uuid))
    }

    async create(score: Score): Promise<void> {
        await this.request('/scores', {
            method: 'POST',
            body: JSON.stringify({ title: score.title, instrument_set: score.instrumenttype, content: score })
        })
    }

    async update(score: Score): Promise<void> {
        await this.request(`/scores/${score.uuid}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: score.title, instrument_set: score.instrumenttype, content: score })
        })
    }
}

async function saveToDatabase(
    scores: { file: string; score: Score }[],
    target: string
): Promise<{ ok: number; failed: number }> {
    // Load connection settings for the chosen target (shell env still wins).
    const envFile = join(SCRIPT_DIR, `.env.${target}`)
    if (loadEnvFile(envFile)) console.log(`Using connection settings from ${envFile}`)
    else console.log(`No ${envFile} found; using existing environment variables.`)

    const base = process.env.TABUH_API_BASE ?? 'http://localhost:3001/api'
    const email = process.env.TABUH_EMAIL
    const password = process.env.TABUH_PASSWORD
    if (!email || !password) {
        console.error(
            `DB mode requires TABUH_EMAIL and TABUH_PASSWORD (set them in ${envFile} or in the shell environment).`
        )
        process.exit(1)
    }

    const api = new Api(base)
    console.log(`Target '${target}': logging in to ${base} as ${email} …`)
    await api.login(email, password)
    const existing = await api.listUuids()

    let ok = 0
    let failed = 0
    for (const { file, score } of scores) {
        try {
            if (existing.has(score.uuid)) {
                await api.update(score)
                console.log(`  ↺ updated:  ${score.title} (${file})`)
            } else {
                await api.create(score)
                console.log(`  ✓ created:  ${score.title} (${file})`)
            }
            ok++
        } catch (e: any) {
            console.error(`  ✗ failed:   ${file}: ${e.message}`)
            failed++
        }
    }
    return { ok, failed }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = process.argv.slice(2)
    const flags = args.filter((a) => a.startsWith('--'))
    const positionals = args.filter((a) => !a.startsWith('--'))

    const destination = positionals[0]
    const folder = positionals[1] ?? DEFAULT_FOLDER
    const target = flags.find((f) => f.startsWith('--target='))?.split('=')[1] ?? process.env.TABUH_TARGET ?? 'local'

    if (destination !== 'file' && destination !== 'db') {
        console.error(
            'Usage: node --experimental-transform-types --loader ./scripts/ts_loader.mjs ' +
                './scripts/importTsvScores.ts <file|db> [folder] [--target=<name>]'
        )
        process.exit(1)
    }

    const files = readdirSync(folder).filter((f: string) => extname(f) === '.tsv')
    if (files.length === 0) {
        console.warn(`No .tsv files found in ${folder}`)
        process.exit(0)
    }
    console.log(`Parsing ${files.length} .tsv file(s) in ${folder} …`)

    // Parse every file first; collect successes and report parse failures.
    const parsed: { file: string; score: Score }[] = []
    let parseFailed = 0
    for (const file of files) {
        try {
            const content = readFileSync(join(folder, file), 'utf-8')
            const result = parseNotation(content)
            if (result.errors.length > 0) {
                console.error(`  ✗ parse errors in ${file}:\n      ${result.errors.join('\n      ')}`)
                parseFailed++
                continue
            }
            if (!result.score) {
                console.error(`  ✗ ${file}: parser returned no score`)
                parseFailed++
                continue
            }
            postProcess(result.score)
            parsed.push({ file, score: result.score })
        } catch (e: any) {
            console.error(`  ✗ ${file}: ${e.message}`)
            parseFailed++
        }
    }

    if (destination === 'file') {
        let ok = 0
        for (const { file, score } of parsed) {
            const jsonPath = join(folder, basename(file, '.tsv') + '.json')
            writeFileSync(jsonPath, scoreToFormattedJson(score) + '\n', 'utf-8')
            console.log(`  ✓ wrote: ${basename(jsonPath)}`)
            ok++
        }
        console.log(`\nfile mode: ${ok} written, ${parseFailed} failed to parse`)
        process.exit(parseFailed > 0 ? 1 : 0)
    } else {
        const { ok, failed } = await saveToDatabase(parsed, target)
        console.log(`\ndb mode (${target}): ${ok} saved, ${failed} failed to save, ${parseFailed} failed to parse`)
        process.exit(failed > 0 || parseFailed > 0 ? 1 : 0)
    }
}

main()
