import { useEffect, useState } from "react";
import { readFile } from "../utils/filesystem";
import type { ScoreInfo } from "../models/types";

export const useScoreDict = (setMenuDisabled: CallableFunction) => {
    const [scoreDict, setScoreDict] = useState<Record<string, string>>({})

    // Retrieve information about available notation scores  
    useEffect(() => {
        async function fetchScores() {
            setMenuDisabled("tabuh", true)
            setMenuDisabled("focus", true)
            const files = await readFile('scores/content.json');
            const scoreInfo: ScoreInfo[] = JSON.parse(files)
            setScoreDict(Object.fromEntries(scoreInfo.map((score: ScoreInfo) => [score.title, score.file])))
            setMenuDisabled("tabuh", false)
        }
        fetchScores();
    }, [])

    return scoreDict
}