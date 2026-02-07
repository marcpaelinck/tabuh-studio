import EditIcon from '@rsuite/icons/Edit'
import PlayOutlineIcon from '@rsuite/icons/PlayOutline'
import { createContext, useState, type Dispatch } from 'react'
import { CustomProvider, Toggle, VStack } from 'rsuite'
import 'rsuite/dist/rsuite.css'
import DebugWindow from './components/DebugWindow'
import { defaultWpApiFunc, WpApiFunctions, type WordPressApiType } from './components/tabuheditor/contexts'
import { TabuhEditor } from './components/tabuheditor/TabuhEditor'
import { FRAMESTYLE } from './config/config'
import { useWordpressApi } from './hooksandmanagers/useWordpressApi'

export const DebugContext = createContext<Dispatch<string>>(() => {})

export default function App() {
    // Set to false to remove debug window
    const debugMode: boolean = false

    const [active, setActive] = useState<'editor' | 'player'>('player')
    const [debugMessage, setDebugMessage] = useState<string | null>(null)

    // Use 'dummy' WordPress functions and files in development mode.
    const wpFunctions: WordPressApiType = import.meta.env.MODE == 'production' ? useWordpressApi() : defaultWpApiFunc
    const dataSource = import.meta.env.MODE == 'production' ? 'database' : 'file'

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
                                {/* {active == 'player' ? (
                                    <TabuhPlayer dataSource={dataSource} />
                                ) : ( */}
                                <TabuhEditor dataSource={dataSource} active={active} />
                                {/* )} */}
                            </div>
                            <div id="phpdebug"></div>
                        </WpApiFunctions>
                    </VStack>
                </DebugContext>
            </div>
        </CustomProvider>
    )
}
