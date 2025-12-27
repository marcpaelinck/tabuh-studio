/**
 * Utilities for working with plain objects (string-keyed).
 */

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
