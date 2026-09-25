-- `accept` reports carry the learner's answer that was graded wrong; no other kind has one. SQLite can't alter a CHECK, so the table is rebuilt.
CREATE TABLE reports_new (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL,
  unit_rev INTEGER NOT NULL,
  language TEXT NOT NULL,
  text TEXT NOT NULL,
  voice TEXT NOT NULL,
  audio_file TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'text', 'translation', 'accept', 'other')),
  answer TEXT,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  CHECK ((kind = 'accept') = (answer IS NOT NULL))
) STRICT;
INSERT INTO reports_new (id, user_id, unit_id, unit_rev, language, text, voice, audio_file, kind, note, created_at, resolved_at)
  SELECT id, user_id, unit_id, unit_rev, language, text, voice, audio_file, kind, note, created_at, resolved_at FROM reports;
DROP TABLE reports;
ALTER TABLE reports_new RENAME TO reports;
