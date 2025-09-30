import type { JSX } from "react";
import { useState, useEffect } from "react";
import { readFile } from "../utils/filesystem";
import type { Score, ScoreInfo, Section, SectionData } from "../models/types";




export default function Selectors(
    {score, scoreUpdater: score_updater, focusUpdater: focus_updater}: {score: Score, scoreUpdater: Function, focusUpdater: Function}, 
    ) : JSX.Element {
    const [scoreListItems, setScoreListItems] = useState<JSX.Element[]>([]);
    const [focusListItems, setFocusListItems] = useState<JSX.Element[]>([]);


    // function Selector({id, title, onChange, listItems}: 
    //                 {id: string, title: string, onChange: Function, listItems: JSX.Element[]}) {
    //     return  <select id={id} title={title} onChange={e => onChange(e.target.value)}>
    //                 { listItems }
    //         </select>
    // }
    
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
                    <select id="songselector" title="Song" onChange={e => score_updater(e.target.value)} className="bg-amber-100">
                        { scoreListItems }
                    </select>
                    <span className="font-semibold italic ps-5 pe-2">Focus:</span>
                    <select id="focusselector" title="Focus" onChange={e => focus_updater(e.target.value)} className=" bg-amber-100">
                        { focusListItems }
                    </select>
				</div>
			</div>
        )
}