-- The languages a learner studies, in the order they added them (rowid). The nav lists only these; hiding one keeps its progress.
CREATE TABLE learning_languages (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'it', 'nl', 'ga')),
  UNIQUE (user_id, language)
) STRICT;

-- Existing learners keep every language they have practiced; one with no activity picks a language at next sign-in.
INSERT INTO learning_languages (user_id, language)
  SELECT user_id, substr(course_id, 1, instr(course_id, '-') - 1) FROM attempts
  UNION SELECT user_id, language FROM level_passes
  UNION SELECT user_id, language FROM conversations
  UNION SELECT c.user_id, d.language FROM quiz_cards c JOIN quiz_decks d ON d.id = c.deck_id;
