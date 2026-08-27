// A drag-to-reorder list of positions (positions only — never groups). Used by the Score-details
// dialog (per-score order) and the Preferences drawer (per-orchestra default order). Controlled:
// the parent owns the `positions` array and receives the new order via `onChange`.

import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getPositionName } from '@tabuhstudio/shared/config/configAccess'
import type { Position } from '@tabuhstudio/shared/types/position'

const positionName = (p: Position) => getPositionName(p)

function SortableRow({ id, label }: { id: string; label: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <div
            ref={setNodeRef}
            className="inline-flex w-full items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 cursor-grab select-none hover:bg-gray-100"
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
            {...attributes}
            {...listeners}>
            <span aria-hidden="true" className="text-gray-400">
                ⠿
            </span>
            {label}
        </div>
    )
}

interface PositionOrderEditorProps {
    positions: Position[]
    onChange: (next: Position[]) => void
}

export function PositionOrderEditor({ positions, onChange }: PositionOrderEditorProps) {
    // 5px pointer-move threshold so a click doesn't count as a drag.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const from = positions.indexOf(active.id as Position)
        const to = positions.indexOf(over.id as Position)
        if (from < 0 || to < 0) return
        onChange(arrayMove(positions, from, to))
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={positions} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                    {positions.map((p) => (
                        <SortableRow key={p} id={p} label={positionName(p)} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}
