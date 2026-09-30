-- A "Why?" explanation belongs to the learner who asked, on their notebook entry, and is deleted with their account.
-- JSON {rev, locale, answerKey, categories, summary, details}; shown only while rev, locale and answer still match.
ALTER TABLE mistakes ADD COLUMN explanation TEXT;
DROP TABLE explanations;
