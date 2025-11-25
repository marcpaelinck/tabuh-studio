// import ScoreEditor from './components/ScoreEditor'
import { VStack, Toggle } from 'rsuite'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import EditIcon from '@rsuite/icons/Edit'
import TabuhPlayer from './components/tabuhplayer/TabuhPlayer'
import 'rsuite/Toggle/styles/index.css'
import { useState } from 'react'
import { FRAMESTYLE } from './config/constants'
import TabuhEditor from './components/tabuheditor/TabuhEditor'
import { useTabuhDict } from './hooks/useTabuhDict'

export default function App() {

  const [active, setActive] = useState<"editor"|"player">("player")
  const [tabuhDict, loadingTabuhDict] = useTabuhDict({})
  

  return (
    <div className="flex w-full min-h-0 ">
      <VStack id="vstack" className="flex w-full" align="center">
          <Toggle
            size={'lg'}
            color="violet"
            checkedChildren={<PlayOutlineIcon />}
            unCheckedChildren={<EditIcon />}
            defaultChecked
            onChange={(checked) => setActive(checked ? "player" : "editor")}
          />
          <div className={"lg:w-8/10 sm:w-full min-h-10" + FRAMESTYLE}>
            {active=="player" 
            ? <TabuhPlayer tabuhDict={tabuhDict} loadingTabuhDict={loadingTabuhDict}/> 
            : <TabuhEditor/>}
        </div>
          </VStack>
        </div>
  )
}
