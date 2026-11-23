import _ from 'lodash'
import { defaultBeatFrequency } from '../config/config'
import type { PlaybackCursorStyle } from '../typing/animation'
import type { EditorCursor } from '../typing/playback'
import type { KempliSetting } from '../typing/score'

interface GridColors {
    cursor: string
    kempli: string
    /** Beat-line color when the system's kempli is 'off' (gray — the beat is not sounded). */
    kempliOff: string
    grid: string
    background: string
}
export const gridColorsCompact = {
    cursor: 'rgba(255, 255, 0, 0.5)',
    kempli: 'rgba(238, 0, 255, 0.52)',
    kempliOff: 'rgba(0, 0, 0, 0.2)',
    grid: 'rgba(0, 0, 0, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)'
}

export const gridColorsExpanded = {
    cursor: 'rgba(255, 255, 0, 0.5)',
    kempli: 'rgba(0, 255, 0, 0.8)',
    kempliOff: 'rgba(0, 0, 0, 0.2)',
    grid: 'rgba(0, 0, 0, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)'
}

// Returns a style object that displays a grid behind the System's notation area.
// This function is used both for the compact and the expanded notation.
// The grid consists of:
// - vertical colored lines at kempli beat positions (gray when kempli.state === 'off');
// - vertical gray lines at non-beat positions;
// - a highlighted area called (editor) cursor that moves in sync with the audio playback.
interface CreateGridStyleAttributes {
    beatColWidths: number[]
    kempli: KempliSetting
    cursor: EditorCursor | null
    cursorStyle: PlaybackCursorStyle
    gridColors: GridColors
}
export function createGridStyle({
    beatColWidths,
    kempli,
    cursor,
    cursorStyle,
    gridColors
}: CreateGridStyleAttributes): Record<string, string> {
    // Generates a gradient function for the kempli lines
    function kempliGrid(): string {
        const isOff = kempli.state === 'off'
        // Off: beat lines are drawn gray (the beat is not sounded); on/notation use the palette color.
        const kempliColor = isOff ? gridColors.kempliOff : gridColors.kempli
        // Off: still show (gray) beat lines at the current frequency, defaulting to 4 when unavailable.
        // On/notation: a positive frequency gives regular lines; a negative value is irregular (notation).
        const frequency = isOff
            ? kempli.frequency && kempli.frequency > 0
                ? kempli.frequency
                : defaultBeatFrequency
            : kempli.frequency || null

        if (!frequency) {
            return ''
        }
        if (frequency > 0) {
            return `repeating-linear-gradient(
                        to right,
                        ${kempliColor} 0px 2px,
                        transparent 2px ${frequency}ch
                        ),`
        } else if (beatColWidths && beatColWidths.length > 0) {
            // Irregular kempli beats (from notation)
            const indices = [0]
            for (const width of beatColWidths) {
                indices.push(indices[indices.length - 1] + width)
            }
            // Generate the gradient functions
            // Fill transparent color until the first
            var gradients = indices[0] != 0 ? `transparent 0 calc(${indices[0]}ch), ` : ''
            gradients += indices
                .map((index, idx, arr) => {
                    const transpEnd = idx < arr.length - 1 ? `calc(${arr[idx + 1]}ch)` : '100%'
                    const css =
                        `${kempliColor} ${index}ch calc(${index}ch + 2px),
                                transparent calc(${index}ch + 2px) ` + transpEnd
                    return css
                })
                .join(', ')
            return `linear-gradient(to right, ` + gradients + '),'
        } else {
            return ''
        }
    }

    function cursorHighlight(cursor: EditorCursor | null): string {
        if (!cursor || cursorStyle == 'None') return ''
        var start = cursor.beatSlice.start
        var end = cursor.beatSlice.end
        // If user cursor setting is system, highlight the entire system.
        // Do nothing if end==0: this is the 'cursor off' message.
        if (cursorStyle == 'System' && end != 0) {
            start = 0
            end = cursor.lastColumn
        }

        const highlight = `linear-gradient(
                to right,
                transparent 0 calc(${start}ch - 2px),
                ${gridColors.cursor} calc(${start}ch - 2px) calc(${end}ch - 2px),
                transparent calc(${end}ch) 100%),`
        return highlight
    }

    const totalWidth = _.sum(beatColWidths)

    const highlight = cursorHighlight(cursor)
    const kempliLines = kempliGrid()
    // Hides the superfluous gridlines which are generated with a recurring pattern
    const gridlineHider = `linear-gradient(to right, transparent 0 calc(${totalWidth}ch - 1px), ${gridColors.background} ${totalWidth}ch 100%),`
    const gridlines = `repeating-linear-gradient(
            to right,
            ${gridColors.grid} 0px 1px,
            transparent 1px 1ch
        )`
    return {
        backgroundImage: highlight + gridlineHider + kempliLines + gridlines,
        backgroundPosition: `
            left,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0
`,
        backgroundRepeat: 'repeat-x'
    }
}
