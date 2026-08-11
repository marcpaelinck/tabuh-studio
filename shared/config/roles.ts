/**
 * User roles. Use these types and constants throughout the application.
 */

export type UserRole = 'viewer' | 'editor' | 'admin'
export type UserRoleDetails = { name: string; level: number }

export const userRoles: Record<UserRole, UserRoleDetails> = {
    viewer: { name: 'Viewer', level: 0 },
    editor: { name: 'Editor', level: 10 },
    admin: { name: 'Admin', level: 99 }
}
