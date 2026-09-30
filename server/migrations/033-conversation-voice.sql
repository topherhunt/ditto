-- The partner's voice (a voiceId from server/content.ts), picked at random when the conversation starts. Earlier conversations keep the voice their language used.
ALTER TABLE conversations ADD COLUMN voice TEXT NOT NULL DEFAULT '';
UPDATE conversations SET voice = CASE language WHEN 'nl' THEN 'openai:cedar' WHEN 'en' THEN 'openai:cedar' ELSE 'openai:marin' END;
