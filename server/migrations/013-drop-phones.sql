-- Conversation mode no longer judges pronunciation, so no recognizer hearing or reference IPA is stored.
ALTER TABLE conversation_attempts DROP COLUMN heard;
ALTER TABLE conversation_attempts DROP COLUMN want;
