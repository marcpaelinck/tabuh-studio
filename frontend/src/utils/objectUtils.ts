/**
 * Utilities for working with plain objects (string-keyed).
 */

import _ from 'lodash'
import { totalDuration } from '../componentlogic/playback/playbackPatternManager'
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

// Returns true if the *position* given by the index is even (where position == index+1)
export function isEvenByIndex(index: number) {
    return (index + 1) % 2 == 0
}

// Returns the maximum duration of the measures at the given index.
export function getSectionDuration(system: System, sectionIdx: number, bpm: BPM) {
    const measures = _.flatten(
        _.values(system.staffs).map((posMeasures) => (posMeasures.length > sectionIdx ? posMeasures[sectionIdx] : []))
    )
    return Object.entries(measures).reduce(
        (maxDur, [position, measure]) =>
            Math.max(maxDur, totalDuration(measure.notation, position as Position, bpm, 'basenote')),
        0
    )
}

// Returns the maximum duration of the system's staffs.
export function getSystemDuration(system: System, bpm: BPM) {
    return Math.max(
        ..._.entries(system.staffs).map(([pos, measures]) =>
            _.sum(measures.map((measure) => totalDuration(measure.notation, pos as Position, bpm, 'basenote')))
        )
    )
}
