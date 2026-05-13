import { createContext, useState, type Dispatch } from 'react'
import { CustomProvider, VStack } from 'rsuite'
import 'rsuite/dist/rsuite.css'
import { useWordpressApi } from './componentlogic/useWordpressApi'
import DebugWindow from './components/DebugWindow'
import { MainWindow } from './components/MainWindow'
import { defaultWpApiFunc, WpApiFunctions, type WordPressApiType } from './components/contexts'
import { FRAMESTYLE } from './config/config'

export const DebugContext = createContext<Dispatch<string>>(() => {})

export default function App() {
    // Set to false to remove debug window
    const debugMode: boolean = false

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
                        {debugMode && <DebugWindow message={debugMessage} />}
                        <WpApiFunctions value={wpFunctions}>
                            <div className={'lg:w-8/10 sm:w-full min-h-10' + FRAMESTYLE}>
                                <MainWindow dataSource={dataSource} />
                            </div>
                            <div id="phpdebug"></div>
                        </WpApiFunctions>
                    </VStack>
                </DebugContext>
            </div>
        </CustomProvider>
    )
}
