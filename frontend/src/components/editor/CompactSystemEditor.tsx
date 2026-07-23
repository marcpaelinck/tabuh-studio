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
 * Clicking a line's label chip opens a menu (New… / Modify… / Delete). New and Modify
 * each open their own popup: New creates a staff before/after this one from selected
 * position(s); Modify edits this staff's positions (add/remove, constrained to valid,
 * unused positions). Delete removes the staff immediately.
 */

import type { Position } from '@tabuhstudio/shared'
import { positionConfigs } from '@tabuhstudio/shared/config/position'
import { useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Button, Modal, Popover, Radio, RadioGroup, Tag, Tooltip, Whisper } from 'rsuite'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import { candidatesFor, type CastingInstruction } from '../../componentlogic/castingRulesManager'
import type { KeyMap } from '../../componentlogic/editor/keyMap'
import { useCompactSystemEditor, type CompactLine } from '../../componentlogic/editor/useCompactSystemEditor'
import { editorFontSize } from '../../config/config'
import { getPositionGroups } from '../../config/position-functions'
import { useScoreStore } from '../../stores/useScoreStore'
import type { Staffs } from '../../typing/score'
import { compactGroupLabel } from '../../utils/compactGroupLabel'
import { StaffGrid, type StaffGridRow } from './StaffGrid'
import { StaffLine } from './StaffLine'

export interface CompactSystemEditorProps {
    ref: RefObject<HTMLDivElement | null>
    initialLines: CompactLine[]
    /** Width of the notation (in number of notes) */
    notationWidth: number
    /** Uniform kempli frequency, if any — used for the repeating kempli grid line. */
    kempliFrequency?: number
    /** Universe of positions the system may contain (KEMPLI only when kempli.state === 'notation'). */
    availablePositions: Position[]
    /** System-wide casting context, used when a position is split out of a group. */
    castingInstructions?: CastingInstruction[]
    /** Derived expanded staffs, used for the read-only per-line expansion snippet. */
    staffs: Staffs
    /** True while playback is running — the expansion snippet is hidden then. */
    playing?: boolean
    onChange?: (lines: CompactLine[]) => void
    keyMap?: KeyMap
    className?: string
    style?: CSSProperties
}

const positionName = (p: Position) => positionConfigs[p]?.name ?? p

export function CompactSystemEditor({
    ref,
    initialLines,
    notationWidth,
    kempliFrequency,
    availablePositions,
    castingInstructions,
    staffs,
    playing,
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
    // const [gridStyle, setGridStyle] = useState<Record<string, string>>({})
    // const [maxCols, setMaxCols] = useState<number>(0)
    // Positions chosen for a NEW staff, before it is created (add above/below).
    const orchestra = useScoreStore((state) => state.orchestra)
    const orchestraPositions = useScoreStore((state) => state.orchestraPositions)
    const [newPositions, setNewPositions] = useState<Position[]>([])
    // Open staff dialog: the New / Modify popup for the label menu of line `li`.
    const [staffDialog, setStaffDialog] = useState<{ kind: 'new' | 'modify'; li: number } | null>(null)
    const [newPlacement, setNewPlacement] = useState<'before' | 'after'>('after')
    // Per-line handle to the label-menu overlay, so a menu item can close its own menu.
    const menuRefs = useRef<Record<number, OverlayTriggerHandle | null>>({})

    const fontClass = `balifontspaced${editorFontSize}`

    // Update the number of columns in the notation area
    // useEffect(() => {
    //     const sumBeats = beatColWidths.reduce((a, b) => a + b, 0)
    //     // Width (in columns) shared by every row so the grids line up.
    //     const maxCols = Math.max(sumBeats, ...lines.map((l) => l.notation.length), 1)
    //     setMaxCols(maxCols)
    // }, [beatColWidths])

    // Positions in use across the whole system, and the still-free ones (the seed pool
    // for new staves / added positions). Recomputed from the live lines so it tracks edits.
    const used = new Set(lines.flatMap((l) => l.positions))
    const free = orchestraPositions.filter((p) => !used.has(p))

    const toggleNewPosition = (p: Position) =>
        setNewPositions((sel) => (sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]))

    const closeStaffDialog = () => {
        setStaffDialog(null)
        setNewPositions([])
        setNewPlacement('after')
    }

    // The label menu: New… / Modify… / Delete for one line. New/Modify open a popup
    // (see renderStaffDialog); Delete removes the staff immediately.
    //
    // Rendered as a Whisper + Popover (not a Dropdown) so the menu is PORTALED to <body>:
    // an inline dropdown is trapped inside this system's `relative z-10` StaffGrid context
    // and would be painted over by the next system's labels; a portaled popover sits in the
    // root stacking context (z-index 1060), above every system.
    const menuItemClass =
        'text-left px-3 py-1.5 text-sm w-full hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent'
    const lineMenu = (li: number, label: string, tooltip: string) => {
        const closeMenu = () => menuRefs.current[li]?.close()
        const menuPopover = (
            <Popover className="p-0">
                <div className="flex flex-col min-w-40 py-1">
                    <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => {
                            closeMenu()
                            setStaffDialog({ kind: 'new', li })
                        }}>
                        Add…
                    </button>
                    <button
                        type="button"
                        className={menuItemClass}
                        onClick={() => {
                            closeMenu()
                            setStaffDialog({ kind: 'modify', li })
                        }}>
                        Modify…
                    </button>
                    <button
                        type="button"
                        disabled={lines.length <= 1}
                        className={menuItemClass}
                        onClick={() => {
                            closeMenu()
                            removeLine(li)
                        }}>
                        <span className={lines.length <= 1 ? '' : 'text-red-600'}>Delete {label}</span>
                    </button>
                </div>
            </Popover>
        )
        return (
            <Whisper
                ref={(handle) => {
                    menuRefs.current[li] = handle
                }}
                trigger="click"
                placement="bottomStart"
                speaker={menuPopover}>
                {/* preventDefault on mousedown stops the click from focusing the StaffGrid
                    container (tabIndex=0), which would otherwise move the cursor / shift layout. */}
                <div
                    className="shrink-0 w-36 pr-2 truncate text-gray-600 cursor-pointer hover:text-blue-600"
                    onMouseDown={(e) => e.preventDefault()}>
                    <Whisper trigger="hover" placement="bottomStart" speaker={<Tooltip>{tooltip}</Tooltip>}>
                        <span>{label}</span>
                    </Whisper>
                </div>
            </Whisper>
        )
    }

    // The New / Modify popup for the currently open label menu. Also used to add the
    // FIRST staff of an empty system, in which case there is no reference line and the
    // before/after choice is omitted.
    const renderStaffDialog = () => {
        if (!staffDialog) return null
        const li = staffDialog.li
        const isNew = staffDialog.kind === 'new'
        const line = isNew ? undefined : lines[li]
        if (!isNew && !line) return null

        const newCandidates = candidatesFor(newPositions, free, orchestra)
        const addCandidates = line ? candidatesFor(line.positions, free, orchestra) : []

        return (
            // Nudge the dialog toward the left (near the position labels) instead of centre.
            <Modal size="xs" open onClose={closeStaffDialog} style={{ marginLeft: '6rem', marginRight: 'auto' }}>
                <Modal.Header>
                    <Modal.Title>{isNew ? 'New staff' : 'Modify staff'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {isNew ? (
                        <div className="flex flex-col gap-3">
                            <div>
                                <div className="text-xs mb-1">Select position(s)</div>
                                <div className="flex flex-wrap gap-1 max-w-72">
                                    {newCandidates.map((p) => (
                                        <Button
                                            key={p}
                                            size="xs"
                                            appearance={newPositions.includes(p) ? 'primary' : 'ghost'}
                                            onClick={() => toggleNewPosition(p)}>
                                            {positionName(p)}
                                        </Button>
                                    ))}
                                    {newCandidates.length === 0 && (
                                        <span className="text-xs text-gray-400">no positions free</span>
                                    )}
                                </div>
                            </div>
                            {lines.length > 0 && (
                                <div>
                                    <div className="text-xs mb-1">Position</div>
                                    <RadioGroup
                                        inline
                                        value={newPlacement}
                                        onChange={(v) => setNewPlacement(v as 'before' | 'after')}>
                                        <Radio value="before">before</Radio>
                                        <Radio value="after">after</Radio>
                                    </RadioGroup>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div>
                                <div className="text-xs mb-1">Staff positions</div>
                                <div className="flex flex-wrap gap-1 max-w-72">
                                    {line!.positions.map((p) => (
                                        <Tag
                                            key={p}
                                            closable={line!.positions.length > 1}
                                            onClose={() => removePosition(li, p)}>
                                            {positionName(p)}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs mb-1">Add position</div>
                                <div className="flex flex-wrap gap-1 max-w-72">
                                    {addCandidates.map((p) => (
                                        <Button key={p} size="xs" appearance="ghost" onClick={() => addPosition(li, p)}>
                                            {positionName(p)}
                                        </Button>
                                    ))}
                                    {addCandidates.length === 0 && (
                                        <span className="text-xs text-gray-400">no positions available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {isNew ? (
                        <>
                            <Button onClick={closeStaffDialog} appearance="subtle">
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                disabled={newPositions.length === 0}
                                onClick={() => {
                                    addLine(
                                        lines.length === 0 ? 0 : newPlacement === 'before' ? li : li + 1,
                                        newPositions
                                    )
                                    closeStaffDialog()
                                }}>
                                Create
                            </Button>
                        </>
                    ) : (
                        <Button onClick={closeStaffDialog} appearance="primary">
                            Done
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        )
    }

    // Empty system: no staves yet. A "+ Add staff" button opens the SAME New-staff
    // dialog used by the label menu (with the before/after choice omitted for the first
    // staff). Once created the component re-renders with the normal grid.
    if (lines.length === 0) {
        return (
            <>
                <div className={className} style={style}>
                    <div className="shrink-0 w-36 pr-2">
                        <Button size="xs" appearance="ghost" onClick={() => setStaffDialog({ kind: 'new', li: 0 })}>
                            + Add staff
                        </Button>
                    </div>
                </div>
                {renderStaffDialog()}
            </>
        )
    }

    const rows: StaffGridRow[] = lines.map((line, li) => {
        const { label, tooltip } = compactGroupLabel(line.positions, getPositionGroups(orchestra))
        const flatCursor = focused && cursor.line === li ? cursor.index : null
        // Read-only expanded snippet below the line that holds the cursor (hidden while playing).
        const showSnippet = focused && !playing && cursor.line === li

        const labelEl = lineMenu(li, label, tooltip)

        const below = showSnippet ? (
            <div className="my-1 bg-blue-50">
                {line.positions.map((p) => {
                    const staff = staffs[p]
                    if (!staff) return null
                    return (
                        <div key={p} className="flex items-center">
                            {/* Same w-36 label column as the compact staff, so the snippet notation lines up. */}
                            <div
                                className="shrink-0 w-36 pr-2 truncate text-blue-400"
                                style={{ fontFamily: 'system-ui, sans-serif', fontSize: '10px' }}>
                                {positionName(p)}
                            </div>
                            <div className={fontClass} style={{ whiteSpace: 'pre' }}>
                                <StaffLine
                                    symbols={staff.objNotation}
                                    cursorIndex={null}
                                    onSymbolClick={() => {}}
                                    onTrailingClick={() => {}}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        ) : undefined

        return {
            key: line.id,
            label: labelEl,
            symbols: line.notation,
            cursorIndex: flatCursor,
            onSymbolClick: (index: number) => setCursor(li, index),
            onTrailingClick: () => setCursor(li, line.notation.length),
            below
        }
    })

    return (
        <>
            <StaffGrid
                rows={rows}
                grid={{ ref, left: '9rem', widthCh: notationWidth }}
                rowWidthCh={notationWidth}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onFocus={onFocus}
                onBlur={onBlur}
                className={className}
                style={style}
            />
            {renderStaffDialog()}
        </>
    )
}
