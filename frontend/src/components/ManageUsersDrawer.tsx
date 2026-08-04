// Admin-only drawer: list every user, change a user's role, and delete a user (with a confirm
// step). The current admin's own row is locked — no self role-change or self-delete (matching
// the backend guards). All actions go through admin-guarded endpoints.

import { useEffect, useState } from 'react'
import { BsTrash } from 'react-icons/bs'
import { Button, Drawer, HStack, IconButton, List, Loader, Message, Modal, SelectPicker } from 'rsuite'
import { useAuth } from '../context/AuthContext'
import { apiDeleteUser, apiListUsers, apiSetUserRole, type AdminUser } from '../services/apiService'

const roleOptions = [
    { label: 'Viewer', value: 'viewer' },
    { label: 'Editor', value: 'editor' },
    { label: 'Admin', value: 'admin' }
]

interface ManageUsersDrawerProps {
    open: boolean
    onClose: () => void
}

export function ManageUsersDrawer({ open, onClose }: ManageUsersDrawerProps) {
    const { user } = useAuth()
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<number | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
    const [deleteBusy, setDeleteBusy] = useState(false)

    useEffect(() => {
        if (!open) return
        setError(null)
        setConfirmDelete(null)
        setLoading(true)
        apiListUsers()
            .then(({ users }) => setUsers(users))
            .catch((e) => setError(e instanceof Error ? e.message : 'Could not load users.'))
            .finally(() => setLoading(false))
    }, [open])

    const changeRole = async (u: AdminUser, role: string | null) => {
        if (!role || role === u.role) return
        setError(null)
        setBusyId(u.id)
        try {
            await apiSetUserRole(u.id, role)
            setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not change the role.')
        } finally {
            setBusyId(null)
        }
    }

    const doDelete = async () => {
        if (!confirmDelete) return
        setError(null)
        setDeleteBusy(true)
        try {
            await apiDeleteUser(confirmDelete.id)
            setUsers((prev) => prev.filter((x) => x.id !== confirmDelete.id))
            setConfirmDelete(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete the user.')
        } finally {
            setDeleteBusy(false)
        }
    }

    return (
        <Drawer open={open} size="sm" onClose={onClose}>
            <Drawer.Header>
                <Drawer.Title>Manage users</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={onClose} appearance="subtle">
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
                {loading ? (
                    <Loader content="Loading users…" />
                ) : (
                    <List bordered>
                        {users.map((u) => {
                            const isSelf = u.id === user?.id
                            return (
                                <List.Item key={u.id}>
                                    <HStack justifyContent="space-between" alignItems="center" spacing={8} className="w-full">
                                        <div className="min-w-0">
                                            <div className="truncate">
                                                {u.name || '—'} {isSelf && <span className="text-gray-400">(you)</span>}
                                            </div>
                                            <div className="text-gray-500 truncate">{u.email}</div>
                                        </div>
                                        <HStack spacing={6} alignItems="center">
                                            <SelectPicker
                                                data={roleOptions}
                                                value={u.role}
                                                cleanable={false}
                                                searchable={false}
                                                disabled={isSelf || busyId === u.id}
                                                onChange={(role) => changeRole(u, role)}
                                                style={{ width: 110 }}
                                            />
                                            <IconButton
                                                aria-label={`Delete ${u.name}`}
                                                icon={<BsTrash />}
                                                appearance="subtle"
                                                color="red"
                                                disabled={isSelf}
                                                onClick={() => setConfirmDelete(u)}
                                            />
                                        </HStack>
                                    </HStack>
                                </List.Item>
                            )
                        })}
                    </List>
                )}
            </Drawer.Body>

            <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} size="xs">
                <Modal.Header>
                    <Modal.Title>Delete user</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Permanently delete <b>{confirmDelete?.name}</b> ({confirmDelete?.email}) and all their scores? This
                    cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => setConfirmDelete(null)} appearance="subtle" disabled={deleteBusy}>
                        Cancel
                    </Button>
                    <Button onClick={doDelete} appearance="primary" color="red" loading={deleteBusy}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </Drawer>
    )
}
