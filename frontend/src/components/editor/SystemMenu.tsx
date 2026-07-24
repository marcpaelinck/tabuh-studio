/**
 * SystemMenu — the per-system hamburger menu (replaces the new/copy/delete toolbar buttons).
 *
 * A dropdown with four actions, each opening a small modal to collect its options and
 * then dispatching through `onAction` → `executeItemAction` → `updateScoreFromItemAction`:
 *   - New…       add an empty system before/after the current one
 *   - Copy from… add a copy of a chosen system (entire / staffs / positions) before/after
 *   - Move…      move the current system before/after a chosen target
 *   - Delete…    remove the current system (blocked if a `goto` points at it)
 */

import type { UUID } from '@tabuhstudio/shared/types/basetypes'
import { useEffect, useState } from 'react'
import { FaBars } from 'react-icons/fa6'
import { Button, Dropdown, IconButton, Modal, Radio, RadioGroup, SelectPicker } from 'rsuite'
import type { InputOption } from 'rsuite/esm/InputPicker/hooks/useData'
import type { CopyMode, ItemPosition, System, SystemActionValue } from '../../typing/score'

type DialogKind = 'new' | 'copy' | 'move' | 'delete'

interface SystemMenuProps {
    systemData: System
    /** True when a `goto` directive points at this system (delete is then blocked). */
    isGotoTarget: boolean
    /** Systems selectable as a copy source (includes "<this system>"). */
    copyOptions: InputOption<string>[]
    /** Systems selectable as a move target (excludes the current system). */
    moveOptions: InputOption<string>[]
    /** Dispatches a system action with its structured payload. */
    onAction: (fieldname: DialogKind, value: SystemActionValue) => void
    disabled?: boolean
}

const copyModeOptions: { value: CopyMode; label: string; hint: string }[] = [
    { value: 'entire', label: 'entire system', hint: 'all attributes except the label' },
    { value: 'staffs', label: 'staffs', hint: 'without the execution items' },
    { value: 'positions', label: 'positions', hint: 'position groups and staffs, notation cleared' }
]

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
    onAction,
    disabled
}: SystemMenuProps) {
    const [dialog, setDialog] = useState<DialogKind | null>(null)
    const [position, setPosition] = useState<ItemPosition>('below')
    const [copySource, setCopySource] = useState<UUID | null>(null)
    const [copyMode, setCopyMode] = useState<CopyMode>('entire')
    const [moveTarget, setMoveTarget] = useState<UUID | null>(null)

    // Reset the form each time a dialog opens.
    useEffect(() => {
        if (!dialog) return
        setPosition('below')
        setCopySource(null)
        setCopyMode('entire')
        setMoveTarget(null)
    }, [dialog])

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
            case 'copy':
                if (!copySource) return
                onAction('copy', { sourceUuid: copySource, position, mode: copyMode })
                break
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

    return (
        <>
            <Dropdown
                placement="bottomStart"
                disabled={disabled}
                renderToggle={(props, ref) => (
                    <IconButton
                        {...props}
                        ref={ref}
                        size="sm"
                        as="span"
                        appearance="subtle"
                        disabled={disabled}
                        icon={<FaBars />}
                        aria-label="system menu"
                    />
                )}>
                <Dropdown.Item onSelect={() => setDialog('new')}>New…</Dropdown.Item>
                <Dropdown.Item onSelect={() => setDialog('copy')}>Copy from…</Dropdown.Item>
                <Dropdown.Item onSelect={() => setDialog('move')}>Move…</Dropdown.Item>
                <Dropdown.Item onSelect={() => setDialog('delete')}>Delete…</Dropdown.Item>
            </Dropdown>

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
                                <div>
                                    <div className="text-xs mb-1">Copy what</div>
                                    <RadioGroup value={copyMode} onChange={(v) => setCopyMode(v as CopyMode)}>
                                        {copyModeOptions.map((o) => (
                                            <Radio key={o.value} value={o.value}>
                                                {o.label} <span className="text-gray-400 text-xs">— {o.hint}</span>
                                            </Radio>
                                        ))}
                                    </RadioGroup>
                                </div>
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
