-- The coach no longer compares against the recognizer's hearing of a TTS voice.
ALTER TABLE conversation_attempts DROP COLUMN native;
