// TEMPORARY verification (refactor step 3): proves the symbol-derived Note (notePlayback.deriveNote)
// reproduces the current noteConfigs values for every (position, symbol) that has a shorthand code.
// Run:  node --experimental-transform-types --loader ./scripts/ts_loader.mjs ./scripts/verifyDeriveNote.ts
// Delete once step 3 is done.

import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Position } from '@tabuhstudio/shared/types/position'
import { NoteObject } from '@tabuhstudio/shared/types/NoteObject'
import { noteConfigs } from '../src/config/config'
import { deriveNote, voicing } from '../src/componentlogic/playback/notePlayback'

let checked = 0
let mismatches = 0
let missing = 0

for (const position of Object.keys(positionConfigs) as Position[]) {
    const cfg = positionConfigs[position]
    const type = cfg.type
    for (const [symbol, codes] of Object.entries(cfg.symbolToNoteNames)) {
        const notes = voicing(new NoteObject(symbol, position)).map(deriveNote)
        if (notes.length !== codes.length) {
            console.log(`LEN    ${position} '${symbol}': derived ${notes.length} notes vs ${codes.length} codes`)
            mismatches++
            continue
        }
        for (let i = 0; i < notes.length; i++) {
            const old = noteConfigs[type]?.[codes[i]]
            if (!old) {
                console.log(`MISSING noteConfigs[${type}][${codes[i]}] (${position} '${symbol}')`)
                missing++
                continue
            }
            const n = notes[i]
            if (n.tone !== old.tone || n.octave !== old.octave || n.muting !== old.muting || n.stroke !== old.stroke) {
                console.log(`DIFF   ${position} '${symbol}' [${codes[i]}]: derived ${JSON.stringify(n)} vs old ${JSON.stringify(old)}`)
                mismatches++
            }
            checked++
        }
    }
}

console.log(`\nchecked=${checked}  mismatches=${mismatches}  missing=${missing}`)
