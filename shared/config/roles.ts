/**
 * User roles. Use these types and constants throughout the application.
 */

export type UserRole = 'none' | 'viewer' | 'editor' | 'admin'
export type UserRoleDetails = { name: string; level: number }

export const userRoles: Record<UserRole, UserRoleDetails> = {
    none: { name: 'Logged out', level: 0 },
    viewer: { name: 'Viewer', level: 10 },
    editor: { name: 'Editor', level: 20 },
    admin: { name: 'Admin', level: 99 }
}
