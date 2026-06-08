import { CustomProvider, VStack } from 'rsuite'
import 'rsuite/dist/rsuite.css'
import { MainWindow } from './components/MainWindow'
import { FRAMESTYLE } from './config/config'
import { AuthProvider } from './context/AuthContext'

export default function App() {
    // Use 'dummy' WordPress functions and files in development mode.
    // const dataSource = import.meta.env.MODE == 'production' ? 'database' : 'file'
    const dataSource = 'database'

    return (
        <CustomProvider>
            <AuthProvider>
                <div className="flex w-full min-h-0 ">
                    <VStack id="vstack" className="flex w-full" align="center">
                        <div className={'w-full lg:w-8/10 min-h-10' + FRAMESTYLE}>
                            <MainWindow dataSource={dataSource} />
                        </div>
                        <div id="phpdebug"></div>
                    </VStack>
                </div>
            </AuthProvider>
        </CustomProvider>
    )
}
