CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('public','editor','admin') NOT NULL DEFAULT 'public',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
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