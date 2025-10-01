import type { ChangeEvent, JSX, RefObject } from "react";
import { useState, useEffect, useRef } from "react";
import { readFile } from "../utils/filesystem";
import type { Score, ScoreInfo, Section, SectionData } from "../models/types";




export default function Selectors(
    {score, scoreUpdater: score_updater, focusUpdater: focus_updater}: {score: Score, scoreUpdater: Function, focusUpdater: Function}, 
    ) : JSX.Element {
    const [scoreListItems, setScoreListItems] = useState<JSX.Element[]>([]);
    const [focusListItems, setFocusListItems] = useState<JSX.Element[]>([]);
    const [currentFocus, setCurrentFocus] = useState<string>("");
    const focusSelector: RefObject<HTMLSelectElement | null> = useRef(null)

    // Populate the score selector
    useEffect(() => {
        async function fetchScores() {
            const files = await readFile('scores/content.json');
            const filelist = JSON.parse(files)
            setScoreListItems(
                [<option value={""} key={""}>Select a title</option>].concat(
                filelist.map((score: ScoreInfo) => (
                    <option value={score.file} key={score.title}>{score.title}</option>
                )))
            );
        }
        fetchScores();
    }, []);

    const onChangeSongSelector = (value: string) => {
        score_updater(value)
        onChangeFocusSelector("")
    }

    const onChangeFocusSelector = (value: string) => {
        setCurrentFocus(value)
        focus_updater(value)
    }

    // Populate the focus selector with the instruments in the selected score
    useEffect(() => {
        async function fetchFocusInstruments(score: Score) {
            const instr_lists: string[][] = score.sections.map((section: Section) => section.data.map((data: SectionData) => data.label))
            const instruments: string[] = [...new Set(instr_lists.flat())]
            const instr_options: JSX.Element[] = [<option value={""} key={""}>No focus</option>].concat(
                instruments.map((instrument: string) => (
                <option value={instrument} key={instrument}>{instrument}</option>
            )))
            setFocusListItems(instr_options)
        }
        fetchFocusInstruments(score);
    }, [score]);

    return (<div className="">
				<div className="label">
                    <span className="font-semibold italic pe-2">Song:</span>
                    <select id="songselector"  title="Song" onChange={e => onChangeSongSelector(e.target.value)} className="bg-amber-100">
                        { scoreListItems }
                    </select>
                    <span className="font-semibold italic ps-5 pe-2">Focus:</span>
                    <select id="focusselector" ref={focusSelector} value={currentFocus} title="Focus" onChange={e => onChangeFocusSelector(e.target.value)} className=" bg-amber-100">
                        { focusListItems }
                    </select>
				</div>
			</div>
        )
}