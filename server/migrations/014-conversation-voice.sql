-- The partner's voice (a voiceId from server/content.ts), picked at random when the conversation starts.
ALTER TABLE conversations ADD COLUMN voice TEXT NOT NULL DEFAULT '';
UPDATE conversations SET voice = CASE language
  WHEN 'it' THEN 'piper:it_IT-paola-medium' WHEN 'nl' THEN 'piper:nl_NL-pim-medium' WHEN 'en' THEN 'piper:en_US-amy-medium' END;
