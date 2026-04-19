// Keeps track of the screen size. Can be used for responsive design.
import { useEffect, useState } from 'react'

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

export function useScreenSize() {
    const [screenSize, setScreenSize] = useState<ScreenSize>(currentScreenSize())

    useEffect(() => {
        const handleResize = () => {
            const currentScreensize = currentScreenSize()
            setScreenSize(currentScreenSize())
        }
        window.addEventListener('resize', handleResize)

        // Clean up the event listener when the component unmounts
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return screenSize
}
