CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  first_name    VARCHAR(100) NOT NULL DEFAULT '',
  last_name     VARCHAR(100) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('viewer','editor','admin') NOT NULL DEFAULT 'viewer',
  -- Bumped whenever all of a user's sessions should be invalidated (password reset/change).
  -- Embedded as the `tv` claim in JWTs and re-checked at /refresh.
  token_version INT NOT NULL DEFAULT 0,
  -- Per-user app preferences (defaults applied on login). See CLAUDE.user-settings.md.
  preferences   JSON NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Short-lived, single-use tokens for email verification / password reset / email change.
-- `user_id` is NULL for a pending registration (the users row is only created on confirmation);
-- `payload` then holds the pending signup data (first/last name, email, password_hash).
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

CREATE TABLE instrument_sets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  tuning     JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scores (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  owner_id       INT NOT NULL,
  instrument_set VARCHAR(100) NOT NULL,
  title          VARCHAR(200) NOT NULL,
  uuid           CHAR(36) NOT NULL UNIQUE,
  content        JSON NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE score_permissions (
  score_id  INT NOT NULL,
  user_id   INT NOT NULL,
  can_edit  TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (score_id, user_id),
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

CREATE INDEX idx_scores_owner ON scores(owner_id);
CREATE INDEX idx_score_permissions_user ON score_permissions(user_id);

-- Music groups (bands) with their repertoire, per-group editor managers, and user subscriptions.
CREATE TABLE music_groups (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL UNIQUE,
  city          VARCHAR(150) NULL,
  country       VARCHAR(150) NULL,
  contact_name  VARCHAR(150) NULL,
  contact_email VARCHAR(255) NULL,
  website       VARCHAR(255) NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Repertoire: which scores belong to a group.
CREATE TABLE group_scores (
  group_id INT NOT NULL,
  score_id INT NOT NULL,
  PRIMARY KEY (group_id, score_id),
  FOREIGN KEY (group_id) REFERENCES music_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (score_id) REFERENCES scores(id)        ON DELETE CASCADE
);

-- Which editors may manage a group's repertoire/managers (admins manage all implicitly).
CREATE TABLE group_managers (
  group_id INT NOT NULL,
  user_id  INT NOT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES music_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE
);

-- Which groups a user subscribes to (drives the score-list filter).
CREATE TABLE user_group_subscriptions (
  user_id  INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES music_groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_group_scores_score ON group_scores(score_id);
CREATE INDEX idx_user_group_subs_user ON user_group_subscriptions(user_id);