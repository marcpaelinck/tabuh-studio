import { createContext, useState, type Dispatch } from 'react'
import { CustomProvider, VStack } from 'rsuite'
import 'rsuite/dist/rsuite.css'
import DebugWindow from './components/DebugWindow'
import { MainWindow } from './components/MainWindow'
import { FRAMESTYLE } from './config/config'
import { AuthProvider } from './context/AuthContext'

export const DebugContext = createContext<Dispatch<string>>(() => {})

export default function App() {
    // Set to false to remove debug window
    const debugMode: boolean = false

    const [debugMessage, setDebugMessage] = useState<string | null>(null)

    // Use 'dummy' WordPress functions and files in development mode.
    // const dataSource = import.meta.env.MODE == 'production' ? 'database' : 'file'
    const dataSource = 'database'

    function debug(message: string) {
        setDebugMessage(message)
    }

    return (
        <CustomProvider>
            <AuthProvider>
                <div className="flex w-full min-h-0 ">
                    <DebugContext value={debug}>
                        <VStack id="vstack" className="flex w-full" align="center">
                            {debugMode && <DebugWindow message={debugMessage} />}
                            <div className={'lg:w-8/10 sm:w-full min-h-10' + FRAMESTYLE}>
                                <MainWindow dataSource={dataSource} />
                            </div>
                            <div id="phpdebug"></div>
                        </VStack>
                    </DebugContext>
                </div>
            </AuthProvider>
        </CustomProvider>
    )
}
