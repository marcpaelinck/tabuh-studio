-- Migration 003 — session invalidation on password change/reset. Backend version 1.1.1
-- `token_version` is embedded as the `tv` claim in JWTs and re-checked at /auth/refresh;
-- bumping it invalidates all outstanding sessions for that user.

ALTER TABLE users
  ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER role;
