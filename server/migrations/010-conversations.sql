-- Conversation mode (docs/conversation.md). Audio files live in the conversation audio dir, named by the rows below.
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  -- The support language of glosses and the title.
  locale TEXT NOT NULL,
  -- The learner's CEFR level; the partner speaks one notch above it.
  level TEXT NOT NULL,
  scenario TEXT NOT NULL,
  title TEXT NOT NULL,
  hard_mode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX conversations_user ON conversations(user_id, updated_at);

-- partner turns carry chunks and suggestions (JSON); learner turns carry source and taps; both carry level (the CEFR grade of the line).
CREATE TABLE conversation_turns (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('partner', 'learner')),
  text TEXT NOT NULL,
  chunks TEXT,
  suggestions TEXT,
  audio_file TEXT,
  source TEXT CHECK (source IN ('suggestion', 'own', 'how', 'moved_on')),
  level TEXT,
  taps INTEGER,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX conversation_turns_conversation ON conversation_turns(conversation_id, id);

-- Every recorded reply the coach judged. target is the sentence it was judged against: what the coach thought was meant
-- on a first try, the retry screen's sentence on a retry. verdict is the coach's JSON.
CREATE TABLE conversation_attempts (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  -- The partner turn being answered.
  turn_id INTEGER NOT NULL REFERENCES conversation_turns(id) ON DELETE CASCADE,
  retry INTEGER NOT NULL,
  target TEXT NOT NULL,
  transcript TEXT NOT NULL,
  heard TEXT NOT NULL,
  want TEXT NOT NULL,
  native TEXT NOT NULL,
  verdict TEXT NOT NULL,
  passed INTEGER NOT NULL,
  audio_file TEXT NOT NULL,
  report_note TEXT,
  reported_at TEXT,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX conversation_attempts_reported ON conversation_attempts(reported_at) WHERE reported_at IS NOT NULL;

-- Phrases the learner moved on from after failing the coach too often.
CREATE TABLE weak_phrases (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  text TEXT NOT NULL,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
) STRICT;

-- Every paid API call, costed from the price table in server/usage.ts.
CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  audio_seconds REAL NOT NULL,
  cost_usd REAL NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX api_usage_user ON api_usage(user_id, created_at);
