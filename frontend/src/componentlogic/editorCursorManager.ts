import _ from 'lodash'
import { useRef, useState } from 'react'
import { defaultBeatFrequency } from '../config/config'
import type { EditorCellCursor, EditorCursorParameters } from '../typing/playback'
import type { System } from '../typing/score'
import { debug } from '../utils/debugger'

const gridColors = {
    cursor: 'rgba(255, 255, 0, 0.5)',
    kempli: 'rgba(0, 255, 0, 0.8)',
    grid: 'rgba(0, 0, 0, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)'
}

export function useEditorCursorManager(systemData: System | undefined) {
    const [playbackCursor, setPlaybackCursor] = useState<EditorCellCursor | null>(null)
    const notationAreaRef = useRef<HTMLTextAreaElement>(null)

    function moveEditorCursor(cursor: EditorCursorParameters) {
        debug(`moveEditorCursor(${JSON.stringify(cursor)}), currsysuuid=${systemData ? systemData.uuid : 'none'}`)
        if (!systemData || cursor.sysuuid != systemData.uuid) {
            setPlaybackCursor(null)
            return
        }
        debug(`setting playback cursor to ${JSON.stringify({ sysUuid: cursor.sysuuid, measure: cursor.beat })}`)
        setPlaybackCursor({ sysUuid: cursor.sysuuid, measure: cursor.beat })
        notationAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start' })
    }

    // Sets the background grid and cursor highlighting
    function setGrid(systemData: System, cursor: EditorCellCursor | null) {
        // Generates a gradient function for the kempli lines
        function kempliGrid(systemData: System): string {
            switch (systemData.kempli.state) {
                case 'on': {
                    return `repeating-linear-gradient(
                        to right, 
                        ${gridColors.kempli} 0px 2px, 
                        transparent 2px ${systemData.kempli.frequency || defaultBeatFrequency}ch
                        ),`
                }
                case 'notation': {
                    // Get the kempli notation for the entire system
                    const notation: string[] = systemData.staffs['KEMPLI']?.notation || []
                    // Determine the positions of the kempli characters
                    const indices = notation.reduce(
                        (aggr: number[], note, idx) => (note == 'x?' ? aggr.concat([idx]) : aggr),
                        []
                    )
                    if (indices.length == 0) return ''
                    // Generate the gradient functions
                    const gradients = indices
                        .map((index, idx, arr) => {
                            const transpEnd = idx < arr.length - 1 ? `calc(${arr[idx + 1]}ch)` : '100%'
                            const css =
                                `${gridColors.kempli} ${index}ch calc(${index}ch + 2px),
                                transparent calc(${index}ch + 2px) ` + transpEnd
                            return css
                        })
                        .join(', ')
                    return `linear-gradient(to right, ` + gradients + '),'
                }
                case 'off':
                default:
                    return ''
            }
        }

        function cursorHighlight(cursor: EditorCellCursor | null): string {
            if (!cursor || !systemData.kempli.frequency) return ''
            const freq = systemData.kempli.frequency
            const cursorOffset = cursor.measure * freq
            const highlight = `linear-gradient(
                to right,
                transparent 0 calc(${cursorOffset}ch - 2px),
                ${gridColors.cursor} calc(${cursorOffset}ch - 2px) calc(${cursorOffset + freq}ch - 2px),
                transparent calc(${cursorOffset + freq}ch) 100%),`
            return highlight
        }

        if (!notationAreaRef.current) return
        const firstStaff = Object.values(systemData.staffs)[0]
        const totalWidth = firstStaff?.notation.length ?? 0

        const highlight = cursorHighlight(cursor)
        const kempliLines = kempliGrid(systemData)
        // Hides the superfluous gridlines which are generated with a recurring pattern
        const gridlineHider = `linear-gradient(to right, transparent 0 calc(${totalWidth}ch - 1px), ${gridColors.background} ${totalWidth}ch 100%),`
        const gridlines = `repeating-linear-gradient(
            to right, 
            ${gridColors.grid} 0px 1px, 
            transparent 1px 1ch
        )`
        notationAreaRef.current.style.setProperty('background', highlight + gridlineHider + kempliLines + gridlines)
        /* Centers lines on characters */
        notationAreaRef.current.style.setProperty(
            'background-position',
            `
            left,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0,
            calc(0.5ch - 2px) 0
`
        )
        notationAreaRef.current.style.setProperty('background-repeat', 'repeat-x')
    }
    return { notationAreaRef, playbackCursor, setPlaybackCursor, setGrid, moveEditorCursor }
}
