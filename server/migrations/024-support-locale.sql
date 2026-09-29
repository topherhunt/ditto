-- support_locale: the language a course's translations were last shown in, used while the UI locale is one the course
-- lacks (see supportFor in server/auth.ts). Existing rows get what the learner sees today, from SUPPORT_LOCALES as of now.
CREATE TABLE learning_languages_new (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'it', 'nl', 'ga')),
  support_locale TEXT NOT NULL CHECK (support_locale IN ('en', 'es-419', 'nl', 'it')),
  UNIQUE (user_id, language)
) STRICT;

INSERT INTO learning_languages_new (rowid, user_id, language, support_locale)
  SELECT l.rowid, l.user_id, l.language, CASE
    WHEN (l.language = 'en' AND u.locale IN ('es-419', 'it', 'nl')) OR (l.language = 'it' AND u.locale IN ('en', 'es-419', 'nl'))
      OR (l.language = 'nl' AND u.locale IN ('en', 'es-419')) OR (l.language = 'ga' AND u.locale = 'en') THEN u.locale
    WHEN l.language = 'en' THEN 'es-419'
    ELSE 'en'
  END
  FROM learning_languages l JOIN users u ON u.id = l.user_id;

DROP TABLE learning_languages;
ALTER TABLE learning_languages_new RENAME TO learning_languages;
