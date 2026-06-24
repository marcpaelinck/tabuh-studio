import { useEffect, useState } from 'react'
import Favicon from 'react-favicon'
import { CustomProvider, VStack } from 'rsuite'
import 'rsuite/dist/rsuite.css'
import { MainWindow } from './components/MainWindow'
import { FRAMESTYLE } from './config/config'
import { AuthProvider } from './context/AuthContext'
import { apiGetEnvironment } from './services/apiService'

export default function App() {
    // Set the logo and favicon color depending on the environment
    const [logoURL, setLogoURL] = useState<string>('')
    useEffect(() => {
        const getEnvLogo = async () => {
            const env = await apiGetEnvironment()
            const logo = !env?.environment
                ? 'icons/tabuh-studio_icon_local.svg'
                : env.environment == 'production'
                  ? 'icons/tabuh-studio_icon_production.svg'
                  : env.environment == 'development'
                    ? 'icons/tabuh-studio_icon_development.svg'
                    : 'icons/tabuh-studio_icon_local.svg'
            setLogoURL(logo)
        }
        getEnvLogo()
    }, [])
    const dataSource = 'database'

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
