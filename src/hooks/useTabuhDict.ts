import { useEffect, useState } from "react";
import { readFile } from "../utils/filesystem";
import type { ScoreInfo } from "../models/types";
import _ from "lodash";

// Reads the JSON file containing the list of available compositions
export const useTabuhDict = (initValue?: Record<string, string>): [Record<string, string>, boolean] => {
    const [tabuhDict, setTabuhDict] = useState<Record<string, string>>(initValue || {})
    const [reading, setReading] = useState<boolean>(false)

    // Retrieve information about available notation scores  
    useEffect(() => {
        async function fetchScores() {
            if (initValue && _.isEqual(tabuhDict, initValue)) {
                setReading(true)
                const files = await readFile('scores/content.json');
                const scoreInfo: ScoreInfo[] = JSON.parse(files)
                setTabuhDict(Object.fromEntries(scoreInfo.map((score: ScoreInfo) => [score.title, score.file])))
                setReading(false)
            }
        }
        fetchScores();
    }, [])

    return [tabuhDict, reading]
}