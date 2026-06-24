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

// ── Auth ──────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string) {
    return request<{ user: { id: number; name: string; email: string; role: string } }>('/auth/login', {
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
