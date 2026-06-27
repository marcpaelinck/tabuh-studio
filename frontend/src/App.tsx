import Favicon from 'react-favicon'
import { CustomProvider, VStack } from 'rsuite'
import 'rsuite/dist/rsuite.css'
import { MainWindow } from './components/MainWindow'
import { FRAMESTYLE } from './config/config'
import { AuthProvider } from './context/AuthContext'
import { useEnvironmentManager } from './stores/useEnvironmentManager'

export default function App() {
    const dataSource = 'database'
    // The logo and favicon colors depend on the backend's environment (production, development, local)
    const { environment, logoURL } = useEnvironmentManager()
    console.log(environment)

    return (
        <CustomProvider>
            <Favicon url={logoURL} />
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
