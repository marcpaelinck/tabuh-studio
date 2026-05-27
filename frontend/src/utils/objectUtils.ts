/**
 * Utilities for working with plain objects (string-keyed).
 */

import _ from 'lodash'
import { totalDuration } from '../componentlogic/playback/playbackPatternManager'
import type { BPM, NoteSymbol, Position } from '../typing/basetypes'
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

export function scoreToFormattedJson(score: Score, clearCache: boolean = true): string {
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
    if (clearCache) {
        score.systems.forEach((sys) =>
            _.toPairs(sys.staffs).forEach(([_, staff]) => {
                if (staff) delete staff.notation_
            })
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

// Returns true if the *position* given by the index is even (where position == index+1)
export function isEvenByIndex(index: number) {
    return (index + 1) % 2 == 0
}

// Returns the number of kempli sections (beats) in the system.
export function getSystemSectionCount(system: System): number {
    const firstStaff = Object.values(system.staffs)[0]
    if (!firstStaff) return 0
    if (system.kempli.state === 'on' && system.kempli.frequency) {
        return Math.ceil(firstStaff.notation.length / system.kempli.frequency)
    } else if (system.kempli.state === 'notation') {
        const kempliNotation = system.staffs['KEMPLI']?.notation || []
        return Math.max(1, kempliNotation.filter((n) => n === 'x?').length)
    }
    return 1
}

// Returns the start index (in the flat notation) of the given section.
export function getSectionStart(sectionIdx: number, system: System): number {
    if (system.kempli.state === 'on' && system.kempli.frequency) {
        return sectionIdx * system.kempli.frequency
    } else if (system.kempli.state === 'notation') {
        if (sectionIdx === 0) return 0
        const kempliNotation = system.staffs['KEMPLI']?.notation || []
        const beatPositions = kempliNotation.reduce((pos: number[], note, idx) => (note === 'x?' ? [...pos, idx] : pos), [])
        return sectionIdx <= beatPositions.length ? beatPositions[sectionIdx - 1] + 1 : 0
    }
    return 0
}

// Returns the notation for a specific section (kempli beat) from a flat notation array.
export function getSectionNotation(notation: NoteSymbol[], sectionIdx: number, system: System): NoteSymbol[] {
    if (system.kempli.state === 'on' && system.kempli.frequency) {
        const start = sectionIdx * system.kempli.frequency
        return notation.slice(start, start + system.kempli.frequency)
    } else if (system.kempli.state === 'notation') {
        const kempliNotation = system.staffs['KEMPLI']?.notation || []
        const beatPositions = kempliNotation.reduce((pos: number[], note, idx) => (note === 'x?' ? [...pos, idx] : pos), [])
        const start = sectionIdx > 0 && sectionIdx <= beatPositions.length ? beatPositions[sectionIdx - 1] + 1 : 0
        const end = sectionIdx < beatPositions.length ? beatPositions[sectionIdx] + 1 : notation.length
        return notation.slice(start, end)
    }
    return notation
}

// Returns the maximum duration of the system's staffs.
export function getSystemDuration(system: System, bpm: BPM) {
    const entries = _.entries(system.staffs).filter(([_, staff]) => staff != null)
    if (entries.length === 0) return 0
    return Math.max(...entries.map(([pos, staff]) => totalDuration(staff!.notation, pos as Position, bpm, 'basenote')))
}
