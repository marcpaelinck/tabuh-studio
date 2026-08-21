// Per-user preferences editor (any logged-in role). Saves to the server and applies the
// changes immediately. The default focus is set per orchestra (its options are derived from the
// orchestra's instruments, so no score needs to be open). See CLAUDE.user-settings.md.

import { instrumentGroups } from '@tabuhstudio/shared'
import type { Orchestra, Position } from '@tabuhstudio/shared/types/position'
import { orchestraPositions, orderedPositions } from '@tabuhstudio/shared/utils/position'
import { useEffect, useState } from 'react'
import { Button, CheckPicker, Drawer, Message, SelectPicker, Toggle } from 'rsuite'
import { useAuth } from '../context/AuthContext'
import { apiSetSubscriptions } from '../services/apiService'
import { useGroupsStore } from '../stores/useGroupsStore'
import { useScoreStore } from '../stores/useScoreStore'
import type { UserPreferences } from '../typing/preferences'
import { createFocusMenuItems } from '../utils/selectorsUtils'
import { PositionOrderEditor } from './PositionOrderEditor'
import { QTip } from './Tooltipped'

// True when two position orders are identical (same length + element order).
const sameOrder = (a: Position[], b: Position[]) => a.length === b.length && a.every((p, i) => p === b[i])

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
    // The open score (if any) — used to offer "apply this order to the current score".
    const currentScore = useScoreStore((s) => s.currentScore)

    // Default score filter is encoded as 'orchestra:<name>' or 'group:<id>' for the combined picker.
    const [scoreFilter, setScoreFilter] = useState<string | null>(null)
    const [subscriptions, setSubscriptions] = useState<number[]>([])
    const [focusByOrchestra, setFocusByOrchestra] = useState<Record<string, string | null>>({})
    const [notationVisible, setNotationVisible] = useState(false)
    const [cursorStyle, setCursorStyle] = useState<string | null>(null)
    const [keyboard, setKeyboard] = useState<string | null>(null)
    // Default staff (position) order per orchestra + which orchestra's order is being edited.
    const [orderByOrchestra, setOrderByOrchestra] = useState<Record<string, Position[]>>({})
    const [orderOrchestra, setOrderOrchestra] = useState<Orchestra>(orchestras[0])
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
        setOrderByOrchestra(
            Object.fromEntries(orchestras.map((o) => [o, orderedPositions(o, p.defaultPositionOrderByOrchestra?.[o])]))
        )
        setOrderOrchestra(orchestras[0])
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
        // Persist only the orders that differ from the system default (keeps the blob small).
        const orderMap: Partial<Record<Orchestra, Position[]>> = {}
        for (const o of orchestras) {
            const ord = orderByOrchestra[o]
            if (ord && !sameOrder(ord, orchestraPositions(o))) orderMap[o] = ord
        }
        if (Object.keys(orderMap).length) prefs.defaultPositionOrderByOrchestra = orderMap
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

    const titleStyle = 'text-sm mb-1 font-bold'

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
                        <div className={titleStyle}>
                            Subscribed groups
                            <QTip tip="(Music) groups that you select here can be used to filter scores." />
                        </div>
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
                        <div className={titleStyle}>
                            Default score filter
                            <QTip
                                tip={
                                    <span>
                                        The filter is applied on the list of compositions
                                        <br />
                                        when you open a score from the library.
                                    </span>
                                }
                            />
                        </div>
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
                        <div className={titleStyle}>
                            Default focus per orchestra
                            <QTip tip="Will be automatically selected for the playback animation." />
                        </div>
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
                    <div>
                        <div className={titleStyle}>
                            Staff order per orchestra
                            <QTip tip="Order of the staffs in the editor and the PDF output." />
                        </div>
                        <SelectPicker
                            data={orchestraOptions}
                            value={orderOrchestra}
                            onChange={(v) => v && setOrderOrchestra(v as Orchestra)}
                            block
                            searchable={false}
                            cleanable={false}
                            className="mb-2"
                        />
                        <PositionOrderEditor
                            positions={orderByOrchestra[orderOrchestra] ?? []}
                            onChange={(next) => setOrderByOrchestra((prev) => ({ ...prev, [orderOrchestra]: next }))}
                        />
                        <div className="flex items-center gap-3">
                            <Button
                                size="xs"
                                appearance="link"
                                className="mt-1 pl-0"
                                onClick={() =>
                                    setOrderByOrchestra((prev) => ({
                                        ...prev,
                                        [orderOrchestra]: orchestraPositions(orderOrchestra)
                                    }))
                                }>
                                Reset to system default
                            </Button>
                            <Button
                                size="xs"
                                appearance="link"
                                className="mt-1"
                                // Only meaningful when the open score uses the orchestra being edited.
                                disabled={!currentScore || currentScore.instrumenttype !== orderOrchestra}
                                onClick={() =>
                                    useScoreStore.getState().applyPositionOrder(orderByOrchestra[orderOrchestra] ?? [])
                                }>
                                Apply to current score
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={titleStyle}>
                            Show notation in animation
                            <QTip tip="Default setting for the playback animation (Player view)." />
                        </div>
                        <Toggle checked={notationVisible} onChange={setNotationVisible} />
                    </div>
                    <div>
                        <div className={titleStyle}>
                            Default cursor style
                            <QTip
                                tip={
                                    <span>
                                        Style of the notation highlighting during playback.
                                        <br />
                                        Applies both to the Player view and the Editor view.
                                    </span>
                                }
                            />
                        </div>
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
                        <div className={titleStyle}>
                            Default keyboard setting
                            <QTip tip="A keyboard setting assigns note symbols to keystrokes." />
                        </div>
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
