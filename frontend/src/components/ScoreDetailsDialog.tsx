/**
 * ScoreDetailsDialog — collects/edits score-level metadata (Step 6).
 *
 * - mode 'new':  title + instrument type (both required) + composer (optional).
 *                Used by the "Notation → New" menu action to create a fresh score.
 * - mode 'edit': title + composer are editable; instrument type is shown read-only.
 *                Used by the "Notation → Score details..." menu action.
 */

import { orchestras } from '@tabuhstudio/shared/config/position'
import type { InstrumentGroup } from '@tabuhstudio/shared/types/position'
import _ from 'lodash'
import { useEffect, useState } from 'react'
import { Button, Drawer, Input, InputGroup, SelectPicker } from 'rsuite'

// Human-readable labels for the selectable instrument types (UNDEFINED is excluded).
const instrumentLabels: Partial<Record<InstrumentGroup, string>> = Object.fromEntries(
    _.keys(orchestras).map((t) => [t as InstrumentGroup, t.replace('_', ' ')])
)

const instrumentOptions = _.keys(orchestras).map((t) => {
    return { label: instrumentLabels[t as InstrumentGroup], value: t }
})

export interface ScoreDetailsValues {
    title: string
    composer: string
    instrumenttype: InstrumentGroup
}

interface ScoreDetailsDialogProps {
    open: boolean
    mode: 'new' | 'edit'
    /** Pre-fill values (used in 'edit' mode; ignored fields default to empty in 'new' mode). */
    initial?: ScoreDetailsValues
    onClose: () => void
    /** Called with the collected values on Create/Save. In 'edit' mode instrumenttype is unchanged. */
    onSubmit: (values: ScoreDetailsValues) => void
}

export function ScoreDetailsDialog({ open, mode, initial, onClose, onSubmit }: ScoreDetailsDialogProps) {
    const [title, setTitle] = useState('')
    const [composer, setComposer] = useState('')
    const [instrumenttype, setInstrumenttype] = useState<InstrumentGroup | null>(null)

    // (Re)seed the fields whenever the dialog opens.
    useEffect(() => {
        if (!open) return
        setTitle(initial?.title ?? '')
        setComposer(initial?.composer ?? '')
        setInstrumenttype(initial?.instrumenttype ?? null)
    }, [open])

    // Title is always required; a new score also requires an instrument type.
    const valid = title.trim().length > 0 && (mode === 'edit' || instrumenttype !== null)

    const handleSubmit = () => {
        if (!valid) return
        onSubmit({
            title: title.trim(),
            composer: composer.trim(),
            // 'edit' keeps the existing instrument type; 'new' guarantees a value via `valid`.
            instrumenttype: (mode === 'edit' ? initial?.instrumenttype : instrumenttype) ?? 'UNDEFINED'
        })
        onClose()
    }

    return (
        <Drawer open={open} size="sm" onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>{mode === 'new' ? 'New score' : 'Score details'}</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={onClose} appearance="subtle">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} appearance="primary" disabled={!valid}>
                        {mode === 'new' ? 'Create' : 'Save'}
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                <div className="flex flex-col gap-3">
                    <div>
                        <div className="text-xs mb-1">Title *</div>
                        <Input value={title} onChange={setTitle} placeholder="Score title" />
                    </div>
                    <div>
                        <div className="text-xs mb-1">Instrument type *</div>
                        {mode === 'new' ? (
                            <SelectPicker
                                block
                                searchable={false}
                                cleanable={false}
                                data={instrumentOptions}
                                value={instrumenttype}
                                onChange={(v) => setInstrumenttype(v as InstrumentGroup | null)}
                                placeholder="Select instrument type"
                            />
                        ) : (
                            <InputGroup>
                                <Input readOnly value={instrumentLabels[initial?.instrumenttype ?? 'UNDEFINED']} />
                            </InputGroup>
                        )}
                    </div>
                    <div>
                        <div className="text-xs mb-1">Composer</div>
                        <Input value={composer} onChange={setComposer} placeholder="Composer (optional)" />
                    </div>
                </div>
            </Drawer.Body>
        </Drawer>
    )
}
