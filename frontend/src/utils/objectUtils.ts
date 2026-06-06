/**
 * Utilities for working with plain objects (string-keyed).
 */

import { NoteObject } from '@tabuhstudio/shared'
import _ from 'lodash'
import { noteDuration, totalDuration } from '../componentlogic/playback/strokeManager'
import { defaultBeatFrequency, defaultTempo } from '../config/config'
import type { BPM, Position } from '../typing/basetypes'
import type { Score, System } from '../typing/score'

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
            instrumenttype: 'UNDEFINED',
            positions: [],
            systems: [],
            parts: {}
        } as Score
    }
}

export function defaultObject<T>(otype: DefaultType): T {
    return DefaultObjectFactory[otype]() as T
}

const scoreKeyOrder = ['uuid', 'title', 'composer', 'instrumenttype', 'positions', 'parts', 'systems']
const systemKeyOrder = ['uuid', 'id', 'index', 'execution', 'staffs', 'kempli']

function reorderKeys<T extends object>(obj: T, keyOrder: string[]): T {
    const reordered: any = {}
    for (const key of keyOrder) {
        if (key in obj) reordered[key] = (obj as any)[key]
    }
    for (const key of Object.keys(obj)) {
        if (!keyOrder.includes(key)) reordered[key] = (obj as any)[key]
    }
    return reordered as T
}

export function scoreToFormattedJson(score: Score, clearCache: boolean = true): string {
    if (clearCache) {
        score.systems.forEach((sys) =>
            _.toPairs(sys.staffs).forEach(([_, staff]) => {
                if (staff) delete staff.notation_
            })
        )
    }

    // Reorder Score and System keys before serialisation
    const orderedScore = reorderKeys(
        { ...score, systems: score.systems.map((sys) => reorderKeys(sys, systemKeyOrder)) },
        scoreKeyOrder
    )

    const flatten = (key: string, value: any) => {
        if (/^(execution|staff|group|positions)$/.test(key) && value) {
            var json = value.map((item: any) => {
                return JSON.stringify(item)
            })
            if (key != 'execution') json = '[' + json.join(', ') + ']'
            return json
        }
        if (/^[A-Z][A-Z\d_]+$/.test(key) && value && typeof value === 'object' && 'notation' in value) {
            // Staff object: inline it
            return JSON.stringify(value)
        }
        if (key == 'starttime') {
            return undefined
        }
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

// Compares the key/value pair of two objects on the top level only.
export function same<T extends Object>(object1: T, object2: T | undefined): boolean {
    if (!object2) return false
    return Object.entries(object1).every(([key, value]) => object2[key as keyof T] == value)
}

// Returns true if the *position* given by the index is even (where position == index+1)
export function isEvenByIndex(index: number) {
    return (index + 1) % 2 == 0
}

// Finds the [startIdx, endIdx) array slice for beat beatIdx, where each beat accumulates
// exactly `freq` units of symbolDuration. Grace notes (duration=0) do not advance the
// beat budget, so beats containing them include one extra symbol to fill the beat.
function getBeatSlice(objNotation: NoteObject[], beatIdx: number, freq: number): [number, number] {
    let accum = 0
    let start = 0
    let beatCount = 0
    for (let i = 0; i < objNotation.length; i++) {
        accum += noteDuration(objNotation[i], defaultTempo, 'basenote')
        if (accum >= freq) {
            if (beatCount === beatIdx) return [start, i + 1]
            beatCount++
            accum = 0
            start = i + 1
        }
    }
    // Last partial beat (total notation duration is not a multiple of freq)
    if (beatCount === beatIdx && start < objNotation.length) return [start, objNotation.length]
    return [0, 0]
}

// Returns the number of kempli beats in the system.
// For 'on'/'off' state, uses symbolDuration so grace notes (duration=0) are correctly excluded
// from the beat budget, keeping the beat count consistent with the kempli timing.
export function getSystemBeatCount(system: System): number {
    if (system.kempli.state === 'on' || system.kempli.state === 'off') {
        const freq = system.kempli.frequency || defaultBeatFrequency
        const staffEntries = Object.entries(system.staffs).filter(([_, staff]) => staff != null)
        if (!staffEntries.length) return 0
        const maxDuration = Math.max(
            ...staffEntries.map(([pos, staff]) => totalDuration(staff!.objNotation, defaultTempo, 'basenote'))
        )
        return Math.max(1, Math.ceil(maxDuration / freq))
    } else if (system.kempli.state === 'notation') {
        const kempliNotation = system.staffs['KEMPLI']?.notation || []
        return Math.max(1, kempliNotation.filter((n) => n === 'x?').length)
    }
    return 1
}

// Returns the start index (array position) of beat beatIdx in the flat notation.
// For 'on'/'off' state, uses symbolDuration so grace-note beats shift the boundary correctly.
// Pass the position of the staff being displayed for the most accurate cursor placement.
export function getBeatStart(beatIdx: number, system: System, position?: Position): number {
    if (system.kempli.state === 'on' || system.kempli.state === 'off') {
        const freq = system.kempli.frequency || defaultBeatFrequency
        const refPosition = position ?? (Object.keys(system.staffs)[0] as Position)
        const refNotation = system.staffs[refPosition]?.objNotation ?? []
        const [start] = getBeatSlice(refNotation, beatIdx, freq)
        return start
    } else if (system.kempli.state === 'notation') {
        // x? marks the START of each kempli beat.
        const kempliNotation = system.staffs['KEMPLI']?.notation || []
        const beatPositions = kempliNotation.reduce(
            (pos: number[], note, idx) => (note === 'x?' ? [...pos, idx] : pos),
            []
        )
        return beatIdx < beatPositions.length ? beatPositions[beatIdx] : 0
    }
    return 0
}

// Returns the notation symbols for beat beatIdx from a flat notation array.
// For 'on'/'off' state, uses symbolDuration so grace notes (duration=0) do not terminate
// the beat early — an extra symbol is included to fill the beat to the full kempli frequency.
export function getBeatNotation(
    objNotation: NoteObject[],
    beatIdx: number,
    system: System,
    position?: Position
): NoteObject[] {
    if (system.kempli.state === 'on' || system.kempli.state === 'off') {
        const freq = system.kempli.frequency || defaultBeatFrequency
        if (position) {
            const [start, end] = getBeatSlice(objNotation, beatIdx, freq)
            return objNotation.slice(start, end)
        }
        // Fallback if no position provided (avoids symbolDuration dependency)
        const start = beatIdx * freq
        return objNotation.slice(start, start + freq)
    } else if (system.kempli.state === 'notation') {
        // x? marks the START of each kempli beat.
        // beat beatIdx spans from beatPositions[beatIdx] up to (but not including) beatPositions[beatIdx+1].
        const kempliNotation = system.staffs['KEMPLI']?.notation || []
        const beatPositions = kempliNotation.reduce(
            (pos: number[], note, idx) => (note === 'x?' ? [...pos, idx] : pos),
            []
        )
        const start = beatIdx < beatPositions.length ? beatPositions[beatIdx] : 0
        const end = beatIdx + 1 < beatPositions.length ? beatPositions[beatIdx + 1] : objNotation.length
        return objNotation.slice(start, end)
    }
    return objNotation
}

// Returns the maximum duration of the system's staffs.
export function getSystemDuration(system: System, bpm: BPM) {
    const entries = _.entries(system.staffs).filter(([_, staff]) => staff != null)
    if (entries.length === 0) return 0
    return Math.max(...entries.map(([pos, staff]) => totalDuration(staff!.objNotation, bpm, 'basenote')))
}
