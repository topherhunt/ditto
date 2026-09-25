-- Levels a learner tested out of: every course in the level is unlocked, but no lesson counts as complete.
CREATE TABLE level_passes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  passed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, language, level)
) STRICT;
