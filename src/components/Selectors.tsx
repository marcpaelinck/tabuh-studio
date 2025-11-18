import type { JSX, RefObject } from "react";
import { useState } from "react";
import { ButtonToolbar, Dropdown } from "rsuite";
import 'rsuite/styles/index.less';
import 'rsuite/Dropdown/styles/index.css';
import 'rsuite/ButtonToolbar/styles/index.css';
import { speedList } from "../config/constants";

// Convert a list of string values to a list op option Elements.
function itemListToOptions(values: string[], onChange: CallableFunction): JSX.Element[] {
    return values.map((value: string, index: number) => (
                <Dropdown.Item
                    key={index} 
                    onSelect={(eventKey: string) => {onChange(eventKey)}} 
                    eventKey={index+1}
                >{value}</Dropdown.Item>
            ))
}


const Selector = ({valueList, onChange, ...props}: {valueList: string[], onChange: (index: number) => void, [key: string]: any}) => 
     {
    const items: JSX.Element[] = itemListToOptions(valueList, onChange)
    return (
        <Dropdown menuStyle={{overflow:"scroll", maxHeight: "300px"}} {...props}>
            { items }
        </Dropdown>
    )
}

export default function Selectors(
    {menuDisabled, songList, focusList, songUpdater, focusUpdater, speedUpdater}: 
    {menuDisabled: RefObject<Record<string, boolean>>, songList: string[], focusList: string[], songUpdater: Function, focusUpdater: Function, speedUpdater: Function}, 
    ) : JSX.Element {
    const [songIndex,setSongIndex]  = useState<number>(-1)
    const [focusIndex,setFocusIndex]  = useState<number>(1)
    const [speedIndex,setSpeedIndex]  = useState<number>(10)

    const onChangeSongSelector = (index: number) => {
        console.log(`index=${index}, song=${songList[index-1]}`)
        setSongIndex(index)
        songUpdater(songList[index-1])
        onChangeFocusSelector(1)
        
    }

    const onChangeFocusSelector = (index: number) => {
        console.log(`index=${index}, focus=${focusList[index-1]}`)
        setFocusIndex(index)
        focusUpdater(index==1 ? "" : focusList[index-1])
    }

    const onChangeSpeedSelector = (index: number) => {
        console.log(`index=${index}, speed=${speedList[index-1]}`)
        setSpeedIndex(index)
        speedUpdater(speedList[index-1])
    }

    const fmtPercent = (valList: number[] | string[]) => valList.map((val: number | string) => `${val}%`)

    const div: HTMLDivElement | null = document.querySelector("#--test--");
    if (div) {
        div.className = "ts-theme-animation"
        const compStyles = getComputedStyle(div)
        console.log(compStyles)
    } else console.log("niet gelukt")

    return (
            <div className="selectors flex flex-wrap">
                <ButtonToolbar>
                    <Selector id="songselector" 
                        disabled={menuDisabled.current["tabuh"]}
                        title={songList[songIndex-1] || "Tabuh..."} 
                        className="songselector" 
                        // menuStyle={}
                        width="3/10" valueList={songList} onChange={onChangeSongSelector}
                    />
                    <Selector 
                        id="focusselector" 
                        disabled={menuDisabled.current["focus"]}
                        title={focusList[focusIndex-1]} 
                        width="3/10" 
                        valueList={focusList} 
                        onChange={onChangeFocusSelector}
                    />
                    <Selector 
                        id="speedselector" 
                        title={`speed: ${speedList[speedIndex-1]}%`} 
                        width="3/10" 
                        valueList={fmtPercent(speedList)} 
                        onChange={onChangeSpeedSelector}
                    />
                </ButtonToolbar>
            </div>
        )
}