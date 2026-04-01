import { useContext, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { WpApiFunctions } from '../components/contexts'
import { parseLaras } from '../scoreparsers/larasParser'
import { parseNotation } from '../scoreparsers/notationParser'
import type { EditorScore, ScoreFormat, ScoreInfo } from '../typing/types'
import { readFile } from '../utils/filesystem'

function postprocessScore(score: EditorScore): EditorScore {
    if (!score.uuid) score.uuid = uuidv4()
    if (score.hasCycle == undefined) score.hasCycle = false
    return score
}

// Loads and parses a score when a new tabuh (score title) is selected
export function useScoreReader(source: 'database' | 'file'): {
    scoreList: ScoreInfo[]
    loadedScore: EditorScore | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    isLoading: boolean
} {
    const [scoreInfo, setScoreinfo] = useState<ScoreInfo | undefined>(undefined)
    const [scoreList, setScoreList] = useState<ScoreInfo[]>([])
    const [loadedScore, setScore] = useState<EditorScore>()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const wpFunc = useContext(WpApiFunctions)

    useEffect(() => {
        if (source == 'database') loadScoreFromDb()
        else if (source == 'file') loadScoreFromFile()
        else console.error('useScoreReader: source for score is not `db` or `file`.')
    }, [scoreInfo])

    useEffect(() => {
        if (source == 'database') loadScoreListFromDb()
        else if (source == 'file') loadScoreListFromFile()
        else console.error('useScoreReader: source for score list is not `db` or `file`.')
    }, [])

    function loadScore(format: ScoreFormat, scoreInfo: ScoreInfo | undefined) {
        switch (format) {
            case 'JSON':
                setScoreinfo(scoreInfo)
                break
            case 'Laras':
            case 'Notation':
                importScore(format)
                break
            default:
        }
    }

    // Loads a Score object description from a JSON file on the web server.
    async function loadScoreFromFile() {
        if (scoreInfo) {
            setIsLoading(true)
            let jsonText = await readFile('scores/' + scoreInfo.file)
            var score: EditorScore = JSON.parse(jsonText)
            if (!score) return
            score = postprocessScore(score)
            setScore(score)
            setIsLoading(false)
        }
    }

    // Loads a JSON Score object description from the website's database.
    async function loadScoreFromDb() {
        if (scoreInfo) {
            setIsLoading(true)
            let response = await wpFunc.database.getScore(scoreInfo.uuid)
            if (
                response &&
                'success' in response &&
                response.success &&
                'result' in response &&
                response.result.length > 0 &&
                'notation' in response.result[0]
            ) {
                const json = JSON.parse(response.result[0].notation)
                if (!json) return

                var newScore: EditorScore | undefined = undefined

                newScore = postprocessScore(json)
                setScore(newScore)
                setIsLoading(false)
            }
        }
    }

    // Imports a file with an alternative format and parses it to a Score object.
    async function importScore(format: ScoreFormat) {
        const parse = format == 'Laras' ? parseLaras : format == 'Notation' ? parseNotation : () => undefined
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                const content = await file.text()
                const score = parse(content)
                if (score) {
                    setScore(score)
                }

                // Process content as needed
            }
        }
        fileInput.click()
    }

    async function loadScoreListFromDb() {
        window.open
        setIsLoading(true)
        const response = await wpFunc.database.getScoreList()
        if (response && 'success' in response && response.success && 'result' in response) {
            const newList = response.result.map((result) => {
                return { ...result, ...{ instrumentgroup: 'gongkebyar' }, ...{ notationversion: 'new' } }
            })
            setScoreList(newList)
        }
        setIsLoading(false)
    }

    async function loadScoreListFromFile() {
        setIsLoading(true)
        const files = await readFile('scores/content.json')
        const scoreInfo: ScoreInfo[] = JSON.parse(files)
        setScoreList(scoreInfo.filter((info) => info.instrumentgroup == 'GONG_KEBYAR'))
        setIsLoading(false)
    }

    return { scoreList, loadedScore, loadScore, isLoading }
}
