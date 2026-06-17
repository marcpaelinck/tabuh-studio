import { NoteObject, type Position } from '@tabuhstudio/shared'
import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { parseLaras } from '../scoreparsers/larasParser'
import { parseNotation } from '../scoreparsers/tabuhParser'
import type { ScoreListItem, ScoreRecord } from '../services/apiService'
import { apiCreateScore, apiGetScore, apiGetScores, apiUpdateScore } from '../services/apiService'
import type { NoteSymbol } from '../typing/basetypes'
import type { ScoreInfo } from '../typing/interface'
import type { ParserReturnValue } from '../typing/parsers'
import type { Score, ScoreFormat } from '../typing/score'
import { readFile } from '../utils/filesystem'
import { scoreToFormattedJson } from '../utils/objectUtils'

export function persistCachedChanges(score: Score | undefined): Score | undefined {
    if (!score) return
    const newScore = { ...score }
    newScore.systems.forEach((sys) =>
        _.toPairs(sys.staffs).forEach(([_pos, staff]) => {
            if (!staff) return
            if (staff.objNotation_) staff.objNotation = staff.objNotation_
            delete staff.notation_
        })
    )
    return newScore
}

// Seta the score's UUID if missing and creates NoteObject notation
function postprocessScore(score: Score): Score {
    if (!score.uuid) score.uuid = uuidv4()
    for (const system of score.systems) {
        _.entries(system.staffs).forEach(([_pos, staff]) => {
            staff.objNotation = NoteObject.fromNotation(staff.notation, _pos as Position)
        })
    }
    return score
}

function toScoreInfo(item: ScoreListItem): ScoreInfo {
    return {
        title: item.title,
        uuid: item.uuid,
        instrumentgroup: item.instrument_set,
        notationversion: (item as any).notationversion ?? ''
    }
}

// Loads and parses a score when a new tabuh (score title) is selected
export function useScoreReader(source: 'database' | 'file'): {
    scoreInfoList: ScoreInfo[]
    loadedScore: Score | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    saveScore: (score: Score | undefined, destination: 'database' | 'file') => Promise<boolean>
    isLoading: boolean
} {
    const [scoreInfoList, setScoreInfoList] = useState<ScoreInfo[]>([])
    const [loadedScore, setScore] = useState<Score>()
    const [isLoading, setIsLoading] = useState<boolean>(false)

    useEffect(() => {
        if (source == 'database') loadScoreListFromDb()
        else if (source == 'file') loadScoreListFromFile()
        else console.error('useScoreReader: source for score list is not `db` or `file`.')
    }, [])

    const loadScore = useCallback((format: ScoreFormat, newScoreInfo: ScoreInfo | undefined) => {
        // if (!newScoreInfo || same<ScoreInfo>(newScoreInfo, scoreInfo)) return
        switch (format) {
            case 'JSON':
                if (source == 'database') loadScoreFromDb(newScoreInfo)
                else if (source == 'file') loadScoreFromFile(newScoreInfo)
                break
            case 'JSON-file':
                importJsonScore()
                break
            case 'Laras':
            case 'Notation':
                importScore(format)
                break
            default:
        }
    }, [])

    interface StaffNoObject {
        notation: NoteSymbol[]
        objNotation?: NoteObject[]
        objNotation_?: NoteObject[]
    }

    const saveScore = useCallback(
        async (score: Score | undefined, destination: 'database' | 'file'): Promise<boolean> => {
            // if (!newScoreInfo || same<ScoreInfo>(newScoreInfo, scoreInfo)) return
            var isSuccess = false
            // Create a copy of the score object and remove the object versions of the notation
            const scoreNoObject = structuredClone(score)
            scoreNoObject?.systems.forEach((system) => {
                _.values(system.staffs).forEach((staff) => {
                    if (staff) delete (staff as StaffNoObject).objNotation
                    if (staff) delete (staff as StaffNoObject).objNotation_
                })
                system.notationGroups?.forEach((group) => {
                    group.staff.forEach((staff) => {
                        delete (staff as StaffNoObject).objNotation
                    })
                })
            })
            if (destination == 'database') isSuccess = await saveScoreToDb(scoreNoObject)
            else if (destination == 'file') isSuccess = await saveScoreToLocalFile(scoreNoObject)
            return isSuccess
        },
        []
    )

    // Loads a Score object description from a JSON file on the web server.
    async function loadScoreFromFile(newScoreInfo: ScoreInfo | undefined) {
        if (newScoreInfo) {
            setIsLoading(true)
            let jsonText = await readFile('scores/' + newScoreInfo.file)
            var score: Score = JSON.parse(jsonText)
            if (!score) return
            score = postprocessScore(score)
            setScore(score)
            setIsLoading(false)
        }
    }

    // Loads a Score directly from a JSON file chosen by the user.
    async function importJsonScore() {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = '.json'
        fileInput.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            try {
                const content = await file.text()
                const parsed: Score = JSON.parse(content)
                setScore(postprocessScore(parsed))
            } catch (err) {
                console.error('Failed to parse imported JSON score:', err)
            }
        }
        fileInput.click()
    }

    // Imports a file with an alternative format and parses it to a Score object.
    async function importScore(format: ScoreFormat) {
        const parse =
            format == 'Laras'
                ? parseLaras
                : format == 'Notation'
                  ? parseNotation
                  : () => {
                        return { errors: [], postProcessing: [] }
                    }
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = format == 'Notation' ? '.tsv' : '.laras'
        fileInput.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                const content = await file.text()
                const parserReturnValue: ParserReturnValue = parse(content)
                if (parserReturnValue.score) {
                    setScore(parserReturnValue.score)
                }

                // Process content as needed
            }
        }
        fileInput.click()
    }

    // Loads a JSON Score object description from the website's database.
    async function loadScoreFromDb(newScoreInfo: ScoreInfo | undefined) {
        if (!newScoreInfo) return
        setIsLoading(true)
        try {
            // Scores are addressed by uuid, so fetch directly (404 if not found).
            const record = await apiGetScore(newScoreInfo.uuid)
            const score = postprocessScore(record.content as Score)
            setScore(score)
        } catch (err) {
            console.error('Failed to load score from database:', err)
        } finally {
            setIsLoading(false)
        }
    }

    // Saves or updates the database with the Score object.
    async function saveScoreToDb(score: Score | undefined): Promise<boolean> {
        if (!score) return false
        setIsLoading(true)
        var isSuccess = true
        try {
            // Decide create vs update by checking whether the uuid already exists.
            const scores = await apiGetScores()
            const exists = scores.some((s) => s.uuid === score.uuid)
            var returnvalue: ScoreRecord
            if (exists) {
                returnvalue = await apiUpdateScore(score.uuid, {
                    title: score.title,
                    instrument_set: score.instrumenttype,
                    content: score
                })
            } else {
                // Pass the score object (not a JSON string): the API stringifies it,
                // and the backend validates content.uuid.
                returnvalue = await apiCreateScore(score.title, score.instrumenttype, score)
            }
            if (!returnvalue) {
                isSuccess = false
                console.error('Failed to save/update score to database, error unknown')
            }
        } catch (err) {
            isSuccess = false
            console.error('Failed to save/update score to database:', err)
        } finally {
            setIsLoading(false)
        }
        return isSuccess
    }

    // Saves or updates the database with the Score object.
    async function saveScoreToLocalFile(score: Score | undefined): Promise<boolean> {
        if (!score) return false

        try {
            const json = scoreToFormattedJson(score)
            // const json = JSON.stringify(score, null, 4)

            // Use File System Access API if available (Chrome/Edge)
            if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function') {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${score.title.replace(/[^a-z0-9]/gi, '_')}.json`,
                    types: [{ description: 'JSON score file', accept: { 'application/json': ['.json'] } }]
                })
                const writable = await handle.createWritable()
                await writable.write(json)
                await writable.close()
                return true
            }

            // Fallback for Firefox and Safari
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `${score.title.replace(/[^a-z0-9]/gi, '_')}.json`
            anchor.click()
            URL.revokeObjectURL(url)
            return true
        } catch (err) {
            // User cancelled the dialog — not a real error
            if (err instanceof DOMException && err.name === 'AbortError') return false
            console.error('Failed to save score to local file:', err)
            return false
        }
    }

    async function loadScoreListFromDb() {
        window.open
        setIsLoading(true)
        try {
            // Find the database id by matching uuid from the score list
            const scores = await apiGetScores()
            if (scores) {
                const scoreInfoList = scores
                    .filter((score) => score.instrument_set == 'GONG_KEBYAR')
                    .map((score) => toScoreInfo(score))
                    .toSorted((i1, i2) => i1.title.localeCompare(i2.title))
                setScoreInfoList(scoreInfoList)
            } else throw new Error('Did not receive score list')
        } catch (err) {
            console.error('Failed to load score list from database:', err)
        } finally {
            setIsLoading(false)
        }
    }

    async function loadScoreListFromFile() {
        setIsLoading(true)
        const files = await readFile('scores/content.json')
        const scoreInfoList: ScoreInfo[] = JSON.parse(files)
        setScoreInfoList(
            scoreInfoList
                .filter((info) => info.instrumentgroup == 'GONG_KEBYAR')
                .toSorted((i1, i2) => i1.title.localeCompare(i2.title))
        )
        setIsLoading(false)
    }

    return { scoreInfoList, loadedScore, loadScore, saveScore, isLoading }
}
