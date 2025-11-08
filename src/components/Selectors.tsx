import type { ChangeEvent, JSX, ReactElement, RefObject } from "react";
import { useState, useEffect, useRef } from "react";
import { readFile } from "../utils/filesystem";
import type { Score, ScoreInfo, Section, System } from "../models/types";


// Width is a fraction, e.g. 3/10
function Selector({id, title, index, items, onChange} : {id: string, title: string, index: number,  width: string, items: JSX.Element[], onChange: CallableFunction}) {
    // const [currValue, setCurrValue] = useState(value)
    return (
        <div className={`flex-auto gap-3`}>
            <div className="">
            <span className={"font-semibold italic pe-2"}>{title}:</span>
            <select id={id}  
                title={title} 
                value={items[index]?.props.value || 0}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {onChange(e.target.selectedOptions[0].label, e.target.value, e.target.selectedIndex)}} 
                className="bg-blue-300 border-blue-500 border rounded-md"
            >
                { items }
            </select>
            </div>
        </div>
    )
}

// Convert a list of string values to a list op option Elements.
function itemListToOptions(keys: string[], values: string[], noSelectionValue?: string): JSX.Element[] {
    const optionValues = keys.map((key: string, index: number) => (
                <option value={values[index]} key={key}>{key}</option>
            ))
    const noSelectionOption = noSelectionValue ?  [<option value={""} label={""}>{noSelectionValue}</option>] : []
    return noSelectionOption.concat(optionValues)
}

export default function Selectors(
    {score, scoreUpdater, focusUpdater}: {score: Score | null, scoreUpdater: Function, focusUpdater: Function}, 
    ) : JSX.Element {
    const [scoreListItems, setScoreListItems] = useState<JSX.Element[]>([]);
    const [focusListItems, setFocusListItems] = useState<JSX.Element[]>([]);
    const [scoreIndex,setScoreIndex]  = useState<number>(0)
    const [focusIndex,setFocusIndex]  = useState<number>(0)


    // Populate the score selector
    useEffect(() => {
        async function fetchScores() {
            const files = await readFile('scores/content.json');
            const scoreInfo: ScoreInfo[] = JSON.parse(files)
            const titlelist: string[] = scoreInfo.map((score: ScoreInfo) => score.title)
            const filelist: string[] = scoreInfo.map((score: ScoreInfo) => score.file)
            setScoreListItems(itemListToOptions(titlelist, filelist, "Select a title"));
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
            setFocusListItems(itemListToOptions(instruments, instruments, "No focus"))
        }
        fetchFocusInstruments(score);
    }, [score]);

    const onChangeSongSelector = (label: string, value: string, index: number) => {
        scoreUpdater(value)
        setScoreIndex(index)
        onChangeFocusSelector("", "", 0)
        
    }

    const onChangeFocusSelector = (label: string, value: string, index: number) => {
        setFocusIndex(index)
        focusUpdater(focusListItems[index].props.value)
    }

    return (
            <div className="selectors flex flex-wrap">
                <Selector id="songselector" title="Song" index={scoreIndex} width="3/10" items={scoreListItems} onChange={onChangeSongSelector}/>
                <Selector id="focusselector" title="Focus" index={focusIndex} width="3/10" items={focusListItems} onChange={onChangeFocusSelector}/>
            </div>
        )
}