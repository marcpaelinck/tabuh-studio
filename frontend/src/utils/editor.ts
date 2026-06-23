import _ from 'lodash'
import type { PlaybackCursorStyle } from '../typing/animation'
import type { EditorCursor } from '../typing/playback'

interface GridColors {
    cursor: string
    kempli: string
    grid: string
    background: string
}
export const gridColorsAggregated = {
    cursor: 'rgba(255, 255, 0, 0.5)',
    kempli: 'rgba(238, 0, 255, 0.52)',
    grid: 'rgba(0, 0, 0, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)'
}

export const gridColorsExpanded = {
    cursor: 'rgba(255, 255, 0, 0.5)',
    kempli: 'rgba(0, 255, 0, 0.8)',
    grid: 'rgba(0, 0, 0, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)'
}

// Returns a style object that displays a grid behind the System's notation area.
// This function is used both for the compact and the expanded notation.
// The grid consists of:
// - vertical colored lines at kempli beat positions;
// - vertical gray lines at non-beat positions;
// - a highlighted area called (editor) cursor that moves in sync with the audio playback.
interface CreateGridStyleAttributes {
    beatColWidths: number[]
    kempliFrequency: number | null
    cursor: EditorCursor | null
    cursorStyle: PlaybackCursorStyle
    gridColors: GridColors
}
export function createGridStyle({
    beatColWidths,
    kempliFrequency,
    cursor,
    cursorStyle,
    gridColors
}: CreateGridStyleAttributes): Record<string, string> {
    // Generates a gradient function for the kempli lines
    function kempliGrid(): string {
        if (!kempliFrequency) {
            return ''
        }
        if (kempliFrequency > 0) {
            return `repeating-linear-gradient(
                        to right,
                        ${gridColors.kempli} 0px 2px,
                        transparent 2px ${kempliFrequency}ch
                        ),`
        } else if (beatColWidths && beatColWidths.length > 0) {
            // Get the kempli notation for the entire system
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
                        `${gridColors.kempli} ${index}ch calc(${index}ch + 2px),
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
        background: highlight + gridlineHider + kempliLines + gridlines,
        'background-position': `
            left,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0
`,
        'background-repeat': 'repeat-x'
    }
}
