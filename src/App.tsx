import { VStack, Toggle } from 'rsuite'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import EditIcon from '@rsuite/icons/Edit'
import TabuhPlayer from './components/tabuhplayer/TabuhPlayer'
import 'rsuite/Toggle/styles/index.css'
import { createContext, useState, type Dispatch} from 'react'
import { FRAMESTYLE } from './config/constants'
import TabuhEditor from './components/tabuheditor/TabuhEditor'
import { useTabuhDict } from './hooks/useTabuhDict'
import DebugWindow from './components/DebugWindow'

export const DebugContext = createContext<Dispatch<string>>(()=>{})

export default function App() {

  // Set to false to remove debug window
  const debugMode: boolean = false

  const [active, setActive] = useState<"editor"|"player">("player")
  const [tabuhDict, loadingTabuhDict] = useTabuhDict({})
  const [debugMessage, setDebugMessage] = useState<string | null>(null)

  function debug(message: string) {
    setDebugMessage(message)
  }

  return (
    <div className="flex w-full min-h-0 ">
      <DebugContext value={debug}>
      <VStack id="vstack" className="flex w-full" align="center">
          <Toggle
            size={'lg'}
            color="violet"
            checkedChildren={<PlayOutlineIcon />}
            unCheckedChildren={<EditIcon />}
            defaultChecked
            onChange={(checked) => setActive(checked ? "player" : "editor")}
          />
          {debugMode && <DebugWindow message={debugMessage}/>}
          <div className={"lg:w-8/10 sm:w-full min-h-10" + FRAMESTYLE}>
            {active=="player" 
            ? <TabuhPlayer tabuhDict={tabuhDict} loadingTabuhDict={loadingTabuhDict}/> 
            : <TabuhEditor tabuhDict={tabuhDict} loadingTabuhDict={loadingTabuhDict}/>}
        </div>
      </VStack>
      </DebugContext>      
    </div>

  )
}
