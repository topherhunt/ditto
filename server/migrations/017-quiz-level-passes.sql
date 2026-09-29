-- Quiz levels a learner finished: by graduating 90% of the level's questions ('progress') or by a perfect test-out ('test').
-- A pass unlocks the next level and stays, even if cards later lapse.
CREATE TABLE quiz_level_passes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  how TEXT NOT NULL CHECK (how IN ('progress', 'test')),
  passed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, language, level)
) STRICT;
