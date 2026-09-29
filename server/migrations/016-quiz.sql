-- Quiz mode (docs/quizzes.md). Preset decks (owner_id NULL) are synced from content/quizzes at boot and shared by
-- everyone; a learner's own decks will carry their owner_id.
CREATE TABLE quiz_decks (
  id TEXT PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  kind TEXT NOT NULL,
  num INTEGER NOT NULL,
  -- sha1 of the source CSV; the boot sync rewrites a preset's questions only when it changes.
  source_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX quiz_decks_language ON quiz_decks(language, owner_id);

-- id hashes the question and its answer, so edits elsewhere in a deck keep learners' progress. wrong is a JSON array.
CREATE TABLE quiz_questions (
  deck_id TEXT NOT NULL REFERENCES quiz_decks(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  correct TEXT NOT NULL,
  wrong TEXT NOT NULL,
  explanation TEXT NOT NULL,
  PRIMARY KEY (deck_id, id)
) STRICT;

-- card is ts-fsrs JSON; due, state and stability are copied out of it for queries.
CREATE TABLE quiz_cards (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  card TEXT NOT NULL,
  due TEXT NOT NULL,
  state INTEGER NOT NULL,
  stability REAL NOT NULL,
  PRIMARY KEY (user_id, deck_id, question_id),
  FOREIGN KEY (deck_id, question_id) REFERENCES quiz_questions(deck_id, id) ON DELETE CASCADE
) STRICT;

-- mastery: the deck's JSON breakdown after the latest answer, for the mastery-over-time chart.
CREATE TABLE quiz_sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES quiz_decks(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  mastery TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
CREATE INDEX quiz_sessions_user ON quiz_sessions(user_id, deck_id, started_at);

-- No FK on question_id: history outlives a reworded question, so title is kept here.
CREATE TABLE quiz_answers (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  title TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  response_ms INTEGER NOT NULL,
  prev_mastery TEXT NOT NULL,
  new_mastery TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX quiz_answers_session ON quiz_answers(session_id, id);
