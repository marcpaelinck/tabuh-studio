import _ from 'lodash'
import { useEffect, useState } from 'react'
import type { ScoreInfo } from '../models/types'
import { readFile } from '../utils/filesystem'

// Reads the JSON file containing the list of available compositions
export const useScoreList = (initValue?: ScoreInfo[]): { scoreList: ScoreInfo[]; loading: boolean } => {
    const [scoreList, setScoreList] = useState<ScoreInfo[]>(initValue || [])
    const [loading, setLoading] = useState<boolean>(false)

    // Retrieve information about available notation scores
    useEffect(() => {
        async function fetchScores() {
            if (initValue && _.isEqual(scoreList, initValue)) {
                setLoading(true)
                const files = await readFile('scores/content.json')
                const scoreInfo: ScoreInfo[] = JSON.parse(files)
                setScoreList(scoreInfo)
                setLoading(false)
            }
        }
        fetchScores()
    }, [])

    return { scoreList, loading }
}
