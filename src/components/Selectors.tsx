import type { ChangeEvent, JSX } from "react";
import { useState } from "react";


// Convert a list of string values to a list op option Elements.
function itemListToOptions(values: string[], noSelectionValue?: string): JSX.Element[] {
    const optionValues = values.map((value: string, index: number) => (
                <option key={index+1} value={value}>{value}</option>
            ))
    const noSelectionOption = noSelectionValue ?  [<option key={0} value={""} label={""}>{noSelectionValue}</option>] : []
    return noSelectionOption.concat(optionValues)
}


// Width is a fraction, e.g. 3/10
function Selector({id, title, index, valueList, noSelectionValue, onChange} : 
    {id: string, title: string, index: number,  width: string, valueList: string[], noSelectionValue?: string, onChange: CallableFunction}) {

    const items: JSX.Element[] = itemListToOptions(valueList, noSelectionValue)
    return (
        <div className={`flex-auto gap-3`}>
            <div className="">
            <span className={"font-semibold italic pe-2"}>{title}:</span>
            <select id={id}  
                title={title} 
                value={items[index]?.props.value || 0}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {onChange(e.target.value, e.target.selectedIndex)}} 
                className="bg-blue-300 border-blue-500 border rounded-md"
            >
                { items }
            </select>
            </div>
        </div>
    )
}

export default function Selectors(
    {songList, focusList, songUpdater, focusUpdater, speedUpdater}: {songList: string[], focusList: string[], songUpdater: Function, focusUpdater: Function, speedUpdater: Function}, 
    ) : JSX.Element {
    const [songIndex,setSongIndex]  = useState<number>(0)
    const [focusIndex,setFocusIndex]  = useState<number>(0)
    const [speedIndex,setSpeedIndex]  = useState<number>(9)
    const speedList = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100" ]

    const onChangeSongSelector = (value: string, index: number) => {
        songUpdater(value)
        setSongIndex(index)
        onChangeFocusSelector("", 0)
        
    }

    const onChangeFocusSelector = (value: string, index: number) => {
        setFocusIndex(index)
        focusUpdater(value)
    }

    //@ts-ignore unused `value` argument
    const onChangeSpeedSelector = (value: string, index: number) => {
        setSpeedIndex(index)
        speedUpdater(speedList[index])
    }

    return (
            <div className="selectors flex flex-wrap">
                <Selector id="songselector" title="Song" index={songIndex} width="3/10" valueList={songList} noSelectionValue="Select a title" onChange={onChangeSongSelector}/>
                <Selector id="focusselector" title="Focus" index={focusIndex} width="3/10" valueList={focusList} noSelectionValue="No focus" onChange={onChangeFocusSelector}/>
                <Selector id="speedselector" title="Speed" index={speedIndex} width="3/10" valueList={speedList} onChange={onChangeSpeedSelector}/>
            </div>
        )
}