-- Greek (el) becomes a learnable language.
CREATE TABLE learning_languages_new (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'el', 'es', 'fr', 'it', 'nl', 'ga')),
  UNIQUE (user_id, language)
) STRICT;

INSERT INTO learning_languages_new (rowid, user_id, language) SELECT rowid, user_id, language FROM learning_languages;

DROP TABLE learning_languages;
ALTER TABLE learning_languages_new RENAME TO learning_languages;
