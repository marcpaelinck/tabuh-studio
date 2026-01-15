/**
 * Utilities for working with plain objects (string-keyed).
 */

import type { EditorScore, JsonSymbol } from '../models/types'

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
        return { title: '', composer: '', positions: [], systems: [], parts: {} } as EditorScore
    }
}

export function defaultObject<T>(otype: DefaultType): T {
    // export function defaultObject(otype: DefaultType): JsonSymbol | EditorScore | undefined {
    return DefaultObjectFactory[otype]() as T
}

export function toOrdinal(val: number): string {
    switch (val) {
        case 1:
            return `1st`
        case 2:
            return `2nd`
        case 3:
            return `3rd`
        default:
            return `${val}th`
    }
}
