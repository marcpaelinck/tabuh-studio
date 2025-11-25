import { useEffect, useRef, useState } from "react";
import type { Score } from "../models/types";
import { readFile } from "../utils/filesystem";
import { parseScore } from "../utils/scoreplayerUtils/score";

// Loads and parses a score when a new tabuh (score title) is selected
export const useScore = (initValue: Score | null): [Score, CallableFunction, boolean] => {
    const [tabuh, setTabuh] = useState<string | null>(null)
    const [score, setScore] = useState<Score | null>(initValue)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const tabuhDictRef = useRef<Record<string, string>>({})

    function loadNewScore(tabuhName: string, tabuhDict: Record<string, string>) {
        tabuhDictRef.current = tabuhDict
        setTabuh(tabuhName)
    }

    useEffect(() => {
        const loadScore = async () => {
            if (tabuh) {
                setIsLoading(true)
                let jsonScore = await readFile('scores/' + tabuhDictRef.current[tabuh])
                const newScore = parseScore(jsonScore)
                if (newScore && newScore != score) {
                    setScore(newScore)
                }
                setIsLoading(false)
            }
        }
        loadScore()
    }, [tabuh])

    return [score as Score, loadNewScore, isLoading]
}