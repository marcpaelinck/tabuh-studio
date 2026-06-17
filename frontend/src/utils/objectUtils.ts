/**
 * Utilities for working with plain objects (string-keyed).
 */

import { NoteObject } from '@tabuhstudio/shared'
import { EXTENDING_CHAR, KEMPLI_BEAT_CHAR } from '@tabuhstudio/shared/noteChars'
import _ from 'lodash'
import { totalDuration } from '../componentlogic/playback/strokeManager'
import { defaultBeatFrequency } from '../config/config'
import type { BPM, Position } from '../typing/basetypes'
import type { BeatSliceInfo } from '../typing/execution'
import type { Score, System } from '../typing/score'

type DefaultType = 'NoteSymbol' | 'Score'
const DefaultObjectFactory = {
    NoteSymbol: () => {
        return EXTENDING_CHAR
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

    // Replace quotes and add spaces after `:` and `,`.
    // NOTE: the latter can cause a space to be added to
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

// Returns the start and end indices of each beat of the system.
// - For 'on' state use the beat frequency.
// - For 'off' state use the default beat length.
// - For 'notation' state use the beat strokes in the notation.
// TODO: not used yet. This function should be used by as basis for getSystemBeatCount, getBeatSlice and getBeatStart
export function getBeatSlices(system: System): BeatSliceInfo[] {
    const staffEntries = Object.entries(system.staffs).filter(([_, staff]) => staff != null)

    if (!staffEntries.length) return []
    const maxColumnCount = Math.max(...staffEntries.map(([pos, staff]) => staff!.objNotation.length))

    const beatSliceInfo: BeatSliceInfo[] = []

    if (system.kempli.state === 'on' || system.kempli.state === 'off') {
        // Slice the notation in beats of freq length
        const freq = system.kempli.frequency || defaultBeatFrequency
        const totalBeats = Math.ceil(maxColumnCount / freq)
        for (var idx = 0; idx < totalBeats; idx++) {
            beatSliceInfo.push({ start: idx * freq, end: Math.min((idx + 1) * freq, maxColumnCount) })
        }
    } else if (system.kempli.state === 'notation') {
        // KEMPLI_BEAT_CHAR marks the START of each kempli beat.
        const kempliNotation = system.staffs['KEMPLI']?.objNotation || []
        const beatStartIndices = kempliNotation.reduce(
            (pos: number[], note, idx) => (note.canonicalSymbol === KEMPLI_BEAT_CHAR ? [...pos, idx] : pos),
            []
        )
        if (!beatStartIndices.length) beatSliceInfo.push({ start: 0, end: maxColumnCount })
        else
            beatStartIndices.forEach((start, idx) => {
                beatSliceInfo.push({
                    start,
                    end: idx < beatStartIndices.length - 1 ? beatStartIndices[idx + 1] : maxColumnCount
                })
            })
    } else {
        beatSliceInfo.push({ start: 0, end: maxColumnCount })
    }
    return beatSliceInfo
}

// Finds the [startIdx, endIdx) array slice for beat beatIdx
function getBeatSlice(objNotation: NoteObject[], beatIdx: number, freq: number): [number, number] {
    if ((beatIdx + 1) * freq <= objNotation.length) return [beatIdx * freq, (beatIdx + 1) * freq]
    if (beatIdx * freq < objNotation.length) return [beatIdx * freq, objNotation.length]
    return [0, 0]
}

export function getBeatStart(beatIdx: number, system: System, position?: Position): number {
    if (system.kempli.state === 'on' || system.kempli.state === 'off') {
        const freq = system.kempli.frequency || defaultBeatFrequency
        const refPosition = position ?? (Object.keys(system.staffs)[0] as Position)
        const refNotation = system.staffs[refPosition]?.objNotation ?? []
        const [start] = getBeatSlice(refNotation, beatIdx, freq)
        return start
    } else if (system.kempli.state === 'notation') {
        // KEMPLI_BEAT_CHAR marks the START of each kempli beat.
        const kempliNotation = system.staffs['KEMPLI']?.objNotation || []
        const beatPositions = kempliNotation.reduce(
            (pos: number[], note, idx) => (note.canonicalSymbol === KEMPLI_BEAT_CHAR ? [...pos, idx] : pos),
            []
        )
        return beatIdx < beatPositions.length ? beatPositions[beatIdx] : 0
    }
    return 0
}

export interface GetBeatNotationArgs {
    beatIdx: number
    system: System
    position: Position
    beatSlices: BeatSliceInfo[]
}
// Returns the notation symbols for beat beatIdx from a NoteObject array.
export function getBeatNotation({ system, position, beatIdx, beatSlices }: GetBeatNotationArgs): NoteObject[] {
    // Check if notation is available for the position
    if (position in system.staffs && system.staffs[position]) {
        const objNotation = system.staffs[position].objNotation

        // Check if the notation has content within the beat's range
        if (objNotation.length && beatIdx < beatSlices.length && beatSlices[beatIdx].start <= objNotation.length) {
            const start = beatSlices[beatIdx].start
            const end = Math.min(beatSlices[beatIdx].end, objNotation.length)
            return objNotation.slice(start, end)
        }
    }
    return []
}

// Returns the maximum duration of the system's staffs.
export function getSystemDuration(system: System, bpm: BPM) {
    const entries = _.entries(system.staffs).filter(([_, staff]) => staff != null)
    if (entries.length === 0) return 0
    return Math.max(...entries.map(([pos, staff]) => totalDuration(staff!.objNotation, bpm, 'basenote')))
}
