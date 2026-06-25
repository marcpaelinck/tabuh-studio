import { useEffect, useState } from 'react'
import { apiGetEnvironment } from '../services/apiService'

type SizeGroup = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface ScreenSize {
    width: number
    height: number
    abbr: SizeGroup[]
}

const sizeLimits: [SizeGroup, number][] = [
    ['sm', 640],
    ['md', 768],
    ['lg', 1024],
    ['xl', 1280],
    ['2xl', 1536]
]

function currentScreenSize(): ScreenSize {
    const size: ScreenSize = { width: window.innerWidth, height: window.innerHeight, abbr: [] }

    for (const [abbr, limit] of sizeLimits) {
        if (size.width >= limit) size.abbr.push(abbr)
    }
    return size
}

export function useEnvironmentManager(): { environment: string; screenSize: ScreenSize; logoURL: string } {
    const [environment, setEnvironment] = useState<string>('')
    const [logoURL, setLogoURL] = useState<string>('')
    const [screenSize, setScreenSize] = useState<ScreenSize>(currentScreenSize())

    // Use the backend API to retrieve the environment ('production', 'develop' or 'local').
    useEffect(() => {
        const getEnvironmentSettings = async () => {
            const env = await apiGetEnvironment()
            setEnvironment(env?.environment || 'development')
            const logo = !env?.environment
                ? 'icons/tabuh-studio_icon_local.svg'
                : env.environment == 'production'
                  ? 'icons/tabuh-studio_icon_production.svg'
                  : env.environment == 'development'
                    ? 'icons/tabuh-studio_icon_development.svg'
                    : 'icons/tabuh-studio_icon_local.svg'
            setLogoURL(logo)
        }
        getEnvironmentSettings()
    }, [])

    // Add an event listener for window resizing
    useEffect(() => {
        const handleResize = () => {
            setScreenSize(currentScreenSize())
        }
        window.addEventListener('resize', handleResize)

        // Clean up the event listener when the component unmounts
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return { environment, screenSize, logoURL }
}
