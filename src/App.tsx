import EditIcon from '@rsuite/icons/Edit'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import { createContext, useState, type Dispatch } from 'react'
import { CustomProvider, Toggle, VStack } from 'rsuite'
import 'rsuite/dist/rsuite.css'
import DebugWindow from './components/DebugWindow'
import { WpApiFunctions, type WordPressApiType } from './components/tabuheditor/contexts'
import { TabuhEditor } from './components/tabuheditor/TabuhEditor'
import TabuhPlayer from './components/tabuhplayer/TabuhPlayer'
import { FRAMESTYLE } from './config/config'
import { useScoreList } from './hooksandmanagers/useScoreList'
import { useWordpressApi } from './hooksandmanagers/useWordpressApi'

export const DebugContext = createContext<Dispatch<string>>(() => {})

export default function App() {
    // Set to false to remove debug window
    const debugMode: boolean = false

    const [active, setActive] = useState<'editor' | 'player'>('player')
    const { scoreList, loading: loadingScoreList } = useScoreList([])
    const [debugMessage, setDebugMessage] = useState<string | null>(null)
    const wpFunctions: WordPressApiType = useWordpressApi()

    function debug(message: string) {
        setDebugMessage(message)
    }

    return (
        <CustomProvider>
            <div className="flex w-full min-h-0 ">
                <DebugContext value={debug}>
                    <VStack id="vstack" className="flex w-full" align="center">
                        <Toggle
                            size={'lg'}
                            color="violet"
                            checkedChildren={<PlayOutlineIcon />}
                            unCheckedChildren={<EditIcon />}
                            defaultChecked
                            onChange={(checked) => setActive(checked ? 'player' : 'editor')}
                        />
                        {debugMode && <DebugWindow message={debugMessage} />}
                        <WpApiFunctions value={wpFunctions}>
                            <div className={'lg:w-8/10 sm:w-full min-h-10' + FRAMESTYLE}>
                                {active == 'player' ? (
                                    <TabuhPlayer scoreList={scoreList} loadingScoreList={loadingScoreList} />
                                ) : (
                                    <TabuhEditor scoreList={scoreList} loadingScoreList={loadingScoreList} />
                                )}
                            </div>
                        </WpApiFunctions>
                    </VStack>
                </DebugContext>
            </div>
        </CustomProvider>
    )
}
