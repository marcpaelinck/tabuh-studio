import type { JSX } from "react";
import { useState } from "react";
import { ButtonToolbar, Dropdown } from "rsuite";
import 'rsuite/Dropdown/styles/index.css';
import 'rsuite/ButtonToolbar/styles/index.css';

// Convert a list of string values to a list op option Elements.
function itemListToOptions(values: string[], onChange: CallableFunction): JSX.Element[] {
    return values.map((value: string, index: number) => (
                <Dropdown.Item
                    key={index} 
                    onSelect={(eventKey: string, e: any) => {onChange(eventKey)}} 
                    eventKey={index+1}
                >{value}</Dropdown.Item>
            ))
}


// Width is a fraction, e.g. 3/10
const Selector = ({valueList, onChange, ...props}: {valueList: string[], onChange: (index: number) => void, [key: string]: any}) => 
     {
    const items: JSX.Element[] = itemListToOptions(valueList, onChange)
    return (
        // <div className={`flex-auto gap-3`}>
            <Dropdown {...props}>
                { items }
            </Dropdown>
        // </div>
    )
}

export default function Selectors(
    {songList, focusList, songUpdater, focusUpdater, speedUpdater}: {songList: string[], focusList: string[], songUpdater: Function, focusUpdater: Function, speedUpdater: Function}, 
    ) : JSX.Element {
    const [songIndex,setSongIndex]  = useState<number>(-1)
    const [focusIndex,setFocusIndex]  = useState<number>(1)
    const [speedIndex,setSpeedIndex]  = useState<number>(10)
    const speedList = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100" ]

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

    return (
            <div className="selectors flex flex-wrap">
                <ButtonToolbar>
                    <Selector id="songselector" title={songList[songIndex-1] || "Tabuh..."} width="3/10" valueList={songList} onChange={onChangeSongSelector}/>
                    <Selector id="focusselector" title={focusList[focusIndex-1]} width="3/10" valueList={focusList} onChange={onChangeFocusSelector}/>
                    <Selector id="speedselector" title={`speed: ${speedList[speedIndex-1]}%`} width="3/10" valueList={speedList} onChange={onChangeSpeedSelector}/>
                </ButtonToolbar>
            </div>
        )
}