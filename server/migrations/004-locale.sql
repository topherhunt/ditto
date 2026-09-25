-- The UI language, which also picks the support language of translations and glosses (see supportLocale).
ALTER TABLE users ADD COLUMN locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'es-419', 'nl', 'it'));

-- Explanations are written in the learner's UI language, so the cache is keyed by it too. Existing ones are English.
CREATE TABLE explanations_new (
  id INTEGER PRIMARY KEY,
  unit_id TEXT NOT NULL,
  unit_rev INTEGER NOT NULL,
  answer_key TEXT NOT NULL,
  model TEXT NOT NULL,
  locale TEXT NOT NULL,
  categories TEXT NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (unit_id, unit_rev, answer_key, model, locale)
) STRICT;
INSERT INTO explanations_new (id, unit_id, unit_rev, answer_key, model, locale, categories, summary, details, created_at)
  SELECT id, unit_id, unit_rev, answer_key, model, 'en', categories, summary, details, created_at FROM explanations;
DROP TABLE explanations;
ALTER TABLE explanations_new RENAME TO explanations;
