-- Voice ids name a slot, not an engine (server/content.ts). A report's audio_file still identifies the clip that played.
UPDATE conversations SET voice = CASE voice WHEN 'openai:marin' THEN 'f' WHEN 'openai:cedar' THEN 'm' ELSE voice END;
UPDATE reports SET voice = CASE voice WHEN 'openai:marin' THEN 'f' WHEN 'openai:cedar' THEN 'm' ELSE voice END;
