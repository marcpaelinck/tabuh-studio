-- Migration 004 — per-user app preferences (defaults applied on login).
-- A single JSON blob; see CLAUDE.user-settings.md for its shape.

ALTER TABLE users
  ADD COLUMN preferences JSON NULL AFTER token_version;
