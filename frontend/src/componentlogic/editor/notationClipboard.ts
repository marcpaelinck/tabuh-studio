/**
 * Copy / paste helpers for notation.
 *
 * Notation is exchanged as plain text so it round-trips with the existing
 * textarea representation and with external text files: each staff is one line
 * (its symbols concatenated, e.g. `"u a i,/"` written without separators as the
 * font characters), and staves are separated by `'\n'`.
 *
 * This module only (de)serialises; deciding *where* pasted content lands is the
 * job of the editor controller. Selection-based copy/cut is not implemented yet
 * (see the editor controller); these helpers are the foundation for it.
 */

import { NoteObject } from '@tabuhstudio/shared'
import type { Position } from '@tabuhstudio/shared'

/** Serialises one staff's symbols to their concatenated font-character string. */
export function serializeStaff(symbols: NoteObject[]): string {
    return symbols.map((n) => n.toString()).join('')
}

/** Serialises several staves to a multi-line string (one line per staff). */
export function serializeStaves(staves: { symbols: NoteObject[] }[]): string {
    return staves.map((s) => serializeStaff(s.symbols)).join('\n')
}

/** Splits clipboard text into lines, tolerating CRLF and a trailing newline. */
export function splitClipboardLines(text: string): string[] {
    const lines = text.replace(/\r\n?/g, '\n').split('\n')
    // Drop a single trailing empty line produced by a terminating newline.
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
    return lines
}

/**
 * Parses clipboard text into one `NoteObject[]` per line. Each line is bound to
 * the position at the same index in `positions` (used when distributing a paste
 * across consecutive staves); lines beyond `positions` fall back to unbound.
 */
export function parseClipboard(text: string, positions: (Position | undefined)[]): NoteObject[][] {
    return splitClipboardLines(text).map((line, i) => NoteObject.parseText(line, positions[i]))
}
