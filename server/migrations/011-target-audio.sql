-- The partner voice saying a failed attempt's target, for the retry screen's play button.
ALTER TABLE conversation_attempts ADD COLUMN target_audio_file TEXT;
