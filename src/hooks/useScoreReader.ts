import _ from 'lodash'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { defaultIntroTime, editorSortingOrder } from '../config/config'
import type {
    EditorMeasure,
    EditorScore,
    EditorSystem,
    JsonNote,
    JsonSymbol,
    Position,
    Score,
    ScoreInfo,
    Staffs
} from '../models/types'
import { readFile } from '../utils/filesystem'
import { defaultObject } from '../utils/objectUtils'
import { BaseNoteEquiv2Millis, millis2BaseNoteEquiv } from '../utils/timeunits'

function parseScoreOld(score: Score): Score {
    // This function also calculates times in ms for each note, to be used by the animation.
    // Transport.getSecondsAtTime() doesn't seem to process tempo changes correctly.
    var currentTimeMs = defaultIntroTime
    // TODO the following result will be incorrect if tempo[1] != tempo[0]
    const introTimeBn = millis2BaseNoteEquiv(defaultIntroTime, score.systems[0].sections[0].tempo[0])
    score.systems.forEach((system, sysidx, systemArray) => {
        system.uuid = uuidv4()
        system.starttime += introTimeBn
        system.sections.forEach((section, sectidx, sectionArray) => {
            section.starttime += introTimeBn
            section.starttimeMs = Math.round(currentTimeMs)
            // The time for all instruments is synced at the start of each section.
            // This will ensure that notation errors will not propagate throughout the score.
            for (const [_, measure] of Object.entries(section.staves)) {
                var relTime = 0 // Time relative to the section's start time
                measure.tempo = section.tempo
                measure.notes?.forEach((note: JsonNote) => {
                    // Convert the first note's absolute start time to relative time.
                    // TODO in the future the note's time attribute should be given relative to the section start time.
                    note.t += introTimeBn
                    relTime = note.t - section.starttime
                    // Determine the *average* tempo from the section start to the note start. This accounts for the factor 0.5
                    const avgTempo =
                        section.tempo[0] + ((section.tempo[1] - section.tempo[0]) * 0.5 * relTime) / section.duration
                    note.ms = section.starttimeMs + BaseNoteEquiv2Millis(note.t - section.starttime, avgTempo)
                    note.section = section.id
                    note.sysUuid = system.uuid
                    relTime += note.d
                })
                measure.notation.forEach((symbol: JsonSymbol) => {
                    symbol.t += introTimeBn
                })
            }
            currentTimeMs += BaseNoteEquiv2Millis(section.duration, section.tempo)
            if (sysidx === systemArray.length - 1 && sectidx === sectionArray.length - 1) {
                // Last section
                score.durationMs = currentTimeMs
            }
        })
    })
    return score
}

function oldToNewFormat(score: Score): EditorScore {
    const newScore: EditorScore = defaultObject('EditorScore')
    var currentPart: string = ''
    var positions: string[] = []
    score.systems.forEach((system, sysIdx) => {
        // Update part information
        if (system.part) currentPart = system.part
        if (currentPart != '') {
            if (!(currentPart in newScore.parts)) newScore.parts[currentPart] = []
            newScore.parts[currentPart].push(system.uuid)
        }

        if (system.id == 1) {
            positions = Object.keys(system.sections[0].staves).toSorted(
                (a, b) => editorSortingOrder.indexOf(a) - editorSortingOrder.indexOf(b)
            )
            newScore.positions = positions as Position[]
        }
        const colWidths = system.sections.map((section) =>
            Math.max(...Object.values(section.staves).map((measure) => measure.notation.length))
        )
        const staffs: Staffs = Object.fromEntries(
            positions.map((position) => [
                position as Position,
                system.sections.map((section) => {
                    const measure = section.staves[position as Position]
                    const editorMeasure: EditorMeasure = {
                        ..._.omit(measure, 'notation_'),
                        ...{ notation: measure.notation.map((sym) => sym.s) }
                    }
                    return editorMeasure
                })
            ])
        ) as Staffs
        // Delete the notes attribute of measures. Need to review the new data format
        Object.values(staffs).forEach((measures) =>
            measures.forEach((measure) => {
                if ('notes' in measure) delete measure.notes
            })
        )
        const systemData: EditorSystem = {
            index: sysIdx,
            id: sysIdx + 1,
            uuid: system.uuid,
            starttime: Object.values(staffs)[0][0].starttime,
            grouped: [],
            staffs: staffs,
            colWidths: colWidths
        }
        newScore.systems.push(systemData)
    })
    return newScore
}

function parseScoreNew(score: EditorScore): EditorScore {
    // This function also calculates times in ms for each note, to be used by the animation.
    // Transport.getSecondsAtTime() doesn't seem to process tempo changes correctly.
    // TODO the following result will be incorrect if tempo[1] != tempo[0]
    const introTimeBn = millis2BaseNoteEquiv(defaultIntroTime, Object.values(score.systems[0].staffs)[0][0].tempo)
    score.systems.forEach((system) => {
        system.starttime += introTimeBn
    })
    return score
}

// Loads and parses a score when a new tabuh (score title) is selected
export function useScoreReader<T = Score | EditorScore | undefined>(
    format: 'old' | 'new'
): { score: T; loadScore: (scoreInfo: ScoreInfo | undefined) => void; isLoading: boolean } {
    const [scoreInfo, setScoreinfo] = useState<ScoreInfo | undefined>(undefined)
    const [score, setScore] = useState<T>(undefined as T)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    function loadScore(scoreInfo: ScoreInfo | undefined) {
        setScoreinfo(scoreInfo)
    }

    useEffect(() => {
        const load = async () => {
            if (scoreInfo) {
                setIsLoading(true)
                let jsonText = await readFile('scores/' + scoreInfo.file)
                const json = JSON.parse(jsonText)
                if (!json) return

                var newScore: Score | EditorScore | undefined = undefined

                if (scoreInfo.format == 'old') {
                    newScore = parseScoreOld(json as Score)
                    if (format == 'new') newScore = oldToNewFormat(newScore)
                } else if (format == 'new') {
                    newScore = parseScoreNew(json)
                } else return
                setScore(newScore as T)
                setIsLoading(false)
            }
        }
        load()
    }, [scoreInfo])

    return { score, loadScore, isLoading }
}
