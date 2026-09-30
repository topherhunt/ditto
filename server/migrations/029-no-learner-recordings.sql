-- Learners' recordings are transcribed and never stored, so nothing names them any more. The old files in SPEAK_AUDIO_DIR
-- (every one not ending in .wav) exist only on dev machines, since production never ran conversation mode before this:
-- find data/speak-audio -type f ! -name '*.wav' -delete
ALTER TABLE conversation_attempts DROP COLUMN audio_file;
UPDATE conversation_turns SET audio_file = NULL WHERE role = 'learner';
