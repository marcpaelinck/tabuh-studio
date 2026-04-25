/**
 * Utilities for working with plain objects (string-keyed).
 */

import _ from 'lodash'
import type { Score } from '../typing/score'

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

type DefaultType = 'NoteSymbol' | 'Score'
const DefaultObjectFactory = {
    NoteSymbol: () => {
        return '-'
    },
    Score: () => {
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

// Compares the key/value pair of two objects on the top level only.
export function same<T extends Object>(object1: T, object2: T | undefined): boolean {
    if (!object2) return false
    return Object.entries(object1).every(([key, value]) => object2[key as keyof T] == value)
}
