import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiLogin, apiLogout, apiMe, apiRefreshToken } from '../services/apiService'

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

    // On mount, silently refresh the access token from the refresh-token cookie, then load
    // the user via /me so the session (name / email / role) is restored without a new login.
    useEffect(() => {
        apiRefreshToken()
            .then(() => apiMe())
            .then(({ user }) => setUser(user))
            .catch(() => {
                // No valid session — the user needs to log in.
            })
            .finally(() => setIsLoading(false))
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
