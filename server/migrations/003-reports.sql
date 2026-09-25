-- Problems learners flag on a unit, kept for review and re-rendering. voice and audio_file identify the clip that played.
CREATE TABLE reports (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL,
  unit_rev INTEGER NOT NULL,
  language TEXT NOT NULL,
  text TEXT NOT NULL,
  voice TEXT NOT NULL,
  audio_file TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'text', 'translation', 'other')),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
) STRICT;
