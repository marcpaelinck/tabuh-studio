// Per-user preferences editor (any logged-in role). Saves to the server and applies the
// changes immediately. Focus options depend on the loaded score, mirroring the player's own
// focus dropdown; the other controls are global. See CLAUDE.user-settings.md.

import { instrumentGroups } from '@tabuhstudio/shared'
import { useEffect, useState } from 'react'
import { Button, Drawer, Message, SelectPicker, Toggle } from 'rsuite'
import { useAuth } from '../context/AuthContext'
import { useScoreStore } from '../stores/useScoreStore'
import { focusDefaultOption } from '../stores/useUserSettingsStore'
import type { UserPreferences } from '../typing/preferences'
import { createFocusMenuItems } from '../utils/selectorsUtils'

const orchestraOptions = Object.keys(instrumentGroups)
    .sort()
    .map((g) => ({ label: g.replace(/_/g, ' '), value: g }))

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
    const currentScore = useScoreStore((s) => s.currentScore)
    const focusOptions = (currentScore ? createFocusMenuItems(currentScore) : [focusDefaultOption]).map((o) => ({
        label: o.label,
        value: o.value
    }))

    const [orchestra, setOrchestra] = useState<string | null>(null)
    const [focus, setFocus] = useState<string | null>(null)
    const [notationVisible, setNotationVisible] = useState(false)
    const [cursorStyle, setCursorStyle] = useState<string | null>(null)
    const [keyboard, setKeyboard] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        const p = user?.preferences ?? {}
        setOrchestra(p.defaultScoreFilter?.type === 'orchestra' ? p.defaultScoreFilter.value : null)
        setFocus(p.defaultFocus ?? null)
        setNotationVisible(!!p.notationVisibleByDefault)
        setCursorStyle(p.defaultCursorStyle ?? null)
        setKeyboard(p.defaultKeyboard ?? null)
        setSaved(false)
        setError(null)
        setSaving(false)
    }, [open, user])

    const save = async () => {
        setError(null)
        setSaving(true)
        const prefs: UserPreferences = { notationVisibleByDefault: notationVisible }
        if (orchestra) prefs.defaultScoreFilter = { type: 'orchestra', value: orchestra }
        if (focus) prefs.defaultFocus = focus
        if (cursorStyle) prefs.defaultCursorStyle = cursorStyle as UserPreferences['defaultCursorStyle']
        if (keyboard) prefs.defaultKeyboard = keyboard as UserPreferences['defaultKeyboard']
        try {
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
                        <div className="text-sm mb-1">Default score filter (orchestra)</div>
                        <SelectPicker
                            data={orchestraOptions}
                            value={orchestra}
                            onChange={setOrchestra}
                            block
                            searchable={false}
                            placeholder="No default"
                        />
                    </div>
                    <div>
                        <div className="text-sm mb-1">
                            Default focus{currentScore ? '' : ' (open a score to choose an instrument)'}
                        </div>
                        <SelectPicker
                            data={focusOptions}
                            value={focus}
                            onChange={setFocus}
                            block
                            searchable={false}
                            placeholder="No Focus"
                        />
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
