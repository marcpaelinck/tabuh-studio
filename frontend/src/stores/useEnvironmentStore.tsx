import { create } from 'zustand'
import { apiGetEnvironment } from '../services/apiService'
import { debounce } from '../utils/async'

type SizeGroup = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const sizeLimits: [SizeGroup, number][] = [
    ['sm', 640],
    ['md', 768],
    ['lg', 1024],
    ['xl', 1280],
    ['2xl', 1536]
]

export interface ScreenSize {
    width: number
    height: number
    abbr: SizeGroup[]
}

function currentScreenSize(): ScreenSize {
    const size: ScreenSize = { width: window.innerWidth, height: window.innerHeight, abbr: [] }

    for (const [abbr, limit] of sizeLimits) {
        if (size.width >= limit) size.abbr.push(abbr)
    }
    return size
}

function currentLogo(env: string | null): string {
    return !env
        ? 'icons/tabuh-studio_icon_local.svg'
        : env == 'production'
          ? 'icons/tabuh-studio_icon_production.svg'
          : env == 'development'
            ? 'icons/tabuh-studio_icon_development.svg'
            : 'icons/tabuh-studio_icon_local.svg'
}

export interface EnvironmentManagerStore {
    environment?: string
    screenSize?: ScreenSize
    logoURL?: string
    error?: string
}

// 1. Define the store structure
export const useEnvironmentStore = create(
    (): EnvironmentManagerStore => ({ environment: '', screenSize: undefined, logoURL: ' ' })
)

// 2. Immediately execute the fetch function once outside the React lifecycle
const initializeApp = async () => {
    try {
        const env = await apiGetEnvironment() // Your middleware endpoint
        if (!env) throw new Error('Could not retrieve backend environment.')
        useEnvironmentStore.setState({ environment: env.environment })
        useEnvironmentStore.setState({ logoURL: currentLogo(env.environment) })
    } catch (err) {
        useEnvironmentStore.setState({ error: (err as Error).message })
    }
    useEnvironmentStore.setState({ screenSize: currentScreenSize() })

    // Subscribe to window resize event
    if (typeof window !== 'undefined') {
        const debouncedResize = debounce(() => {
            useEnvironmentStore.setState({ screenSize: currentScreenSize() })
        }, 150)
        window.addEventListener('resize', debouncedResize)
    }
}

// Run it once immediately when the app boots up
initializeApp()
