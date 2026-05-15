import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiLogin, apiLogout, apiRefreshToken } from '../services/apiService'

export interface AuthUser {
    id: number
    name: string
    email: string
    role: string
}

interface AuthContextValue {
    user: AuthUser | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    isEditor: boolean
    isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // On mount, try to refresh the token silently.
    // If the user has a valid refresh token cookie from a previous session
    // this will restore their session without requiring a new login.
    useEffect(() => {
        apiRefreshToken()
            .then(() => {
                // Refresh succeeded but we don't get user info back from /refresh.
                // We could add a /api/auth/me endpoint, or store user info in
                // localStorage as non-sensitive display data. For now we just
                // mark auth as resolved — the score list will load for everyone
                // and editor routes will be gated server-side.
                setIsLoading(false)
            })
            .catch(() => {
                // No valid session — user needs to log in
                setIsLoading(false)
            })
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        const { user } = await apiLogin(email, password)
        setUser(user)
    }, [])

    const logout = useCallback(async () => {
        await apiLogout()
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                logout,
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
