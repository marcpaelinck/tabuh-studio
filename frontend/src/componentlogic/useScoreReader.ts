import { useCallback, useContext, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { WpApiFunctions } from '../components/contexts'
import { parseLaras } from '../scoreparsers/larasParser'
import { parseNotation } from '../scoreparsers/tabuhParser'
import type { ScoreInfo } from '../typing/menus'
import type { ParserReturnValue } from '../typing/parsers'
import type { Score, ScoreFormat } from '../typing/score'
import { readFile } from '../utils/filesystem'

function postprocessScore(score: Score): Score {
    if (!score.uuid) score.uuid = uuidv4()
    return score
}

// Loads and parses a score when a new tabuh (score title) is selected
export function useScoreReader(source: 'database' | 'file'): {
    scoreList: ScoreInfo[]
    loadedScore: Score | undefined
    loadScore: (format: ScoreFormat, scoreInfo?: ScoreInfo) => void
    isLoading: boolean
} {
    const [scoreInfo, setScoreinfo] = useState<ScoreInfo | undefined>(undefined)
    const [scoreList, setScoreList] = useState<ScoreInfo[]>([])
    const [loadedScore, setScore] = useState<Score>()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const wpFunc = useContext(WpApiFunctions)

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
                setScoreinfo(newScoreInfo)

                break
            case 'Laras':
            case 'Notation':
                importScore(format)
                break
            default:
        }
    }, [])

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

    // Loads a JSON Score object description from the website's database.
    async function loadScoreFromDb(newScoreInfo: ScoreInfo | undefined) {
        if (newScoreInfo) {
            setIsLoading(true)
            let response = await wpFunc.database.getScore(newScoreInfo.uuid)
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

                var newScore: Score | undefined = undefined

                newScore = postprocessScore(json)
                setScore(newScore)
                setIsLoading(false)
            }
        }
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

    async function loadScoreListFromDb() {
        window.open
        setIsLoading(true)
        const response = await wpFunc.database.getScoreList()
        if (response && 'success' in response && response.success && 'result' in response) {
            const newList = response.result.map((result: Score) => {
                return { ...result, instrumentgroup: 'gongkebyar', notationversion: 'new' }
            })
            setScoreList(newList)
        }
        setIsLoading(false)
    }

    async function loadScoreListFromFile() {
        setIsLoading(true)
        const files = await readFile('scores/content.json')
        const scoreInfoList: ScoreInfo[] = JSON.parse(files)
        setScoreList(scoreInfoList.filter((info) => info.instrumentgroup == 'GONG_KEBYAR'))
        setIsLoading(false)
    }

    return { scoreList, loadedScore, loadScore, isLoading }
}
