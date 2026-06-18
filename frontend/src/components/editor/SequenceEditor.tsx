import {
    DndContext,
    DragOverlay,
    PointerSensor,
    pointerWithin,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CloseIcon from '@rsuite/icons/Close'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import { v4 as uuidv4 } from 'uuid'

// One entry in the ordered sequence. `id` is a locally unique key (so the same
// system uuid can appear multiple times); `uuid` is the system it refers to.
interface Entry {
    id: string
    uuid: string
}

const DROP_ZONE_ID = 'sequence-drop-zone'
const PALETTE_ZONE_ID = 'sequence-palette-zone'
const RELATIVE_SIZE = 'min-h-20 max-h-[30vh]' // Tailwind

interface SequenceEditorProps {
    options: InputOption<string>[] // available systems: { label, value: uuid }
    value: string[] // ordered system uuids (duplicates allowed)
    onChange: (uuids: string[]) => void
    disabled?: boolean
}

// Two-pane editor: a palette of available systems on the left, the ordered
// sequence on the right. Drag a palette item into the right pane to append it
// (the same system can be added repeatedly); drag entries within the right pane
// to reorder; use the × button to remove one. A drag overlay shows a ghost label
// while dragging, and an insertion line marks where a palette item will land.
export default function SequenceEditor({ options, value, onChange, disabled }: SequenceEditorProps) {
    const [entries, setEntries] = useState<Entry[]>(() => value.map((uuid) => ({ id: uuidv4(), uuid })))
    // While dragging: the label shown in the overlay, the kind of drag, and the
    // id currently hovered (used to draw the palette insertion line).
    const [dragLabel, setDragLabel] = useState<string | null>(null)
    const [dragKind, setDragKind] = useState<'palette' | 'entry' | null>(null)
    const [overId, setOverId] = useState<string | null>(null)

    // Resync when the bound value changes from outside (e.g. another item selected).
    useEffect(() => {
        const current = entries.map((e) => e.uuid).join('')
        if (current !== value.join('')) {
            setEntries(value.map((uuid) => ({ id: uuidv4(), uuid })))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
    const labelFor = (uuid: string) => (options.find((o) => o.value === uuid)?.label as string) ?? uuid

    // The palette is a droppable too, so a drag dropped back onto "Available" can
    // be detected and ignored (closestCenter would otherwise pick a sequence target).
    const paletteDroppable = useDroppable({ id: PALETTE_ZONE_ID })

    function commit(next: Entry[]) {
        setEntries(next)
        onChange(next.map((e) => e.uuid))
    }

    function clearDrag() {
        setDragLabel(null)
        setDragKind(null)
        setOverId(null)
    }

    function handleDragStart(event: DragStartEvent) {
        const data = event.active.data.current as { kind?: string; uuid?: string } | undefined
        if (data?.kind === 'palette' && data.uuid) {
            setDragKind('palette')
            setDragLabel(labelFor(data.uuid))
        } else {
            const entry = entries.find((e) => e.id === event.active.id)
            setDragKind('entry')
            setDragLabel(entry ? labelFor(entry.uuid) : null)
        }
    }

    function handleDragOver(event: DragOverEvent) {
        setOverId(event.over ? String(event.over.id) : null)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        clearDrag()
        if (!over || disabled) return
        // Dropped back onto the "Available" palette → do nothing.
        if (over.id === PALETTE_ZONE_ID) return
        const activeData = active.data.current as { kind?: string; uuid?: string } | undefined

        if (activeData?.kind === 'palette' && activeData.uuid) {
            // Insert a new entry at the drop position (or append).
            const index = over.id === DROP_ZONE_ID ? entries.length : entries.findIndex((e) => e.id === over.id)
            const next = [...entries]
            next.splice(index < 0 ? entries.length : index, 0, { id: uuidv4(), uuid: activeData.uuid })
            commit(next)
            return
        }
        // Reorder within the right pane.
        if (over.id === DROP_ZONE_ID || active.id === over.id) return
        const from = entries.findIndex((e) => e.id === active.id)
        const to = entries.findIndex((e) => e.id === over.id)
        if (from >= 0 && to >= 0) commit(arrayMove(entries, from, to))
    }

    // The insertion line is only drawn for palette drags (reordering existing
    // entries already shifts them to open a gap).
    const showLineBefore = (entryId: string) => dragKind === 'palette' && overId === entryId
    const showLineAtEnd = dragKind === 'palette' && overId === DROP_ZONE_ID

    const InsertionLine = () => <div className="h-0 border-t-2 border-solid border-blue-500" />

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={clearDrag}>
            <div className="flex gap-3 w-full" style={{ opacity: disabled ? 0.5 : 1 }}>
                {/* Palette of available systems */}
                <div
                    ref={paletteDroppable.setNodeRef}
                    className={`flex-1 border border-solid border-gray-300 rounded p-2 overflow-y-auto ${RELATIVE_SIZE}`}>
                    <div className="text-xs text-gray-500 mb-1">Available</div>
                    <div className="flex flex-col gap-1">
                        {options.map((opt) => (
                            <PaletteItem
                                key={opt.value}
                                uuid={opt.value || ''}
                                label={opt.label as string}
                                disabled={disabled}
                            />
                        ))}
                    </div>
                </div>

                {/* Ordered sequence */}
                <DropZone>
                    <div className="text-xs text-gray-500 mb-1">Sequence (drag to add / reorder)</div>
                    <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-1">
                            {entries.map((entry, idx) => (
                                <div key={entry.id} className="flex flex-col gap-1">
                                    {showLineBefore(entry.id) && <InsertionLine />}
                                    <SequenceRow
                                        entry={entry}
                                        index={idx}
                                        label={labelFor(entry.uuid)}
                                        disabled={disabled}
                                        onRemove={() => commit(entries.filter((e) => e.id !== entry.id))}
                                    />
                                </div>
                            ))}
                            {showLineAtEnd && <InsertionLine />}
                            {entries.length === 0 && !showLineAtEnd && (
                                <div className="text-xs text-gray-400 italic py-2">Drop systems here</div>
                            )}
                        </div>
                    </SortableContext>
                </DropZone>
            </div>

            {/* Ghost label that follows the cursor while dragging. Rendered through a
                portal to <body> with a high z-index so it is not hidden or mis-positioned
                by the rsuite Drawer (which uses a portal, a high z-index and a transform). */}
            {createPortal(
                <DragOverlay zIndex={2000}>
                    {dragLabel ? (
                        <div className="px-2 py-1 text-sm border border-solid border-blue-400 rounded bg-white shadow-md">
                            {dragLabel}
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    )
}

function PaletteItem({ uuid, label, disabled }: { uuid: string; label: string; disabled?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette-${uuid}`,
        data: { kind: 'palette', uuid },
        disabled
    })
    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="px-2 py-1 text-sm border border-solid border-gray-200 rounded bg-gray-50 cursor-grab select-none"
            style={{ opacity: isDragging ? 0.4 : 1 }}>
            {label}
        </div>
    )
}

function DropZone({ children }: { children: ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: DROP_ZONE_ID })
    return (
        <div
            ref={setNodeRef}
            className={`flex-1 border border-solid rounded p-2 overflow-y-auto ${RELATIVE_SIZE}`}
            style={{ borderColor: isOver ? '#1C78E0' : '#d1d5db' }}>
            {children}
        </div>
    )
}

function SequenceRow({
    entry,
    index,
    label,
    disabled,
    onRemove
}: {
    entry: Entry
    index: number
    label: string
    disabled?: boolean
    onRemove: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: entry.id,
        disabled
    })
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className="flex items-center gap-2 px-2 py-1 text-sm border border-solid border-gray-200 rounded bg-white">
            <span className="text-gray-400 cursor-grab select-none" {...listeners} {...attributes}>
                ⋮⋮
            </span>
            <span className="text-gray-400 w-5">{index + 1}.</span>
            <span className="flex-1">{label}</span>
            <IconButton size="xs" appearance="subtle" icon={<CloseIcon />} disabled={disabled} onClick={onRemove} />
        </div>
    )
}
