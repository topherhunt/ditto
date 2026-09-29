-- The language a conversation's title is written in: the course's own with interface immersion on.
ALTER TABLE conversations ADD COLUMN ui_locale TEXT NOT NULL DEFAULT '';
UPDATE conversations SET ui_locale = locale;
