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
 *
 * Clicking a line's label chip opens a popover for group-membership editing (Step 4):
 * add/remove positions (constrained to valid, unused positions) and add/remove staves.
 */

import { positionConfigs } from '@tabuhstudio/shared/config/position'
import type { Position } from '@tabuhstudio/shared/types/basetypes'
import { useEffect, useState, type CSSProperties } from 'react'
import { Button, Popover, Tag, Tooltip, Whisper } from 'rsuite'
import { candidatesFor, type CastingInstruction } from '../../componentlogic/castingRulesManager'
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
    /** Universe of positions the system may contain (KEMPLI only when kempli.state === 'notation'). */
    availablePositions: Position[]
    /** System-wide casting context, used when a position is split out of a group. */
    castingInstructions?: CastingInstruction[]
    onChange?: (lines: CompactLine[]) => void
    keyMap?: KeyMap
    className?: string
    style?: CSSProperties
}

const positionName = (p: Position) => positionConfigs[p]?.name ?? p

export function CompactSystemEditor({
    initialLines,
    beatColWidths,
    kempliFrequency,
    availablePositions,
    castingInstructions,
    onChange,
    keyMap,
    className,
    style
}: CompactSystemEditorProps) {
    const {
        lines,
        cursor,
        focused,
        onKeyDown,
        onPaste,
        onFocus,
        onBlur,
        setCursor,
        addLine,
        removeLine,
        addPosition,
        removePosition
    } = useCompactSystemEditor({ initialLines, keyMap, castingInstructions, onChange })
    const [gridStyle, setGridStyle] = useState<Record<string, string>>({})
    const [maxCols, setMaxCols] = useState<number>(0)
    // Positions chosen for a NEW staff, before it is created (add above/below).
    const [newPositions, setNewPositions] = useState<Position[]>([])

    const fontClass = `balifontspaced${editorFontSize}`

    // Redraw background gridlines
    useEffect(() => {
        const style = createGridStyle({
            beatColWidths,
            kempliFrequency: kempliFrequency || null,
            cursor: null,
            cursorStyle: 'None',
            gridColors: gridColorsAggregated
        })
        setGridStyle(style)
        const sumBeats = beatColWidths.reduce((a, b) => a + b, 0)
        // Width (in columns) shared by every row so the grids line up.
        const maxCols = Math.max(sumBeats, ...lines.map((l) => l.notation.length), 1)
        setMaxCols(maxCols)
    }, [beatColWidths])

    // Positions in use across the whole system, and the still-free ones (the seed pool
    // for new staves / added positions). Recomputed from the live lines so it tracks edits.
    const used = new Set(lines.flatMap((l) => l.positions))
    const free = availablePositions.filter((p) => !used.has(p))

    const toggleNewPosition = (p: Position) =>
        setNewPositions((sel) => (sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]))

    // Popover for one line: edit its positions and add/remove staves.
    const linePopover = (li: number, line: CompactLine) => {
        const candidates = candidatesFor(line.positions, free)
        // For a NEW staff: positions still selectable given the current selection.
        const newCandidates = candidatesFor(newPositions, free)
        const createNewStaff = (atIndex: number) => {
            addLine(atIndex, newPositions)
            setNewPositions([])
        }
        return (
            <Popover>
                <div className="text-xs font-semibold mb-1">Staff positions</div>
                <div className="flex flex-wrap gap-1 mb-2 max-w-64">
                    {line.positions.map((p) => (
                        <Tag key={p} closable={line.positions.length > 1} onClose={() => removePosition(li, p)}>
                            {positionName(p)}
                        </Tag>
                    ))}
                </div>
                {candidates.length > 0 && (
                    <>
                        <div className="text-xs mb-1">Add position</div>
                        <div className="flex flex-wrap gap-1 mb-2 max-w-64">
                            {candidates.map((p) => (
                                <Button key={p} size="xs" appearance="ghost" onClick={() => addPosition(li, p)}>
                                    {positionName(p)}
                                </Button>
                            ))}
                        </div>
                    </>
                )}
                <div className="border-t border-gray-200 pt-2">
                    <div className="text-xs mb-1">New staff — select position(s):</div>
                    <div className="flex flex-wrap gap-1 mb-2 max-w-64">
                        {newCandidates.map((p) => (
                            <Button
                                key={p}
                                size="xs"
                                appearance={newPositions.includes(p) ? 'primary' : 'ghost'}
                                onClick={() => toggleNewPosition(p)}>
                                {positionName(p)}
                            </Button>
                        ))}
                        {newCandidates.length === 0 && <span className="text-xs text-gray-400">no positions free</span>}
                    </div>
                    <div className="flex gap-1">
                        <Button size="xs" disabled={newPositions.length === 0} onClick={() => createNewStaff(li)}>
                            + above
                        </Button>
                        <Button size="xs" disabled={newPositions.length === 0} onClick={() => createNewStaff(li + 1)}>
                            + below
                        </Button>
                        <Button
                            size="xs"
                            color="red"
                            appearance="ghost"
                            disabled={lines.length <= 1}
                            onClick={() => removeLine(li)}>
                            Remove staff
                        </Button>
                    </div>
                </div>
            </Popover>
        )
    }

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
                const flatCursor = focused && cursor.line === li ? cursor.index : null
                return (
                    <div key={line.id} className="flex items-center">
                        <Whisper
                            trigger="click"
                            placement="bottomStart"
                            onClose={() => setNewPositions([])}
                            speaker={linePopover(li, line)}>
                            <div
                                className="shrink-0 w-36 pr-2 truncate text-gray-600 cursor-pointer hover:text-blue-600"
                                style={{ fontFamily: 'system-ui, sans-serif', fontSize: '11px' }}>
                                <Whisper trigger="hover" placement="bottomStart" speaker={<Tooltip>{tooltip}</Tooltip>}>
                                    {label}
                                </Whisper>
                            </div>
                        </Whisper>
                        <div className={`relative ${fontClass}`} style={{ width: `${maxCols}ch`, whiteSpace: 'pre' }}>
                            <div aria-hidden="true" className="absolute inset-0" style={gridStyle} />
                            <div className="relative">
                                <StaffLine
                                    symbols={line.notation}
                                    cursorIndex={flatCursor}
                                    onSymbolClick={(index) => setCursor(li, index)}
                                    onTrailingClick={() => setCursor(li, line.notation.length)}
                                />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
