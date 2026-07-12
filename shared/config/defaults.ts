/**
 * Shared default values used when creating new scores / systems.
 *
 * Kept in the shared package so the frontend (and, later, the backend or import
 * scripts) build brand-new content from a single source of truth.
 */

// Default kempli setting for a brand-new system created from scratch (a from-scratch
// score has no existing system to inherit from). Structurally matches the frontend
// `KempliSetting` type; kept as a plain object so shared has no frontend dependency.
export const DEFAULT_KEMPLI = { state: 'on', frequency: 4 } as const
