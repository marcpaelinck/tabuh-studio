/**
 * Utilities for working with plain objects (string-keyed).
 */

import _ from 'lodash'
import type { JsonSymbol, Score } from '../typing/types'

/**
 * Return the first key in `obj` whose value === `value` (strict equality).
 * Returns `undefined` when no matching value is found.
 *
 * Example:
 * const obj = { a: 1, b: 2 }
 * findKeyByValue(obj, 2) // -> 'b'
 */
export function findKeyByValue<T>(obj: Record<string, T>, value: T): string | undefined {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (obj[key] === value) return key
        }
    }
    return undefined
}

/**
 * Return the first key in `obj` for which `predicate(value, key)` returns a truthy value.
 * Useful when you need custom comparison (e.g. deep equality or matching a sub-field).
 * Returns `undefined` when no key satisfies the predicate.
 *
 * Example:
 * const obj = { a: { id: 'x' }, b: { id: 'y' } }
 * findKeyByPredicate(obj, v => v.id === 'y') // -> 'b'
 */
export function findKeyByPredicate<T>(
    obj: Record<string, T>,
    predicate: (value: T, key: string) => boolean
): string | undefined {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (predicate(obj[key], key)) return key
        }
    }
    return undefined
}

export default findKeyByValue

type DefaultType = 'JsonSymbol' | 'EditorScore'
const DefaultObjectFactory = {
    JsonSymbol: () => {
        return { sysUuid: '', sectionId: 0, s: '-', t: 0, d: 1 } as JsonSymbol
    },
    EditorScore: () => {
        return {
            uuid: '',
            title: 'default',
            composer: '',
            instrumenttype: '',
            positions: [],
            systems: [],
            parts: {},
            hasCycle: false
        } as Score
    }
}

export function defaultObject<T>(otype: DefaultType): T {
    // export function defaultObject(otype: DefaultType): JsonSymbol | EditorScore | undefined {
    return DefaultObjectFactory[otype]() as T
}

export function scoreToFormattedJson(score: Score, clearCache: boolean = true): string {
    const flatten = (key: string, value: any) => {
        if (/^([A-Z][A-Z\d_]+|execution|staff|group|positions)$/.test(key) && value) {
            var json = value.map((meas: any) => {
                return JSON.stringify(meas)
            })
            if (key != 'execution') json = '[' + json.join(', ') + ']'
            return json
        }
        if (key == 'colWidths') {
            const json = JSON.stringify(value)
            return json
        }
        if (key == 'starttime') {
            return undefined
        }
        return value
    }
    if (clearCache) {
        score.systems.forEach((sys) =>
            _.toPairs(sys.staffs).forEach(([_, measures]) => measures.forEach((measure) => delete measure.notation_))
        )
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
