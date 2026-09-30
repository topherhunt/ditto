-- A learner's recording is transcribed and discarded, so audio_file is null except on admins' own attempts. SQLite can't drop NOT NULL, so the table is rebuilt.
CREATE TABLE conversation_attempts_new (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  turn_id INTEGER NOT NULL REFERENCES conversation_turns(id) ON DELETE CASCADE,
  retry INTEGER NOT NULL,
  target TEXT NOT NULL,
  transcript TEXT NOT NULL,
  verdict TEXT NOT NULL,
  passed INTEGER NOT NULL,
  audio_file TEXT,
  report_note TEXT,
  reported_at TEXT,
  created_at TEXT NOT NULL,
  target_audio_file TEXT
) STRICT;
INSERT INTO conversation_attempts_new (id, conversation_id, turn_id, retry, target, transcript, verdict, passed, audio_file, report_note, reported_at, created_at, target_audio_file)
  SELECT id, conversation_id, turn_id, retry, target, transcript, verdict, passed, audio_file, report_note, reported_at, created_at, target_audio_file FROM conversation_attempts;
DROP TABLE conversation_attempts;
ALTER TABLE conversation_attempts_new RENAME TO conversation_attempts;
CREATE INDEX conversation_attempts_reported ON conversation_attempts(reported_at) WHERE reported_at IS NOT NULL;
