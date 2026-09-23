CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  prefs TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
) STRICT;

CREATE TABLE attempts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL,
  unit_rev INTEGER NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('learn', 'mistakes', 'review')),
  path TEXT NOT NULL,
  hints_level TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('clean', 'hinted', 'corrected', 'revealed')),
  wrong_submissions INTEGER NOT NULL,
  hints_used INTEGER NOT NULL,
  replays INTEGER NOT NULL,
  accent_slips INTEGER NOT NULL,
  submissions TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX attempts_user ON attempts(user_id, created_at);

CREATE TABLE lesson_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  path TEXT NOT NULL,
  next_index INTEGER NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (user_id, lesson_id, path)
) STRICT;

CREATE TABLE mistakes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL,
  language TEXT NOT NULL,
  first_wrong_at TEXT NOT NULL,
  last_wrong_at TEXT NOT NULL,
  wrong_count INTEGER NOT NULL,
  last_answer TEXT,
  categories TEXT NOT NULL,
  clean_streak INTEGER NOT NULL DEFAULT 0,
  removed_at TEXT,
  PRIMARY KEY (user_id, unit_id)
) STRICT;

CREATE TABLE review_cards (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL,
  language TEXT NOT NULL,
  due TEXT NOT NULL,
  card TEXT NOT NULL,
  PRIMARY KEY (user_id, unit_id)
) STRICT;
CREATE INDEX review_cards_due ON review_cards(user_id, language, due);

CREATE TABLE explanations (
  id INTEGER PRIMARY KEY,
  unit_id TEXT NOT NULL,
  unit_rev INTEGER NOT NULL,
  answer_key TEXT NOT NULL,
  model TEXT NOT NULL,
  categories TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (unit_id, unit_rev, answer_key, model)
) STRICT;

CREATE TABLE explain_usage (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
) STRICT;
