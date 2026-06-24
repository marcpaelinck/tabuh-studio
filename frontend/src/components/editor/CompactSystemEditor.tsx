/**
 * CompactSystemEditor — the editable COMPACT view for one system.
 *
 * Renders one row per notation group: a label chip (with the full position list as a
 * tooltip) followed by the group's notation drawn as a single continuous line over
 * the SAME background grid as the expanded notation — gridlines every column and the
 * kempli beats in a distinct colour.
 *
 * The controller ({@link useCompactSystemEditor}) keeps the notation as measures so
 * the expansion pipeline still gets per-beat structure; here we flatten the measures
 * for display and map the cursor / clicks between the flat column index and the
 * `{ measure, index }` form.
 */

import type { CSSProperties } from 'react'
import type { KeyMap } from '../../componentlogic/editor/keyMap'
import { useCompactSystemEditor, type CompactLine } from '../../componentlogic/editor/useCompactSystemEditor'
import { editorFontSize } from '../../config/config'
import { compactGroupLabel } from '../../utils/compactGroupLabel'
import { createGridStyle, gridColorsAggregated } from '../../utils/editor'
import { StaffLine } from './StaffLine'

export interface CompactSystemEditorProps {
    initialLines: CompactLine[]
    /** Per-kempli-beat column widths (used to draw the kempli beat lines of the grid). */
    beatColWidths: number[]
    /** Uniform kempli frequency, if any — used for the repeating kempli grid line. */
    kempliFrequency?: number
    onChange?: (lines: CompactLine[]) => void
    keyMap?: KeyMap
    className?: string
    style?: CSSProperties
}

// Maps a flat column index to a { measure, index } position within a line.
function locate(measures: { length: number }[], flatIndex: number): { measure: number; index: number } {
    let offset = 0
    for (let m = 0; m < measures.length; m++) {
        const len = measures[m].length
        if (flatIndex <= offset + len) return { measure: m, index: flatIndex - offset }
        offset += len
    }
    const last = Math.max(0, measures.length - 1)
    return { measure: last, index: measures[last]?.length ?? 0 }
}

export function CompactSystemEditor({
    initialLines,
    beatColWidths,
    kempliFrequency,
    onChange,
    keyMap,
    className,
    style
}: CompactSystemEditorProps) {
    const { lines, cursor, focused, onKeyDown, onPaste, onFocus, onBlur, setCursor } = useCompactSystemEditor({
        initialLines,
        keyMap,
        onChange
    })

    const fontClass = `balifontspaced${editorFontSize}`

    const gridStyle = createGridStyle({
        beatColWidths,
        kempliFrequency: kempliFrequency || null,
        cursor: null,
        cursorStyle: 'None',
        gridColors: gridColorsAggregated
    })
    const sumBeats = beatColWidths.reduce((a, b) => a + b, 0)
    // Width (in columns) shared by every row so the grids line up.
    const maxCols = Math.max(sumBeats, ...lines.map((l) => l.measures.reduce((a, m) => a + m.length, 0)), 1)

    return (
        <div
            tabIndex={0}
            role="textbox"
            aria-multiline="true"
            aria-label="compact notation editor"
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={onFocus}
            onBlur={onBlur}
            className={className}
            style={{ outline: 'none', cursor: 'text', ...style }}>
            {lines.map((line, li) => {
                const { label, tooltip } = compactGroupLabel(line.positions)
                const flatSymbols = line.measures.flat()
                const offsetToActiveMeasure = line.measures.slice(0, cursor.measure).reduce((a, m) => a + m.length, 0)
                const flatCursor = focused && cursor.line === li ? offsetToActiveMeasure + cursor.index : null
                return (
                    <div key={line.id} className="flex items-center">
                        <div
                            title={tooltip}
                            className="shrink-0 w-36 pr-2 truncate text-gray-600"
                            style={{ fontFamily: 'system-ui, sans-serif', fontSize: '11px' }}>
                            {label}
                        </div>
                        <div className={`relative ${fontClass}`} style={{ width: `${maxCols}ch`, whiteSpace: 'pre' }}>
                            <div aria-hidden="true" className="absolute inset-0" style={gridStyle} />
                            <div className="relative">
                                <StaffLine
                                    symbols={flatSymbols}
                                    cursorIndex={flatCursor}
                                    onSymbolClick={(index) => {
                                        const { measure, index: idx } = locate(line.measures, index)
                                        setCursor(li, measure, idx)
                                    }}
                                    onTrailingClick={() => {
                                        const lastMeasure = Math.max(0, line.measures.length - 1)
                                        setCursor(li, lastMeasure, line.measures[lastMeasure]?.length ?? 0)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
