import type { ChangeEvent, JSX, RefObject } from "react";
import { useState, useEffect, useRef } from "react";
import { readFile } from "../utils/filesystem";
import type { Score, ScoreInfo, Section, Stave, System } from "../models/types";


// Width is a fraction, e.g. 3/10
function Selector({id, title, items, onChange} : {id: string, title: string, width: string, items: JSX.Element[], onChange: CallableFunction}) {
    return (
        <div className={`flex-auto gap-3`}>
            <div className="">
            <span className={"font-semibold italic pe-2"}>{title}:</span>
            <select id={id}  title={title} onChange={e => onChange(e.target.value)} className="bg-blue-300 border-blue-500 border rounded-md">
                { items }
            </select>
            </div>
        </div>
    )
}

export default function Selectors(
    {score, scoreUpdater, focusUpdater}: {score: Score | null, scoreUpdater: Function, focusUpdater: Function}, 
    ) : JSX.Element {
    const [scoreListItems, setScoreListItems] = useState<JSX.Element[]>([]);
    const [focusListItems, setFocusListItems] = useState<JSX.Element[]>([]);


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
        async function fetchFocusInstruments(score: Score | null) {
            let instruments: string[] = []
            if (score) {
                const instr_lists: string[] = score.systems.map((system: System) => system.sections.map((section: Section) => Object.keys(section.staves)).flat()).flat()
                instruments = [...new Set(instr_lists)]
            }
            const instr_options: JSX.Element[] = [<option value={""} key={""}>No focus</option>].concat(
                instruments.map((instrument: string) => (
                <option value={instrument} key={instrument}>{instrument}</option>
            )))
            setFocusListItems(instr_options)
        }
        fetchFocusInstruments(score);
    }, [score]);

    const onChangeSongSelector = (value: string) => {
        scoreUpdater(value)
        onChangeFocusSelector("")
    }

    const onChangeFocusSelector = (value: string) => {
        focusUpdater(value)
    }

    return (
            <div className="selectors flex flex-wrap">
                <Selector id="songselector" title="Song" width="3/10" items={scoreListItems} onChange={onChangeSongSelector}/>
                <Selector id="focusselector" title="Focus"  width="3/10" items={focusListItems} onChange={onChangeFocusSelector}/>
            </div>
        )
}