-- The partner's voice is fixed per language (PARTNER_VOICES, server/speech.ts), so conversations no longer store one.
ALTER TABLE conversations DROP COLUMN voice;
