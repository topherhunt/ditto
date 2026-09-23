-- NULL when the unit has no translation to check (English).
ALTER TABLE attempts ADD COLUMN meaning_correct INTEGER CHECK (meaning_correct IN (0, 1));

-- The translation is now shown after the meaning check, so the pref is gone; stored prefs are parsed strictly.
UPDATE users SET prefs = json_remove(prefs, '$.en.showTranslation', '$.it.showTranslation', '$.nl.showTranslation');
