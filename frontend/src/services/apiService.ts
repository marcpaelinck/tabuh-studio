import type { UserPreferences } from '../typing/preferences'

const API_BASE = '/api'

// Called when a request fails with 401 AND a token refresh could not recover the session
// (i.e. the refresh token is gone/expired). AuthContext registers this to clear the user.
let onAuthExpired: (() => void) | null = null
export function setAuthExpiredHandler(handler: (() => void) | null) {
    onAuthExpired = handler
}

// De-duplicated access-token refresh: many requests can 401 at once (e.g. after 15 min idle),
// but they should trigger only a single /auth/refresh. Concurrent callers share this promise.
let refreshPromise: Promise<boolean> | null = null
function refreshAccessToken(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
            .then((r) => r.ok)
            .catch(() => false)
            .finally(() => {
                refreshPromise = null
            })
    }
    return refreshPromise
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include', // sends httpOnly cookies automatically
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })

    // Access tokens live ~15 min; on the first 401 for a protected call, silently refresh and
    // replay the request once. `/auth/refresh` and `/auth/login` are excluded: a 401 there is
    // terminal (and refreshing on /auth/refresh would recurse).
    if (response.status === 401 && !retried && path !== '/auth/refresh' && path !== '/auth/login') {
        if (await refreshAccessToken()) return request<T>(path, options, true)
        // Refresh failed → the session is genuinely gone; let AuthContext react.
        onAuthExpired?.()
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error ?? 'Request failed')
    }

    // 204 No Content has no body
    if (response.status === 204) return undefined as T

    return response.json()
}

// ── General Info ──────────────────────────────────────────────────────
export async function apiVersion() {
    return request<{ version: string }>('/version')
}

// ── Auth ──────────────────────────────────────────────────────

export interface ApiUser {
    id: number
    firstName: string
    lastName: string
    name: string
    email: string
    role: string
    preferences: UserPreferences
}

export async function apiLogin(email: string, password: string) {
    return request<{ user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    })
}

export async function apiLogout() {
    return request('/auth/logout', { method: 'POST' })
}

export async function apiRefreshToken() {
    return request('/auth/refresh', { method: 'POST' })
}

export async function apiMe() {
    return request<{ user: ApiUser }>('/auth/me')
}

export async function apiRegister(firstName: string, lastName: string, email: string, password: string) {
    return request<{ ok: true }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, password })
    })
}

export async function apiVerifyEmail(token: string) {
    return request<{ ok: true; email: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
    })
}

export async function apiUpdateProfile(firstName: string, lastName: string) {
    return request<{ user: ApiUser }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName, lastName })
    })
}

export async function apiChangeEmail(newEmail: string) {
    return request<{ ok: true }>('/auth/change-email', {
        method: 'POST',
        body: JSON.stringify({ newEmail })
    })
}

export async function apiConfirmEmailChange(token: string) {
    return request<{ ok: true; email: string }>('/auth/confirm-email-change', {
        method: 'POST',
        body: JSON.stringify({ token })
    })
}

export async function apiChangePassword(currentPassword: string, newPassword: string) {
    return request<{ ok: true }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
    })
}

export async function apiForgotPassword(email: string) {
    return request<{ ok: true }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
    })
}

export async function apiResetPassword(token: string, newPassword: string) {
    return request<{ ok: true }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
    })
}

export async function apiDeleteAccount(password: string) {
    return request<{ ok: true }>('/auth/delete-account', {
        method: 'POST',
        body: JSON.stringify({ password })
    })
}

export async function apiSavePreferences(preferences: UserPreferences) {
    return request<{ preferences: UserPreferences }>('/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
    })
}

// ── Admin: manage users ───────────────────────────────────────────────

export interface AdminUser {
    id: number
    firstName: string
    lastName: string
    name: string
    email: string
    role: string
    createdAt: string
}

export async function apiListUsers() {
    return request<{ users: AdminUser[] }>('/auth/users')
}

export async function apiSetUserRole(id: number, role: string) {
    return request<{ ok: true }>(`/auth/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
    })
}

export async function apiDeleteUser(id: number) {
    return request<{ ok: true }>(`/auth/users/${id}`, { method: 'DELETE' })
}

// ── Scores ────────────────────────────────────────────────────
// Scores are addressed by their uuid (the stable identity shared with the score
// JSON content and the .tsv notation files), not by the numeric primary key.

export interface ScoreListItem {
    id: number
    title: string
    uuid: string
    instrument_set: string
    owner_email: string
    created_at: string
    /** Ids of the music groups whose repertoire includes this score. */
    groups: number[]
}

export async function apiGetEnvironment(): Promise<{ environment: string } | undefined> {
    return request<{ environment: string }>('/environment')
}

export interface ScoreRecord extends ScoreListItem {
    content: unknown // full score JSON — cast to Score in the hook
}

export async function apiGetScores(): Promise<ScoreListItem[]> {
    return request<ScoreListItem[]>('/scores')
}

export async function apiGetScore(uuid: string): Promise<ScoreRecord> {
    return request<ScoreRecord>(`/scores/${uuid}`)
}

export async function apiCreateScore(title: string, instrument_set: string, content: unknown): Promise<ScoreRecord> {
    return request<ScoreRecord>('/scores', { method: 'POST', body: JSON.stringify({ title, instrument_set, content }) })
}

export async function apiUpdateScore(
    uuid: string,
    updates: Partial<{ title: string; instrument_set: string; content: unknown }>
): Promise<ScoreRecord> {
    return request<ScoreRecord>(`/scores/${uuid}`, { method: 'PATCH', body: JSON.stringify(updates) })
}

export async function apiDeleteScore(uuid: string): Promise<void> {
    return request<void>(`/scores/${uuid}`, { method: 'DELETE' })
}

// ── Music groups ──────────────────────────────────────────────────────

export interface MusicGroup {
    id: number
    name: string
    city: string | null
    country: string | null
    contactName: string | null
    contactEmail: string | null
    website: string | null
    managerIds: number[]
    scoreCount: number
    /** True when the current user may manage this group (admin, or a listed manager). */
    managedByMe?: boolean
}

export interface GroupInput {
    name: string
    city?: string | null
    country?: string | null
    contactName?: string | null
    contactEmail?: string | null
    website?: string | null
}

export interface GroupScore {
    id: number
    uuid: string
    title: string
    instrument_set: string
}

export async function apiListGroups() {
    return request<{ groups: MusicGroup[] }>('/groups')
}

export async function apiCreateGroup(input: GroupInput) {
    return request<{ group: MusicGroup }>('/groups', { method: 'POST', body: JSON.stringify(input) })
}

export async function apiUpdateGroup(id: number, input: Partial<GroupInput>) {
    return request<{ group: MusicGroup }>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function apiDeleteGroup(id: number) {
    return request<void>(`/groups/${id}`, { method: 'DELETE' })
}

export async function apiSetGroupManagers(id: number, userIds: number[]) {
    return request<{ ok: true }>(`/groups/${id}/managers`, { method: 'PUT', body: JSON.stringify({ userIds }) })
}

export async function apiGetGroupScores(id: number) {
    return request<{ scores: GroupScore[] }>(`/groups/${id}/scores`)
}

export async function apiAddGroupScore(id: number, scoreId: number) {
    return request<{ ok: true }>(`/groups/${id}/scores`, { method: 'POST', body: JSON.stringify({ scoreId }) })
}

export async function apiRemoveGroupScore(id: number, scoreId: number) {
    return request<void>(`/groups/${id}/scores/${scoreId}`, { method: 'DELETE' })
}

export async function apiGetGroupsForScore(uuid: string) {
    return request<{ groups: { id: number; name: string }[] }>(`/groups/for-score/${uuid}`)
}

export async function apiGetSubscriptions() {
    return request<{ groupIds: number[] }>('/auth/subscriptions')
}

export async function apiSetSubscriptions(groupIds: number[]) {
    return request<{ groupIds: number[] }>('/auth/subscriptions', {
        method: 'PUT',
        body: JSON.stringify({ groupIds })
    })
}
