export const AVERAGE_ATTACK_DELAY = 0.01 // (seconds) Average deviation of the note attack time for a more 'natural' effect

// TAILWIND STYLES
export const FRAMESTYLE = " rounded-xl shadow-lg shadow-gray-400 border border-gray-300 "

// INTERFACE CONFIG
// List of playback speeds for selector
export const speedList = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

export const introTime: number = 2000 // silence added before the beginning of the score in milliseconds
export const outroTime: number = 10000 // attenuation time added after the end of the score in milliseconds

type Color = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'violet';

export const theme: Record<string, Color> = {
    main: "blue",
    animation: "green",
    player: "orange",
}

export const tsStyleSheet = (() => {
    for (const sheet of document.styleSheets) {
        if (sheet.title === 'reactsuite-theme.less') {
            return sheet;
        }
    }
})

