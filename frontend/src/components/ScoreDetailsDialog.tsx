/**
 * ScoreDetailsDialog — collects/edits score-level metadata (Step 6).
 *
 * - mode 'new':  title + instrument type (both required) + composer (optional).
 *                Used by the "Notation → New" menu action to create a fresh score.
 * - mode 'edit': title + composer are editable; instrument type is shown read-only.
 *                Used by the "Notation → Score details..." menu action.
 */

import { orchestraConfigs } from '@tabuhstudio/shared/config/position'
import type { Orchestra } from '@tabuhstudio/shared/types/position'
import _ from 'lodash'
import { useEffect, useState } from 'react'
import { Button, Drawer, Input, InputGroup, SelectPicker, Tag, TagGroup } from 'rsuite'
import { useAuth } from '../context/AuthContext'
import { apiGetGroupsForScore } from '../services/apiService'

// Human-readable labels for the selectable instrument types (UNDEFINED is excluded).
const instrumentLabels: Partial<Record<Orchestra, string>> = Object.fromEntries(
    _.keys(orchestraConfigs).map((t) => [t as Orchestra, t.replace('_', ' ')])
)

const instrumentOptions = _.keys(orchestraConfigs).map((t) => {
    return { label: instrumentLabels[t as Orchestra], value: t }
})

export interface ScoreDetailsValues {
    title: string
    composer: string
    instrumenttype: Orchestra
}

interface ScoreDetailsDialogProps {
    open: boolean
    mode: 'new' | 'edit'
    /** Pre-fill values (used in 'edit' mode; ignored fields default to empty in 'new' mode). */
    initial?: ScoreDetailsValues
    /** The score's uuid (edit mode) — used to show which groups have it on their repertoire. */
    scoreUuid?: string
    onClose: () => void
    /** Called with the collected values on Create/Save. In 'edit' mode instrumenttype is unchanged. */
    onSubmit: (values: ScoreDetailsValues) => void
}

export function ScoreDetailsDialog({ open, mode, initial, scoreUuid, onClose, onSubmit }: ScoreDetailsDialogProps) {
    const { user } = useAuth()
    const [title, setTitle] = useState('')
    const [composer, setComposer] = useState('')
    const [instrumenttype, setInstrumenttype] = useState<Orchestra | null>(null)
    const [groupNames, setGroupNames] = useState<string[]>([])

    // (Re)seed the fields whenever the dialog opens.
    useEffect(() => {
        if (!open) return
        setTitle(initial?.title ?? '')
        setComposer(initial?.composer ?? '')
        setInstrumenttype(initial?.instrumenttype ?? null)
        // Read-only: the groups whose repertoire includes this score (logged-in users only).
        setGroupNames([])
        if (mode === 'edit' && user && scoreUuid) {
            apiGetGroupsForScore(scoreUuid)
                .then(({ groups }) => setGroupNames(groups.map((g) => g.name)))
                .catch(() => setGroupNames([]))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Title is always required; a score also requires an instrument type.
    const valid = title.trim().length > 0 && instrumenttype !== null

    const handleSubmit = () => {
        console.log(`Creating new score ${title.trim()} for ${instrumenttype}`)

        if (!valid || (mode === 'edit' && !initial)) return
        onSubmit({
            title: title.trim(),
            composer: composer.trim(),
            // 'edit' keeps the existing instrument type; 'new' guarantees a value via `valid`.
            instrumenttype: mode === 'edit' ? initial!.instrumenttype : instrumenttype
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
                        {mode === 'new' || !initial?.instrumenttype ? (
                            <SelectPicker
                                block
                                searchable={false}
                                cleanable={false}
                                data={instrumentOptions}
                                value={instrumenttype}
                                onChange={(v) => setInstrumenttype(v as Orchestra | null)}
                                placeholder="Select instrument type"
                            />
                        ) : (
                            <InputGroup>
                                <Input readOnly value={instrumentLabels[initial?.instrumenttype]} />
                            </InputGroup>
                        )}
                    </div>
                    <div>
                        <div className="text-xs mb-1">Composer</div>
                        <Input value={composer} onChange={setComposer} placeholder="Composer (optional)" />
                    </div>
                    {mode === 'edit' && user && (
                        <div>
                            <div className="text-xs mb-1">On the repertoire of</div>
                            {groupNames.length ? (
                                <TagGroup>
                                    {groupNames.map((n) => (
                                        <Tag key={n}>{n}</Tag>
                                    ))}
                                </TagGroup>
                            ) : (
                                <div className="text-xs text-gray-500">No groups.</div>
                            )}
                        </div>
                    )}
                </div>
            </Drawer.Body>
        </Drawer>
    )
}
