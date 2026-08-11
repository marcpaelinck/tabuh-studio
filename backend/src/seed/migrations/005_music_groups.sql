-- Migration 005 — music groups (phase 2 of user settings).
-- Adds groups, their repertoire, per-group managers, and user subscriptions.

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

CREATE TABLE group_scores (
  group_id INT NOT NULL,
  score_id INT NOT NULL,
  PRIMARY KEY (group_id, score_id),
  FOREIGN KEY (group_id) REFERENCES music_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (score_id) REFERENCES scores(id)        ON DELETE CASCADE
);

CREATE TABLE group_managers (
  group_id INT NOT NULL,
  user_id  INT NOT NULL,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES music_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE
);

CREATE TABLE user_group_subscriptions (
  user_id  INT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES music_groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_group_scores_score ON group_scores(score_id);
CREATE INDEX idx_user_group_subs_user ON user_group_subscriptions(user_id);
