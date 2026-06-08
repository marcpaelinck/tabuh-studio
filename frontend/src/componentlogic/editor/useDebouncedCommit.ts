/**
 * Debounced commit helper.
 *
 * `schedule(value)` records the latest value and (re)starts a timer; when the
 * timer fires, `commit` runs once with that value. Rapid calls collapse into a
 * single commit after `delay` ms of quiet. A pending value is also flushed on
 * unmount, so the last edit is never lost.
 *
 * Used by the editor so that typing — which updates the editor's own state
 * instantly — only triggers the expensive global score update (re-render of all
 * systems + local-cache write) once the user pauses, instead of on every
 * keystroke.
 *
 * `commit` may be a fresh closure each render (e.g. over current props); the
 * latest version is always used, so commits never run against stale data.
 */

import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCommit<T>(commit: (value: T) => void, delay: number) {
    const commitRef = useRef(commit)
    commitRef.current = commit

    const pending = useRef<{ value: T } | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const flush = useCallback(() => {
        if (timer.current !== null) {
            clearTimeout(timer.current)
            timer.current = null
        }
        if (pending.current) {
            const { value } = pending.current
            pending.current = null
            commitRef.current(value)
        }
    }, [])

    const schedule = useCallback(
        (value: T) => {
            pending.current = { value }
            if (timer.current !== null) clearTimeout(timer.current)
            timer.current = setTimeout(flush, delay)
        },
        [delay, flush]
    )

    // Flush any pending value when the component unmounts.
    useEffect(() => flush, [flush])

    return { schedule, flush }
}
