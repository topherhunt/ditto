-- users.locale is the learner's own language; immersion (users.prefs, per course) puts the UI and the AI's help in the course's
-- language instead. A learner whose locale was a language they study was immersing that way: they get immersion on for it, and
-- their locale becomes the language its translations already came in (its first support language).
UPDATE users SET
  prefs = json_patch(prefs, json_object(locale, json_object('immerseUi', json('true'), 'immerseHelp', json('true')))),
  locale = CASE locale WHEN 'en' THEN 'es-419' ELSE 'en' END
WHERE EXISTS (SELECT 1 FROM learning_languages l WHERE l.user_id = users.id AND l.language = users.locale);

ALTER TABLE learning_languages DROP COLUMN support_locale;

-- Coaching's language; locale stays the language of glosses and the title. Every insert sets it.
ALTER TABLE conversations ADD COLUMN help_locale TEXT NOT NULL DEFAULT '';
UPDATE conversations SET help_locale = locale;
