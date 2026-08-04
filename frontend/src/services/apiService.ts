const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include', // sends httpOnly cookies automatically
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })

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
