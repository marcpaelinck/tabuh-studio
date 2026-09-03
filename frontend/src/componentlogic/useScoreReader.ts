import { NoteObject, type Position } from '@tabuhstudio/shared'
import { orchestraConfigs } from '@tabuhstudio/shared/config/position'
import type { NoteSymbol } from '@tabuhstudio/shared/types/basetypes'
import type { Orchestra } from '@tabuhstudio/shared/types/position'
import { orderedPositions } from '@tabuhstudio/shared/utils/position'
import _ from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '../context/AuthContext'
import { parseLaras } from '../scoreparsers/larasParser'
import { parseNotation } from '../scoreparsers/tabuhParser'
import type { ScoreListItem, ScoreRecord } from '../services/apiService'
import { apiCreateScore, apiGetScore, apiGetScores, apiUpdateScore } from '../services/apiService'
import { useRecoveryStore } from '../stores/useRecoveryStore'
import { useScoreStore } from '../stores/useScoreStore'
import type { ScoreInfo } from '../typing/interface'
import type { ParserReturnValue } from '../typing/parsers'
import type { Score, ScoreFormat } from '../typing/score'
import { debug } from '../utils/debugger'
import { executionItemTooltip } from '../utils/executionItems'
import { readFile } from '../utils/filesystem'
import { scoreToFormattedJson } from '../utils/objectUtils'
import { allowedPositionGroups } from './castingRulesManager'
import { expandSystem } from './expandNotation'
import { buildMidiNoteMapModel, generateMidiNoteMapPdf } from './export/midiNoteMap'
import { generatePdf } from './export/pdfGenerator'
import { buildPdfModel } from './export/pdfModel'
import { generateMidiFile, midiTrackPositions } from './playback/midiGenerator'
import { buildTimeline } from './playback/timelineBuilder'

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

// Set the score's UUID if missing and creates NoteObject notation
function postprocessScore(score: Score, beatPosition: Position): Score {
    if (!score.uuid) score.uuid = uuidv4()
    for (const system of score.systems) {
        // Re-derive the expanded staffs cache from the canonical compact groups.
        // Skipped for legacy/laras scores which keep their stored/parsed staffs.
        if (system.groups && system.groups.length > 0) expandSystem(system, beatPosition)
        _.entries(system.staffs).forEach(([_pos, staff]) => {
            staff.objNotation = NoteObject.fromNotation(staff.notation, _pos as Position)
        })
        for (const item of system.execution ?? []) {
            item.tooltip = executionItemTooltip(item, 'long', score.instrumenttype)
            debug(`setting tooltip to '${item.tooltip}'`)
            item.tooltipshort = executionItemTooltip(item, 'short', score.instrumenttype)
        }
    }
    return score
}

function toScoreInfo(item: ScoreListItem): ScoreInfo {
    return {
        title: item.title,
        uuid: item.uuid,
        instrumentgroup: item.instrument_set,
        notationversion: (item as any).notationversion ?? '',
        groups: item.groups ?? []
    }
}

// Loads and parses a score when a new tabuh (score title) is selected
export function useScoreReader(source: 'database' | 'file'): {
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    saveScore: (
        score: Score | undefined,
        destination: 'database' | 'jsonfile' | 'midifile' | 'pdffile'
    ) => Promise<boolean>
    recoverScore: (score: Score) => void
    isLoading: boolean
} {
    const { setScoreInfoList, setCurrentScore, setOrchestra, setOrchestraPositions, setAllowedPositionGroups } =
        useScoreStore()
    const { beatPosition } = useScoreStore()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    // Read via a ref so the (deps:[]) load callbacks always see the current user's preferences.
    const { user } = useAuth()
    const userRef = useRef(user)
    userRef.current = user

    function setScoreStates(score: Score): void {
        // Staff order always follows the current user's default for the orchestra (else system default).
        const staffOrder = userRef.current?.preferences?.defaultPositionOrderByOrchestra?.[score.instrumenttype]
        setCurrentScore(score, staffOrder)
        setOrchestraPositions(orderedPositions(score.instrumenttype, staffOrder))
        setAllowedPositionGroups(allowedPositionGroups[score.instrumenttype as Orchestra])
        setOrchestra(score.instrumenttype)
    }

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

    // Loads a recovered score snapshot into the editor: re-derive the object-notation caches
    // (postprocessScore) then set the score states, exactly like a DB load. The recovered work
    // is unsaved by definition, so it is (re)marked dirty to keep it protected.
    const recoverScore = useCallback(
        (score: Score) => {
            const processed = postprocessScore(structuredClone(score), beatPosition)
            setScoreStates(processed)
            useScoreStore.setState({ dirty: true })
        },
        [beatPosition]
    )

    interface StaffNoObject {
        notation: NoteSymbol[]
        objNotation?: NoteObject[]
        objNotation_?: NoteObject[]
    }

    const saveScore = useCallback(
        async (
            score: Score | undefined,
            destination: 'database' | 'jsonfile' | 'midifile' | 'pdffile'
        ): Promise<boolean> => {
            // if (!newScoreInfo || same<ScoreInfo>(newScoreInfo, scoreInfo)) return
            var isSuccess = false
            // MIDI and PDF export need the object notation (objNotation) / groups, so they use
            // the original score; the JSON/DB paths use a stripped clone.
            if (destination == 'midifile') return await saveScoreToMidiFile(score)
            if (destination == 'pdffile') return await saveScoreToPdfFile(score)
            // Create a copy of the score object and remove the object versions of the notation
            const scoreNoObject = structuredClone(score)
            scoreNoObject?.systems.forEach((system) => {
                _.values(system.staffs).forEach((staff) => {
                    if (staff) delete (staff as StaffNoObject).objNotation
                    if (staff) delete (staff as StaffNoObject).objNotation_
                })
            })
            if (destination == 'database') isSuccess = await saveScoreToDb(scoreNoObject)
            else if (destination == 'jsonfile') isSuccess = await saveScoreToLocalFile(scoreNoObject)
            // A successful save to the DB or a Tabuh Studio .json export is the definition of
            // "saved": clear the dirty flag and drop the recovery snapshot so no stale prompt
            // appears on the next startup. (MIDI/PDF exports returned earlier and don't count.)
            if (isSuccess && (destination == 'database' || destination == 'jsonfile')) {
                useScoreStore.getState().markSaved()
                useRecoveryStore.getState().clear()
            }
            return isSuccess
        },
        [beatPosition]
    )

    // Loads a Score object description from a JSON file on the web server.
    async function loadScoreFromFile(newScoreInfo: ScoreInfo | undefined) {
        if (newScoreInfo) {
            setIsLoading(true)
            let jsonText = await readFile('scores/' + newScoreInfo.file)
            var score: Score = JSON.parse(jsonText)
            if (!score) return
            score = postprocessScore(score, beatPosition)
            setScoreStates(score)
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
                setScoreStates(postprocessScore(parsed, beatPosition))
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
                    setScoreStates(postprocessScore(parserReturnValue.score, beatPosition))
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
            const score = postprocessScore(record.content as Score, beatPosition)
            setScoreStates(score)
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
    // Shared "save content to a local file": File System Access API where available
    // (Chrome/Edge), with a Blob + anchor-download fallback (Firefox/Safari).
    async function saveToLocalFile(
        content: BlobPart,
        suggestedName: string,
        mimeType: string,
        extension: string,
        description: string
    ): Promise<boolean> {
        try {
            if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function') {
                const handle = await window.showSaveFilePicker({
                    suggestedName,
                    types: [{ description, accept: { [mimeType]: [extension] } }]
                })
                const writable = await handle.createWritable()
                await writable.write(content)
                await writable.close()
                return true
            }
            const blob = new Blob([content], { type: mimeType })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = suggestedName
            anchor.click()
            URL.revokeObjectURL(url)
            return true
        } catch (err) {
            // User cancelled the dialog — not a real error
            if (err instanceof DOMException && err.name === 'AbortError') return false
            console.error('Failed to save file:', err)
            return false
        }
    }

    // Saves several files into a single folder the user picks once (File System Access API,
    // Chrome/Edge), falling back to individual downloads (Firefox/Safari). The directory
    // picker is opened *before* any content is generated so it runs within the click's user
    // gesture. Content is produced lazily via `make` so the (async) PDF build happens after.
    async function saveFilesToFolder(
        files: { name: string; mime: string; make: () => BlobPart | Promise<BlobPart> }[]
    ): Promise<boolean> {
        try {
            const picker = (window as unknown as { showDirectoryPicker?: (o?: object) => Promise<any> })
                .showDirectoryPicker
            if (typeof picker === 'function') {
                const dir: any = await picker({ mode: 'readwrite' })
                for (const f of files) {
                    const content = await f.make()
                    const handle = await dir.getFileHandle(f.name, { create: true })
                    const writable = await handle.createWritable()
                    await writable.write(content)
                    await writable.close()
                }
                return true
            }
            // Fallback: download each file to the browser's default download folder.
            for (const f of files) {
                const blob = new Blob([await f.make()], { type: f.mime })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = f.name
                anchor.click()
                URL.revokeObjectURL(url)
            }
            return true
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return false // user cancelled
            console.error('Failed to save files:', err)
            return false
        }
    }

    const fileStem = (score: Score) => score.title.replace(/[^a-z0-9]/gi, '_')

    async function saveScoreToLocalFile(score: Score | undefined): Promise<boolean> {
        if (!score) return false
        const json = scoreToFormattedJson(score)
        return saveToLocalFile(json, `${fileStem(score)}.json`, 'application/json', '.json', 'JSON score file')
    }

    // Exports the whole score as a Standard MIDI File (one track per position) plus a
    // companion note-map PDF, both written into a single folder the user picks. Builds the
    // resolved playback timeline (whole score, all systems) and translates it to MIDI.
    async function saveScoreToMidiFile(score: Score | undefined): Promise<boolean> {
        if (!score) return false
        const timeline = buildTimeline(
            { actionType: 'load', playbackType: 'multiple', score, systemIndex: 0 },
            { useCache: true, beatPosition, forceStrokeEmulation: true }
        )
        if (!timeline) return false
        const stem = fileStem(score)
        const positions = midiTrackPositions(timeline)
        return saveFilesToFolder([
            { name: `${stem}.mid`, mime: 'audio/midi', make: () => generateMidiFile(timeline) as BlobPart },
            {
                name: `${stem} - MIDI note map.pdf`,
                mime: 'application/pdf',
                make: async () =>
                    (await generateMidiNoteMapPdf(buildMidiNoteMapModel(score.title, positions))) as BlobPart
            }
        ])
    }

    // Exports the score as a formatted notation PDF (compact grouped notation).
    async function saveScoreToPdfFile(score: Score | undefined): Promise<boolean> {
        if (!score) return false
        const model = buildPdfModel(score)
        const bytes = (await generatePdf(model)) as BlobPart
        return saveToLocalFile(bytes, `${fileStem(score)}.pdf`, 'application/pdf', '.pdf', 'PDF document')
    }

    async function loadScoreListFromDb() {
        window.open
        setIsLoading(true)
        try {
            // Find the database id by matching uuid from the score list
            const scores = await apiGetScores()
            if (scores) {
                const scoreInfoList = scores
                    .filter((score) => _.keys(orchestraConfigs).includes(score.instrument_set))
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
                .filter((info) => _.keys(orchestraConfigs).includes(info.instrumentgroup))
                .toSorted((i1, i2) => i1.title.localeCompare(i2.title))
        )
        setIsLoading(false)
    }

    return { loadScore, saveScore, recoverScore, isLoading }
}
