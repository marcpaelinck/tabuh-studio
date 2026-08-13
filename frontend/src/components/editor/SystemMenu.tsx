/**
 * SystemMenu — the per-system hamburger menu (replaces the new/copy/delete toolbar buttons).
 *
 * A dropdown with four actions, each opening a small modal to collect its options and
 * then dispatching through `onAction` → `executeItemAction` → `updateScoreFromItemAction`:
 *   - New…       add an empty system before/after the current one
 *   - Copy from… add a copy of a chosen system (entire / staffs) before/after, optionally
 *                omitting the notation of individual source groups
 *   - Move…      move the current system before/after a chosen target
 *   - Delete…    remove the current system (blocked if a `goto` points at it)
 */

import type { Position } from '@tabuhstudio/shared'
import type { UUID } from '@tabuhstudio/shared/types/basetypes'
import { useEffect, useRef, useState } from 'react'
import { FaBars } from 'react-icons/fa6'
import {
    Button,
    Dropdown,
    IconButton,
    Modal,
    Popover,
    Radio,
    RadioGroup,
    SelectPicker,
    Toggle,
    Whisper,
    type WhisperInstance
} from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { ItemPosition, System, SystemActionValue } from '../../typing/score'

type DialogKind = 'new' | 'copy' | 'move' | 'delete'

/** One selectable group of a copy-source system (its compact label + positions). */
export interface SystemGroupTag {
    id: string
    label: string
    positions: Position[]
}

interface SystemMenuProps {
    systemData: System
    /** True when a `goto` directive points at this system (delete is then blocked). */
    isGotoTarget: boolean
    /** Systems selectable as a copy source (includes "<this system>"). */
    copyOptions: InputOption<string>[]
    /** Systems selectable as a move target (excludes the current system). */
    moveOptions: InputOption<string>[]
    /** Resolves the notation groups of a system (for the copy dialog's per-group tags). */
    sourceGroupTags: (uuid: UUID) => SystemGroupTag[]
    /** Dispatches a system action with its structured payload. */
    onAction: (fieldname: DialogKind, value: SystemActionValue) => void
    disabled?: boolean
}

function PositionField({ value, onChange }: { value: ItemPosition; onChange: (p: ItemPosition) => void }) {
    return (
        <div>
            <div className="text-xs mb-1">Position</div>
            <RadioGroup inline value={value} onChange={(v) => onChange(v as ItemPosition)}>
                <Radio value="above">above</Radio>
                <Radio value="below">below</Radio>
            </RadioGroup>
        </div>
    )
}

export function SystemMenu({
    systemData,
    isGotoTarget,
    copyOptions,
    moveOptions,
    sourceGroupTags,
    onAction,
    disabled
}: SystemMenuProps) {
    const [dialog, setDialog] = useState<DialogKind | null>(null)
    const [position, setPosition] = useState<ItemPosition>('below')
    const [copySource, setCopySource] = useState<UUID | null>(systemData.uuid)
    const [copyExecutionItems, setCopyExecutionItems] = useState(true)
    const [moveTarget, setMoveTarget] = useState<UUID | null>(null)
    // Ids of the source groups whose notation should be OMITTED (deselected). Empty = keep all.
    // Tracking deselections (rather than selections) means a freshly picked source starts
    // fully selected without a reset effect, and no selection flashes on source change.
    const [deselectedGroupIds, setDeselectedGroupIds] = useState<string[]>([])

    // Reset the form each time a dialog opens.
    useEffect(() => {
        if (!dialog) return
        setPosition('below')
        setCopySource(systemData.uuid)
        setCopyExecutionItems(true)
        setMoveTarget(null)
        setDeselectedGroupIds([])
    }, [dialog])

    const sourceTags = dialog === 'copy' && copySource ? sourceGroupTags(copySource) : []
    const isSelected = (id: string) => !deselectedGroupIds.includes(id)
    const allSelected = sourceTags.length > 0 && sourceTags.every((t) => isSelected(t.id))
    const toggleGroup = (id: string) =>
        setDeselectedGroupIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
    const toggleAll = () =>
        setDeselectedGroupIds((s) => {
            const others = s.filter((id) => !sourceTags.some((t) => t.id === id))
            return allSelected ? [...others, ...sourceTags.map((t) => t.id)] : others
        })

    const close = () => setDialog(null)

    const confirmDisabled =
        (dialog === 'copy' && !copySource) ||
        (dialog === 'move' && !moveTarget) ||
        (dialog === 'delete' && isGotoTarget)

    const handleConfirm = () => {
        switch (dialog) {
            case 'new':
                onAction('new', { position })
                break
            case 'copy': {
                if (!copySource) return
                // Deselected groups: clear their notation in the copy.
                const omitPositions = sourceTags.filter((t) => !isSelected(t.id)).flatMap((t) => t.positions)
                onAction('copy', {
                    sourceUuid: copySource,
                    position,
                    mode: copyExecutionItems ? 'entire' : 'staffs',
                    omitPositions
                })
                break
            }
            case 'move':
                if (!moveTarget) return
                onAction('move', { targetUuid: moveTarget, position })
                break
            case 'delete':
                if (isGotoTarget) return
                onAction('delete', {})
                break
        }
        close()
    }

    const titles: Record<DialogKind, string> = {
        new: 'New system',
        copy: 'Copy from…',
        move: 'Move system',
        delete: 'Delete system'
    }

    // Whisper + Popover overlay menu (rather than Dropdown + renderToggle): the latter's overlay
    // outside-click close races with the custom toggle's own click, so clicking an open toggle
    // closed then immediately reopened it. `runAndClose` shuts the popover before the action.
    const menuRef = useRef<WhisperInstance>(null)
    const runAndClose = (fn: () => void) => () => {
        menuRef.current?.close()
        fn()
    }

    return (
        <>
            <Whisper
                ref={menuRef}
                placement="bottomStart"
                trigger={disabled ? 'none' : 'click'}
                speaker={
                    <Popover full>
                        <Dropdown.Menu>
                            <Dropdown.Item onSelect={runAndClose(() => setDialog('new'))}>New…</Dropdown.Item>
                            <Dropdown.Item onSelect={runAndClose(() => setDialog('copy'))}>Copy from…</Dropdown.Item>
                            <Dropdown.Item onSelect={runAndClose(() => setDialog('move'))}>Move…</Dropdown.Item>
                            <Dropdown.Item onSelect={runAndClose(() => setDialog('delete'))}>Delete…</Dropdown.Item>
                        </Dropdown.Menu>
                    </Popover>
                }>
                <IconButton
                    size="sm"
                    appearance="subtle"
                    disabled={disabled}
                    icon={<FaBars />}
                    aria-label="system menu"
                    title="System actions: add, copy, move or delete this system"
                    data-tour="system-menu"
                />
            </Whisper>

            <Modal
                size="xs"
                open={dialog !== null}
                onClose={close}
                // Nudge the dialog toward the left (near the system menu) instead of centre.
                style={{ marginLeft: '6rem', marginRight: 'auto' }}>
                <Modal.Header>
                    <Modal.Title>{dialog ? titles[dialog] : ''}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="flex flex-col gap-3">
                        {dialog === 'new' && <PositionField value={position} onChange={setPosition} />}

                        {dialog === 'copy' && (
                            <>
                                <div>
                                    <div className="text-xs mb-1">System</div>
                                    <SelectPicker
                                        block
                                        cleanable={false}
                                        data={copyOptions}
                                        value={copySource}
                                        onChange={(v) => setCopySource(v as UUID | null)}
                                        placeholder="Select a system"
                                    />
                                </div>
                                <br />
                                <PositionField value={position} onChange={setPosition} />
                                <br />
                                <div className="flex items-center gap-2">
                                    <Toggle checked={copyExecutionItems} onChange={setCopyExecutionItems} />
                                    <span className="text-xs">
                                        Include execution items
                                        <br />
                                        (playing sequence, tempo, dynamics)
                                    </span>
                                </div>
                                <br />
                                {sourceTags.length > 0 && (
                                    <div>
                                        <div className="text-xs mb-1 flex items-center justify-between">
                                            <span>Copy notation of</span>
                                            <button
                                                type="button"
                                                className="text-blue-600 text-xs hover:underline"
                                                onClick={toggleAll}>
                                                {allSelected ? 'Deselect all' : 'Select all'}
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1 max-w-72">
                                            {sourceTags.map((t) => {
                                                const on = isSelected(t.id)
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => toggleGroup(t.id)}
                                                        className={`cursor-pointer select-none rounded px-2 py-0.5 text-xs ${
                                                            on
                                                                ? 'bg-blue-600 text-white'
                                                                : 'border border-gray-300 bg-white text-gray-400'
                                                        }`}>
                                                        {t.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {dialog === 'move' && (
                            <>
                                <div>
                                    <PositionField value={position} onChange={setPosition} />
                                    <br />
                                    <div className="text-xs mb-1">System</div>
                                    <SelectPicker
                                        block
                                        cleanable={false}
                                        data={moveOptions}
                                        value={moveTarget}
                                        onChange={(v) => setMoveTarget(v as UUID | null)}
                                        placeholder="Select a system"
                                    />
                                </div>
                            </>
                        )}

                        {dialog === 'delete' &&
                            (isGotoTarget ? (
                                <div className="text-sm text-red-600">
                                    This system can't be deleted because a <b>goto</b> directive points to it.
                                </div>
                            ) : (
                                <div className="text-sm">Delete system #{systemData.id}? This can't be undone.</div>
                            ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={close} appearance="subtle">
                        Cancel
                    </Button>
                    {!(dialog === 'delete' && isGotoTarget) && (
                        <Button
                            onClick={handleConfirm}
                            appearance="primary"
                            color={dialog === 'delete' ? 'red' : undefined}
                            disabled={confirmDisabled}>
                            {dialog === 'delete' ? 'Delete' : dialog === 'new' ? 'Create' : 'OK'}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </>
    )
}
