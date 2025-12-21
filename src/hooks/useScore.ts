import { useEffect, useState } from 'react'
import type { Score } from '../models/types'
import { readFile } from '../utils/filesystem'
import { parseScore } from '../utils/score'

// Loads and parses a score when a new tabuh (score title) is selected
export const useScore = (initValue: Score | null): [Score, CallableFunction, boolean] => {
    const [fileName, setFileName] = useState<string | null>(null)
    const [score, setScore] = useState<Score | null>(initValue)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    function loadScore(name: string) {
        setFileName(name)
    }

    useEffect(() => {
        const load = async () => {
            if (fileName) {
                setIsLoading(true)
                let jsonScore = await readFile('scores/' + fileName)
                const newScore = parseScore(jsonScore)
                if (newScore && newScore != score) {
                    setScore(newScore)
                }
                setIsLoading(false)
            }
        }
        load()
    }, [fileName])

    return [score as Score, loadScore, isLoading]
}
