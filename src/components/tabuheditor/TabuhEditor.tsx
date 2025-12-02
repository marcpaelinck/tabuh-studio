import { useEffect, useState } from "react"
import { useScore } from "../../hooks/useScore"
import EditWindow from "./EditWindow"
import Menu from "./Menu"
import { VStack } from "rsuite"

export default function TabuhEditor({tabuhDict, loadingTabuhDict} : 
    {tabuhDict: Record<string, string>, loadingTabuhDict: boolean})
{
    const [score, loadScore, loadingScore] = useScore(null)
    const [menuDisabled, setMenuDisabled] = useState<boolean>(false)

    var scoreList: string[] = Object.keys(tabuhDict)

    useEffect(() => {
        setMenuDisabled(loadingTabuhDict)
    }, [loadingTabuhDict, loadingScore])


    useEffect(() => {

    }, [score])

    return (
        <div id="TabuhEditor">
            <VStack className="m-5">
                <Menu 
                    menuDisabled={menuDisabled} 
                    tabuhList={scoreList} 
                    scoreUpdater={(value: string) => loadScore(tabuhDict[value])} 
                />    
                <EditWindow score={score}/>
            </VStack>
        </div>
)
}