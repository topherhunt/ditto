-- Greek (el) becomes a UI language. SQLite can't alter a CHECK, and rebuilding users would cascade through its foreign keys, so
-- the column is replaced instead.
ALTER TABLE users ADD COLUMN locale_new TEXT NOT NULL DEFAULT 'en' CHECK (locale_new IN ('en', 'es-419', 'nl', 'it', 'el'));
UPDATE users SET locale_new = locale;
ALTER TABLE users DROP COLUMN locale;
ALTER TABLE users RENAME COLUMN locale_new TO locale;
