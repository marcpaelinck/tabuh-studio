// Drawer to manage music groups. Admins create/edit/delete groups, assign editor-managers, and
// edit repertoire. Editors who manage a group see only their groups and may edit only the
// repertoire. See CLAUDE.user-settings.md.

import { useEffect, useState, type ReactNode } from 'react'
import { BsTrash } from 'react-icons/bs'
import { Button, CheckPicker, Drawer, IconButton, Input, List, Message, Modal, SelectPicker } from 'rsuite'
import {
    apiAddGroupScore,
    apiCreateGroup,
    apiDeleteGroup,
    apiGetGroupScores,
    apiGetScores,
    apiListGroups,
    apiListUsers,
    apiRemoveGroupScore,
    apiSetGroupManagers,
    apiUpdateGroup,
    type AdminUser,
    type GroupScore,
    type MusicGroup,
    type ScoreListItem
} from '../services/apiService'
import { useAuth } from '../context/AuthContext'
import { useGroupsStore } from '../stores/useGroupsStore'

interface ManageGroupsDrawerProps {
    open: boolean
    onClose: () => void
}

const emptyForm = { name: '', city: '', country: '', contactName: '', contactEmail: '', website: '' }

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div className={className}>
            <div className="text-xs text-gray-600 mb-1">{label}</div>
            {children}
        </div>
    )
}

export function ManageGroupsDrawer({ open, onClose }: ManageGroupsDrawerProps) {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'
    const [groups, setGroups] = useState<MusicGroup[]>([])
    const [editors, setEditors] = useState<AdminUser[]>([])
    const [allScores, setAllScores] = useState<ScoreListItem[]>([])
    const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [managerIds, setManagerIds] = useState<number[]>([])
    const [repertoire, setRepertoire] = useState<GroupScore[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)

    // Editors only see/manage groups where `managedByMe`; admins see all.
    const visible = (all: MusicGroup[]) => (isAdmin ? all : all.filter((g) => g.managedByMe))

    const refreshGroups = async () => {
        const { groups } = await apiListGroups()
        useGroupsStore.getState().setGroups(groups)
        setGroups(visible(groups))
    }

    useEffect(() => {
        if (!open) return
        setSelectedId(null)
        setForm(emptyForm)
        setManagerIds([])
        setRepertoire([])
        setError(null)
        setConfirmDelete(false)
        // Only admins can list users (for the managers picker); editors skip that call.
        const requests = Promise.all([apiListGroups(), apiGetScores(), isAdmin ? apiListUsers() : Promise.resolve(null)])
        requests
            .then(([g, s, u]) => {
                useGroupsStore.getState().setGroups(g.groups)
                setGroups(visible(g.groups))
                setAllScores(s)
                if (u) setEditors(u.users.filter((x) => x.role === 'editor'))
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Could not load groups.'))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const selectGroup = async (g: MusicGroup) => {
        setSelectedId(g.id)
        setError(null)
        setForm({
            name: g.name,
            city: g.city ?? '',
            country: g.country ?? '',
            contactName: g.contactName ?? '',
            contactEmail: g.contactEmail ?? '',
            website: g.website ?? ''
        })
        setManagerIds(g.managerIds)
        try {
            const { scores } = await apiGetGroupScores(g.id)
            setRepertoire(scores)
        } catch {
            setRepertoire([])
        }
    }

    const startNew = () => {
        setSelectedId('new')
        setForm(emptyForm)
        setManagerIds([])
        setRepertoire([])
        setError(null)
    }

    const saveGroup = async () => {
        setError(null)
        setBusy(true)
        const input = {
            name: form.name.trim(),
            city: form.city || null,
            country: form.country || null,
            contactName: form.contactName || null,
            contactEmail: form.contactEmail || null,
            website: form.website || null
        }
        try {
            const group =
                selectedId === 'new'
                    ? (await apiCreateGroup(input)).group
                    : (await apiUpdateGroup(selectedId as number, input)).group
            await apiSetGroupManagers(group.id, managerIds)
            await refreshGroups()
            await selectGroup({ ...group, managerIds })
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save the group.')
        } finally {
            setBusy(false)
        }
    }

    const deleteGroup = async () => {
        if (typeof selectedId !== 'number') return
        setBusy(true)
        setError(null)
        try {
            await apiDeleteGroup(selectedId)
            await refreshGroups()
            setSelectedId(null)
            setForm(emptyForm)
            setManagerIds([])
            setRepertoire([])
            setConfirmDelete(false)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete the group.')
        } finally {
            setBusy(false)
        }
    }

    const addScore = async (scoreId: number) => {
        if (typeof selectedId !== 'number') return
        try {
            await apiAddGroupScore(selectedId, scoreId)
            const sc = allScores.find((s) => s.id === scoreId)
            if (sc)
                setRepertoire((prev) =>
                    [...prev, { id: sc.id, uuid: sc.uuid, title: sc.title, instrument_set: sc.instrument_set }].sort(
                        (a, b) => a.title.localeCompare(b.title)
                    )
                )
            void refreshGroups()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not add the score.')
        }
    }

    const removeScore = async (scoreId: number) => {
        if (typeof selectedId !== 'number') return
        try {
            await apiRemoveGroupScore(selectedId, scoreId)
            setRepertoire((prev) => prev.filter((s) => s.id !== scoreId))
            void refreshGroups()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove the score.')
        }
    }

    const editorOptions = editors.map((e) => ({ label: `${e.name || e.email} (${e.email})`, value: e.id }))
    const repertoireIds = new Set(repertoire.map((s) => s.id))
    const addableScores = allScores.filter((s) => !repertoireIds.has(s.id)).map((s) => ({ label: s.title, value: s.id }))
    const isExisting = typeof selectedId === 'number'
    const editing = selectedId !== null

    return (
        <Drawer open={open} size="md" onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>Manage music groups</Drawer.Title>
                <Drawer.Actions>
                    <Button appearance="subtle" onClick={onClose}>
                        Close
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                {error && (
                    <Message type="error" showIcon className="mb-3">
                        {error}
                    </Message>
                )}
                <div className="flex gap-4">
                    <div className="w-56 shrink-0 flex flex-col gap-2">
                        {isAdmin && (
                            <Button appearance="primary" onClick={startNew} block>
                                New group
                            </Button>
                        )}
                        <List bordered hover className="max-h-[70vh] overflow-auto">
                            {groups.map((g) => (
                                <List.Item
                                    key={g.id}
                                    onClick={() => selectGroup(g)}
                                    className={`cursor-pointer ${selectedId === g.id ? 'bg-blue-50' : ''}`}>
                                    <div className="truncate">{g.name}</div>
                                    <div className="text-xs text-gray-500">{g.scoreCount} score(s)</div>
                                </List.Item>
                            ))}
                            {groups.length === 0 && (
                                <List.Item>{isAdmin ? 'No groups yet.' : 'No groups to manage.'}</List.Item>
                            )}
                        </List>
                    </div>

                    <div className="flex-1 min-w-0">
                        {!editing ? (
                            <div className="text-gray-500">
                                {isAdmin ? 'Select a group or create a new one.' : 'Select a group to edit its repertoire.'}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {isAdmin ? (
                                    <>
                                        <Field label="Name">
                                            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                                        </Field>
                                        <div className="flex gap-2">
                                            <Field label="City" className="flex-1">
                                                <Input value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                                            </Field>
                                            <Field label="Country" className="flex-1">
                                                <Input
                                                    value={form.country}
                                                    onChange={(v) => setForm({ ...form, country: v })}
                                                />
                                            </Field>
                                        </div>
                                        <Field label="Contact name">
                                            <Input
                                                value={form.contactName}
                                                onChange={(v) => setForm({ ...form, contactName: v })}
                                            />
                                        </Field>
                                        <div className="flex gap-2">
                                            <Field label="Contact email" className="flex-1">
                                                <Input
                                                    value={form.contactEmail}
                                                    onChange={(v) => setForm({ ...form, contactEmail: v })}
                                                />
                                            </Field>
                                            <Field label="Website" className="flex-1">
                                                <Input
                                                    value={form.website}
                                                    onChange={(v) => setForm({ ...form, website: v })}
                                                />
                                            </Field>
                                        </div>
                                        <Field label="Managers (editors)">
                                            <CheckPicker
                                                data={editorOptions}
                                                value={managerIds}
                                                onChange={setManagerIds}
                                                block
                                                placeholder={editorOptions.length ? 'None' : 'No editors exist'}
                                                disabled={!editorOptions.length}
                                            />
                                        </Field>
                                        <div className="flex gap-2">
                                            <Button
                                                appearance="primary"
                                                onClick={saveGroup}
                                                loading={busy}
                                                disabled={!form.name.trim()}>
                                                Save
                                            </Button>
                                            {isExisting && (
                                                <Button
                                                    appearance="ghost"
                                                    color="red"
                                                    onClick={() => setConfirmDelete(true)}
                                                    disabled={busy}>
                                                    Delete group…
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-base font-medium">{form.name}</div>
                                )}

                                {isExisting ? (
                                    <div className="mt-2">
                                        <div className="text-sm font-medium mb-1">Repertoire</div>
                                        <SelectPicker
                                            data={addableScores}
                                            value={null}
                                            onChange={(v) => {
                                                if (v != null) addScore(v)
                                            }}
                                            block
                                            placeholder="Add a score…"
                                        />
                                        <List bordered className="mt-2 max-h-64 overflow-auto">
                                            {repertoire.length === 0 && <List.Item>No scores yet.</List.Item>}
                                            {repertoire.map((s) => (
                                                <List.Item key={s.id}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="truncate">{s.title}</span>
                                                        <IconButton
                                                            size="xs"
                                                            appearance="subtle"
                                                            color="red"
                                                            icon={<BsTrash />}
                                                            aria-label={`Remove ${s.title}`}
                                                            onClick={() => removeScore(s.id)}
                                                        />
                                                    </div>
                                                </List.Item>
                                            ))}
                                        </List>
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-500">
                                        Save the group first to edit its repertoire.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <Modal open={confirmDelete} size="xs" onClose={() => setConfirmDelete(false)}>
                    <Modal.Header>
                        <Modal.Title>Delete group</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Delete <b>{form.name}</b>? Its repertoire links and subscriptions are removed. The scores
                        themselves are not deleted.
                    </Modal.Body>
                    <Modal.Footer>
                        <Button appearance="subtle" onClick={() => setConfirmDelete(false)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button appearance="primary" color="red" onClick={deleteGroup} loading={busy}>
                            Delete
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Drawer.Body>
        </Drawer>
    )
}
