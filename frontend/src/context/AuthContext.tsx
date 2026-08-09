import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
    apiDeleteAccount,
    apiLogin,
    apiLogout,
    apiMe,
    apiRefreshToken,
    apiSavePreferences,
    apiUpdateProfile,
    setAuthExpiredHandler
} from '../services/apiService'
import { useUserSelectionStore } from '../stores/useUserSettingsStore'
import type { UserPreferences } from '../typing/preferences'

export interface AuthUser {
    id: number
    firstName: string
    lastName: string
    name: string
    email: string
    role: string
    preferences: UserPreferences
}

interface AuthContextValue {
    user: AuthUser | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    updateProfile: (firstName: string, lastName: string) => Promise<void>
    deleteAccount: (password: string) => Promise<void>
    updatePreferences: (preferences: UserPreferences) => Promise<void>
    isEditor: boolean
    isAdmin: boolean
}

// Applies the "activated on login" preferences to the live selection store. Only the settings
// that are live selections are seeded here; `defaultScoreFilter` (Open drawer) and
// `defaultFocusByOrchestra` (applied per score-open) are read at their own use-sites.
function seedSelectionsFromPreferences(prefs: UserPreferences | undefined) {
    if (!prefs) return
    const s = useUserSelectionStore.getState()
    if (prefs.defaultCursorStyle) s.setSelectedCursorStyle(prefs.defaultCursorStyle)
    if (prefs.defaultKeyboard) s.setKeyboard(prefs.defaultKeyboard)
    if (typeof prefs.notationVisibleByDefault === 'boolean') s.setNotationVisible(prefs.notationVisibleByDefault)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // On mount, silently refresh the access token from the refresh-token cookie, then load
    // the user via /me so the session (name / email / role) is restored without a new login.
    useEffect(() => {
        apiRefreshToken()
            .then(() => apiMe())
            .then(({ user }) => {
                setUser(user)
                // Phase 1: seed on restore too (no local session persistence yet). Phase 3 will
                // make a silent restore defer to the locally persisted session instead.
                seedSelectionsFromPreferences(user.preferences)
            })
            .catch(() => {
                // No valid session — the user needs to log in.
            })
            .finally(() => setIsLoading(false))
    }, [])

    // When a request 401s and the token refresh also fails, the session is really gone:
    // reflect that in the UI so the user is prompted to log in again.
    useEffect(() => {
        setAuthExpiredHandler(() => setUser(null))
        return () => setAuthExpiredHandler(null)
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        const { user } = await apiLogin(email, password)
        setUser(user)
        seedSelectionsFromPreferences(user.preferences)
    }, [])

    const logout = useCallback(async () => {
        await apiLogout()
        setUser(null)
    }, [])

    const updateProfile = useCallback(async (firstName: string, lastName: string) => {
        const { user } = await apiUpdateProfile(firstName, lastName)
        setUser(user)
    }, [])

    const deleteAccount = useCallback(async (password: string) => {
        await apiDeleteAccount(password)
        setUser(null)
    }, [])

    // Save preferences, reflect them on the user, and apply them immediately so the change is
    // visible without a re-login.
    const updatePreferences = useCallback(async (preferences: UserPreferences) => {
        await apiSavePreferences(preferences)
        setUser((prev) => (prev ? { ...prev, preferences } : prev))
        seedSelectionsFromPreferences(preferences)
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                logout,
                updateProfile,
                deleteAccount,
                updatePreferences,
                isEditor: user?.role === 'editor' || user?.role === 'admin',
                isAdmin: user?.role === 'admin'
            }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
