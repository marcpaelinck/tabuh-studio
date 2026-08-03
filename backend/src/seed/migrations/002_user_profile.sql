-- Migration 002 — user profile feature (phase 2)
-- Run once against the existing database. Safe to run inside a transaction on a backup first.

-- 1. Split the single `name` column into first_name / last_name.
--    Existing names are copied into first_name (best-effort; last_name left empty).
ALTER TABLE users
  ADD COLUMN first_name VARCHAR(100) NOT NULL DEFAULT '' AFTER email,
  ADD COLUMN last_name  VARCHAR(100) NOT NULL DEFAULT '' AFTER first_name;

UPDATE users SET first_name = COALESCE(name, '') WHERE first_name = '';

-- Drop the old UNIQUE index on `name` if one exists, then the column.
-- (If `name` was not UNIQUE, the DROP INDEX line can be omitted.)
-- ALTER TABLE users DROP INDEX name;
ALTER TABLE users DROP COLUMN name;

-- 2. Roles: add `viewer`, migrate existing `public` users to `viewer`, drop `public`,
--    and make `viewer` the default. Also add updated_at.
ALTER TABLE users MODIFY COLUMN role ENUM('public','viewer','editor','admin') NOT NULL DEFAULT 'viewer';
UPDATE users SET role = 'viewer' WHERE role = 'public';
ALTER TABLE users MODIFY COLUMN role ENUM('viewer','editor','admin') NOT NULL DEFAULT 'viewer';

ALTER TABLE users
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. Token store for email verification / password reset / email change.
CREATE TABLE auth_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  type        ENUM('verify_email','reset_password','change_email') NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  payload     JSON NULL,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_tokens_hash (token_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
