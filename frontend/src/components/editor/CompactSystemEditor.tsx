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

import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { NoteObject, type Position, type PositionGroup } from '@tabuhstudio/shared'
import { positionConfigs, positionGroups } from '@tabuhstudio/shared/config/position'
import type { NoteSymbol } from '@tabuhstudio/shared/types/basetypes'
import { useCallback, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Button, Modal, Popover, Radio, RadioGroup, SelectPicker, Tag, Tooltip, Whisper } from 'rsuite'
import type { OverlayTriggerHandle } from 'rsuite/esm/internals/Overlay'
import { candidatesFor, type CastingInstruction } from '../../componentlogic/castingRulesManager'
import type { KeyMap } from '../../componentlogic/editor/keyMap'
import { useCompactSystemEditor, type CompactLine } from '../../componentlogic/editor/useCompactSystemEditor'
import { editorFontSize } from '../../config/config'
import { getPositionGroups } from '../../config/position-functions'
import { useEditorStateStore } from '../../stores/useEditorStateStore'
import { useScoreStore } from '../../stores/useScoreStore'
import type { Staffs } from '../../typing/score'
import { compactGroupLabel } from '../../utils/compactGroupLabel'
import { StaffGrid, type StaffGridRow } from './StaffGrid'
import { StaffLine } from './StaffLine'

export interface CompactSystemEditorProps {
    ref: RefObject<HTMLDivElement | null>
    /** UUID of the system being edited (scopes the published selection). */
    systemUuid: string
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

// A staff queued in the "New staffs" basket: either a single position or a whole group.
type NewStaffItem = { kind: 'position'; position: Position } | { kind: 'group'; group: PositionGroup }

// Label styling: positions read as plain chips, groups as blue chips (matching the
// compact-view group labels). Reused for both the source lists and the basket.
const labelBase = 'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs cursor-pointer select-none'
const positionLabelClass = `${labelBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-100`
const groupLabelClass = `${labelBase} bg-blue-600 text-white hover:bg-blue-700`

// Stable id for a queued staff (positions/groups are unique in the basket, so this is unique).
const staffId = (item: NewStaffItem) => (item.kind === 'position' ? `pos:${item.position}` : `grp:${item.group}`)

// A draggable/sortable chip in the "New staffs" basket. Clicking (no drag) removes it; the
// trailing ✕ signals that. A pointer-move threshold distinguishes a click from a drag.
function SortableStaffLabel({
    id,
    className,
    label,
    onRemove
}: {
    id: string
    className: string
    label: string
    onRemove: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <button
            ref={setNodeRef}
            type="button"
            className={className}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
            onClick={onRemove}
            {...attributes}
            {...listeners}>
            {label} <span aria-hidden="true">✕</span>
        </button>
    )
}

export function CompactSystemEditor({
    ref,
    systemUuid,
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
    // The focusable editor surface, so undo/redo can route focus back to this system.
    const containerRef = useRef<HTMLDivElement>(null)
    const focusEditor = useCallback(() => containerRef.current?.focus(), [])
    const {
        lines,
        cursor,
        anchor,
        focused,
        onKeyDown,
        onPaste,
        onFocus,
        onBlur,
        setCursor,
        addLine,
        removeLine,
        addPosition,
        removePosition,
        replaceLineNotation
    } = useCompactSystemEditor({ systemUuid, initialLines, keyMap, castingInstructions, onChange, focusEditor })
    const { overwriteMode, showExpansion } = useEditorStateStore()
    // Positions chosen for a NEW staff, before it is created (add above/below).
    const { orchestra, orchestraPositions } = useScoreStore()
    // Staffs queued in the New-staff dialog's "New staffs" basket, before they are created.
    const [newStaffs, setNewStaffs] = useState<NewStaffItem[]>([])
    // 5px pointer-move threshold: a click removes a basket chip, a drag reorders it.
    const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    // Open staff dialog: the New / Modify popup for the label menu of line `li`.
    const [staffDialog, setStaffDialog] = useState<{ kind: 'new' | 'modify'; li: number } | null>(null)
    const [newPlacement, setNewPlacement] = useState<'above' | 'below'>('below')
    // Open "Copy from…" dialog: the current line, its label, and the systems that have a
    // matching staff (same position set) with the notation to copy. `source` is the picked one.
    const [copyDialog, setCopyDialog] = useState<{
        li: number
        label: string
        sources: { uuid: string; label: string; notation: NoteSymbol[] }[]
    } | null>(null)
    const [copySource, setCopySource] = useState<string | null>(null)
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

    // Position groups available for this orchestra, plus a helper that expands a queued
    // "new staff" item (a single position, or a whole group) into its positions.
    const orchestraGroups = getPositionGroups(orchestra)
    const groupPositions = (g: PositionGroup): Position[] => orchestraGroups[g] ?? []
    const itemPositions = (item: NewStaffItem): Position[] =>
        item.kind === 'position' ? [item.position] : groupPositions(item.group)

    const closeStaffDialog = () => {
        setStaffDialog(null)
        setNewStaffs([])
        setNewPlacement('below')
    }

    // "Copy from…": open a dialog listing the OTHER systems that contain a staff with the
    // SAME position set as line `li`, so its notation can be copied into this staff.
    const samePositions = (a: Position[], b: Position[]) => a.length === b.length && a.every((p) => b.includes(p))
    const openCopyDialog = (li: number) => {
        const line = lines[li]
        if (!line) return
        const label = compactGroupLabel(line.positions, getPositionGroups(orchestra)).label
        const score = useScoreStore.getState().currentScore
        const sources = (score?.systems ?? [])
            .filter((sys) => sys.uuid !== systemUuid)
            .map((sys) => {
                const match = (sys.groups ?? []).find((g) => samePositions(g.positions, line.positions))
                return match ? { uuid: sys.uuid, label: sys.label ?? `# ${sys.id}`, notation: match.notation } : null
            })
            .filter((s): s is { uuid: string; label: string; notation: NoteSymbol[] } => s !== null)
        setCopySource(null)
        setCopyDialog({ li, label, sources })
    }
    const confirmCopy = () => {
        if (!copyDialog || !copySource) return
        const source = copyDialog.sources.find((s) => s.uuid === copySource)
        if (source) {
            replaceLineNotation(
                copyDialog.li,
                source.notation.map((sym) => new NoteObject(sym, undefined))
            )
        }
        setCopyDialog(null)
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
                        className={menuItemClass}
                        onClick={() => {
                            closeMenu()
                            openCopyDialog(li)
                        }}>
                        Copy from…
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

        // New-staff picker: positions already queued are "claimed" and disappear from the
        // position/group lists; a group is offered only when ALL its positions are still free.
        const claimed = new Set(newStaffs.flatMap(itemPositions))
        const freeSet = new Set(free)
        const availPositions = free.filter((p) => !claimed.has(p))
        const availGroups = (Object.keys(orchestraGroups) as PositionGroup[]).filter(
            (g) => groupPositions(g).length >= 2 && groupPositions(g).every((p) => freeSet.has(p) && !claimed.has(p))
        )
        const groupLabel = (g: PositionGroup) => {
            const positions = groupPositions(g)
            return positions.length == 1 && positions[0] in positionConfigs
                ? positionConfigs[positions[0]].name
                : (positionGroups[g]?.name ?? g)
        }
        const newStaffLabel = (item: NewStaffItem) =>
            item.kind === 'position' ? positionName(item.position) : groupLabel(item.group)
        // Modify dialog: positions that can be added to the existing group.
        const addCandidates = line ? candidatesFor(line.positions, free, orchestra) : []

        // Reorder the basket when a chip is dragged onto another.
        const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event
            if (!over || active.id === over.id) return
            setNewStaffs((s) => {
                const from = s.findIndex((it) => staffId(it) === active.id)
                const to = s.findIndex((it) => staffId(it) === over.id)
                return from < 0 || to < 0 ? s : arrayMove(s, from, to)
            })
        }

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
                                <div className="text-xs mb-1">Positions</div>
                                <div className="flex flex-wrap gap-1 max-w-72">
                                    {availPositions.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={positionLabelClass}
                                            onClick={() =>
                                                setNewStaffs((s) => [...s, { kind: 'position', position: p }])
                                            }>
                                            {positionName(p)}
                                        </button>
                                    ))}
                                    {availPositions.length === 0 && <span className="text-xs text-gray-400">none</span>}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs mb-1">Position groups</div>
                                <div className="flex flex-wrap gap-1 max-w-72">
                                    {availGroups.map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            className={groupLabelClass}
                                            onClick={() => setNewStaffs((s) => [...s, { kind: 'group', group: g }])}>
                                            {groupLabel(g)}
                                        </button>
                                    ))}
                                    {availGroups.length === 0 && <span className="text-xs text-gray-400">none</span>}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs mb-1">New staffs</div>
                                <DndContext
                                    sensors={dragSensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}>
                                    <SortableContext
                                        items={newStaffs.map(staffId)}
                                        strategy={horizontalListSortingStrategy}>
                                        <div className="flex flex-wrap gap-1 max-w-72">
                                            {newStaffs.map((item) => (
                                                <SortableStaffLabel
                                                    key={staffId(item)}
                                                    id={staffId(item)}
                                                    className={
                                                        item.kind === 'position' ? positionLabelClass : groupLabelClass
                                                    }
                                                    label={newStaffLabel(item)}
                                                    onRemove={() =>
                                                        setNewStaffs((s) =>
                                                            s.filter((it) => staffId(it) !== staffId(item))
                                                        )
                                                    }
                                                />
                                            ))}
                                            {newStaffs.length === 0 && (
                                                <span className="text-xs text-gray-400">
                                                    click one or more position(s)/group(s) to add staffs
                                                </span>
                                            )}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                            {lines.length > 0 && (
                                <div>
                                    <div className="text-xs mb-1">Position</div>
                                    <RadioGroup
                                        inline
                                        value={newPlacement}
                                        onChange={(v) => setNewPlacement(v as 'above' | 'below')}>
                                        <Radio value="above">above</Radio>
                                        <Radio value="below">below</Radio>
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
                                disabled={newStaffs.length === 0}
                                onClick={() => {
                                    // Insert every queued staff consecutively at the chosen spot.
                                    const at = lines.length === 0 ? 0 : newPlacement === 'above' ? li : li + 1
                                    newStaffs.forEach((item, i) => addLine(at + i, itemPositions(item)))
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
        const isActive = focused && cursor.line === li
        const flatCursor = isActive ? cursor.index : null
        // Selection highlight on the active line (anchor + caret define the range).
        const selection =
            isActive && anchor !== null && anchor !== cursor.index
                ? { from: Math.min(anchor, cursor.index), to: Math.max(anchor, cursor.index) }
                : null
        // Read-only expanded snippet below the line that holds the cursor (hidden while
        // playing, or when the expansion preview is toggled off).
        const showSnippet = showExpansion && focused && !playing && cursor.line === li

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
            selection,
            overwrite: isActive && overwriteMode,
            onSymbolClick: (index: number, extend?: boolean) => setCursor(li, index, extend),
            onTrailingClick: (extend?: boolean) => setCursor(li, line.notation.length, extend),
            below
        }
    })

    return (
        <>
            <StaffGrid
                rows={rows}
                grid={{ ref, left: '9rem', widthCh: notationWidth }}
                rowWidthCh={notationWidth}
                containerRef={containerRef}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onFocus={onFocus}
                onBlur={onBlur}
                className={className}
                style={style}
            />
            {renderStaffDialog()}
            {copyDialog && (
                <Modal
                    size="xs"
                    open
                    onClose={() => setCopyDialog(null)}
                    style={{ marginLeft: '6rem', marginRight: 'auto' }}>
                    <Modal.Header>
                        <Modal.Title>
                            Copy <em>{copyDialog.label}</em> notation from:
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {copyDialog.sources.length === 0 ? (
                            <div className="text-sm text-gray-500">
                                No other system has a “{copyDialog.label}” staff.
                            </div>
                        ) : (
                            <SelectPicker
                                block
                                cleanable={false}
                                data={copyDialog.sources.map((s) => ({ label: s.label, value: s.uuid }))}
                                value={copySource}
                                onChange={(v) => setCopySource(v as string | null)}
                                placeholder="Select a system"
                            />
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button appearance="subtle" onClick={() => setCopyDialog(null)}>
                            Cancel
                        </Button>
                        <Button appearance="primary" disabled={!copySource} onClick={confirmCopy}>
                            Copy
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </>
    )
}
