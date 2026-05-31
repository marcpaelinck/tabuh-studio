/**
 * Custom Node.js ESM loader for running TypeScript source files directly.
 *
 * Handles:
 *  - Bare module specifiers (lodash, uuid, @lezer/common, …) resolved from
 *    the frontend/node_modules directory.
 *  - Relative imports with missing file extensions (.ts and .js tried in order).
 *
 * Usage (run from the frontend/ directory):
 *   node --experimental-transform-types \
 *        --loader ./scripts/ts_loader.mjs \
 *        ./scripts/<your-script>.ts [args...]
 */

import { existsSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, resolve as pathResolve, join } from 'path'

// Resolve bare specifiers from this directory's node_modules.
const LOADER_DIR = dirname(fileURLToPath(import.meta.url))
const NODE_MODULES = join(LOADER_DIR, '..', 'node_modules')

function resolveNodeModule(specifier) {
    const parts = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0]

    const subpath = specifier.substring(parts.length)
    const pkgJsonPath = join(NODE_MODULES, parts, 'package.json')
    if (!existsSync(pkgJsonPath)) return null

    try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))

        if (!subpath) {
            // Root import – check exports, module, main in order.
            if (pkg.exports) {
                const exp = pkg.exports
                let entry = null
                if (typeof exp === 'string') {
                    entry = exp
                } else if (exp['.']) {
                    const dot = exp['.']
                    if (typeof dot === 'string') entry = dot
                    else if (typeof dot === 'object') {
                        entry = dot.import ?? dot.default ?? dot.require
                        if (typeof entry === 'object') entry = entry.default ?? null
                    }
                } else if (typeof exp === 'object') {
                    entry = exp.import ?? exp.default ?? exp.require
                    if (typeof entry === 'object') entry = entry.default ?? null
                }
                if (entry && typeof entry === 'string') {
                    const full = join(NODE_MODULES, parts, entry)
                    if (existsSync(full)) return full
                }
            }
            if (pkg.module) {
                const full = join(NODE_MODULES, parts, pkg.module)
                if (existsSync(full)) return full
            }
            if (pkg.main) {
                const full = join(NODE_MODULES, parts, pkg.main)
                if (existsSync(full)) return full
            }
            const idx = join(NODE_MODULES, parts, 'index.js')
            if (existsSync(idx)) return idx
        } else {
            // Subpath import, e.g. 'lodash/fp'.
            const full = join(NODE_MODULES, parts, subpath)
            if (existsSync(full)) return full
            if (existsSync(full + '.js')) return full + '.js'
        }
    } catch (e) {
        console.error('ts_loader: error resolving', specifier, e.message)
    }
    return null
}

export async function resolve(specifier, context, nextResolve) {
    const { parentURL } = context

    // Bare module specifier → resolve from frontend/node_modules.
    if (
        !specifier.startsWith('.') &&
        !specifier.startsWith('/') &&
        !specifier.startsWith('file:') &&
        !specifier.startsWith('node:')
    ) {
        const resolved = resolveNodeModule(specifier)
        if (resolved) {
            return { url: pathToFileURL(resolved).href, shortCircuit: true }
        }
    }

    // Relative import with missing extension → try .ts then .js.
    if (parentURL && specifier.startsWith('.')) {
        const parentPath = fileURLToPath(parentURL)
        const dir = dirname(parentPath)
        const resolved = pathResolve(dir, specifier)

        if (!resolved.match(/\.[a-zA-Z]+$/)) {
            if (existsSync(resolved + '.ts')) return { url: pathToFileURL(resolved + '.ts').href, shortCircuit: true }
            if (existsSync(resolved + '.js')) return { url: pathToFileURL(resolved + '.js').href, shortCircuit: true }
            if (existsSync(resolved + '/index.js')) return { url: pathToFileURL(resolved + '/index.js').href, shortCircuit: true }
        }
    }

    return nextResolve(specifier, context)
}
