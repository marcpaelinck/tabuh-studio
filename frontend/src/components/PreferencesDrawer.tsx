// Per-user preferences editor (any logged-in role). Saves to the server and applies the
// changes immediately. The default focus is set per orchestra (its options are derived from the
// orchestra's instruments, so no score needs to be open). See CLAUDE.user-settings.md.

import { instrumentGroups } from '@tabuhstudio/shared'
import type { Orchestra } from '@tabuhstudio/shared/types/position'
import { useEffect, useState } from 'react'
import { Button, CheckPicker, Drawer, Message, SelectPicker, Toggle } from 'rsuite'
import { useAuth } from '../context/AuthContext'
import { apiSetSubscriptions } from '../services/apiService'
import { useGroupsStore } from '../stores/useGroupsStore'
import type { UserPreferences } from '../typing/preferences'
import { createFocusMenuItems } from '../utils/selectorsUtils'

const orchestras = Object.keys(instrumentGroups) as Orchestra[]
const orchestraLabel = (o: string) => o.replace(/_/g, ' ')

const orchestraOptions = orchestras.sort().map((o) => ({ label: orchestraLabel(o), value: o }))

// Focus options per orchestra (stable — derived from the orchestra's instruments).
const focusOptionsByOrchestra: Record<string, { label: string; value: string }[]> = Object.fromEntries(
    orchestras.map((o) => [
        o,
        createFocusMenuItems(o).map((item) => ({ label: item.label as string, value: item.value }))
    ])
)

const cursorOptions = [
    { label: 'Beat', value: 'Beat' },
    { label: 'System', value: 'System' },
    { label: 'None', value: 'None' }
]
const keyboardOptions = [
    { label: 'Regular', value: 'regular' },
    { label: 'Laras', value: 'laras' }
]

interface PreferencesDrawerProps {
    open: boolean
    onClose: () => void
}

export function PreferencesDrawer({ open, onClose }: PreferencesDrawerProps) {
    const { user, updatePreferences } = useAuth()
    const groups = useGroupsStore((s) => s.groups)
    const storeSubscriptions = useGroupsStore((s) => s.subscriptions)

    // Default score filter is encoded as 'orchestra:<name>' or 'group:<id>' for the combined picker.
    const [scoreFilter, setScoreFilter] = useState<string | null>(null)
    const [subscriptions, setSubscriptions] = useState<number[]>([])
    const [focusByOrchestra, setFocusByOrchestra] = useState<Record<string, string | null>>({})
    const [notationVisible, setNotationVisible] = useState(false)
    const [cursorStyle, setCursorStyle] = useState<string | null>(null)
    const [keyboard, setKeyboard] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Initialise from the current user/store when the drawer opens (not on later user changes,
    // so the success message and edits survive the save that updates the user object).
    useEffect(() => {
        if (!open) return
        const p = user?.preferences ?? {}
        setScoreFilter(p.defaultScoreFilter ? `${p.defaultScoreFilter.type}:${p.defaultScoreFilter.value}` : null)
        setSubscriptions(storeSubscriptions)
        setFocusByOrchestra(Object.fromEntries(orchestras.map((o) => [o, p.defaultFocusByOrchestra?.[o] ?? null])))
        setNotationVisible(!!p.notationVisibleByDefault)
        setCursorStyle(p.defaultCursorStyle ?? null)
        setKeyboard(p.defaultKeyboard ?? null)
        setSaved(false)
        setError(null)
        setSaving(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const subscribedGroups = groups.filter((g) => subscriptions.includes(g.id))
    const filterOptions = [
        ...orchestraOptions.map((o) => ({ label: o.label, value: `orchestra:${o.value}`, kind: 'Orchestra' })),
        ...subscribedGroups.map((g) => ({ label: g.name, value: `group:${g.id}`, kind: 'Group' }))
    ]
    const groupOptions = groups.map((g) => ({ label: g.name, value: g.id }))

    const save = async () => {
        setError(null)
        setSaving(true)
        const prefs: UserPreferences = { notationVisibleByDefault: notationVisible }
        if (scoreFilter) {
            const [kind, val] = scoreFilter.split(':')
            if (kind === 'orchestra') prefs.defaultScoreFilter = { type: 'orchestra', value: val }
            else if (kind === 'group') prefs.defaultScoreFilter = { type: 'group', value: Number(val) }
        }
        const focusMap: Partial<Record<Orchestra, string>> = {}
        for (const o of orchestras) {
            const v = focusByOrchestra[o]
            if (v) focusMap[o] = v
        }
        if (Object.keys(focusMap).length) prefs.defaultFocusByOrchestra = focusMap
        if (cursorStyle) prefs.defaultCursorStyle = cursorStyle as UserPreferences['defaultCursorStyle']
        if (keyboard) prefs.defaultKeyboard = keyboard as UserPreferences['defaultKeyboard']
        try {
            await apiSetSubscriptions(subscriptions)
            useGroupsStore.getState().setSubscriptions(subscriptions)
            await updatePreferences(prefs)
            setSaved(true)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save preferences.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Drawer open={open} size="sm" onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>Preferences</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={onClose} appearance="subtle">
                        Close
                    </Button>
                    <Button onClick={save} appearance="primary" loading={saving}>
                        Save
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                {saved && (
                    <Message type="success" showIcon className="mb-3">
                        Preferences saved.
                    </Message>
                )}
                {error && (
                    <Message type="error" showIcon className="mb-3">
                        {error}
                    </Message>
                )}
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="text-sm mb-1">Subscribed groups</div>
                        <CheckPicker
                            data={groupOptions}
                            value={subscriptions}
                            onChange={setSubscriptions}
                            block
                            searchable={false}
                            placeholder={groupOptions.length ? 'None' : 'No groups exist yet'}
                            disabled={groupOptions.length === 0}
                        />
                    </div>
                    <div>
                        <div className="text-sm mb-1">Default score filter</div>
                        <SelectPicker
                            data={filterOptions}
                            groupBy="kind"
                            value={scoreFilter}
                            onChange={setScoreFilter}
                            block
                            searchable={false}
                            placeholder="No default"
                        />
                    </div>
                    <div>
                        <div className="text-sm mb-1">Default focus per orchestra</div>
                        <div className="flex flex-col gap-2">
                            {orchestras.map((o) => (
                                <div key={o} className="flex items-center gap-2">
                                    <div className="w-32 shrink-0 text-xs text-gray-600">{orchestraLabel(o)}</div>
                                    <SelectPicker
                                        data={focusOptionsByOrchestra[o]}
                                        value={focusByOrchestra[o] ?? null}
                                        onChange={(v) => setFocusByOrchestra((prev) => ({ ...prev, [o]: v }))}
                                        block
                                        searchable={false}
                                        placeholder="No Focus"
                                        className="flex-1"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-sm">Show notation by default</div>
                        <Toggle checked={notationVisible} onChange={setNotationVisible} />
                    </div>
                    <div>
                        <div className="text-sm mb-1">Default cursor style</div>
                        <SelectPicker
                            data={cursorOptions}
                            value={cursorStyle}
                            onChange={setCursorStyle}
                            block
                            searchable={false}
                            cleanable={false}
                            placeholder="Beat"
                        />
                    </div>
                    <div>
                        <div className="text-sm mb-1">Default keyboard</div>
                        <SelectPicker
                            data={keyboardOptions}
                            value={keyboard}
                            onChange={setKeyboard}
                            block
                            searchable={false}
                            cleanable={false}
                            placeholder="Regular"
                        />
                    </div>
                </div>
            </Drawer.Body>
        </Drawer>
    )
}
