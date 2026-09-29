-- The latest signed-in request, stamped at most every few minutes (LAST_SEEN_EVERY_MS, server/app.ts). Shown on /admin/users.
ALTER TABLE users ADD COLUMN last_seen_at TEXT;

-- Existing accounts start from their latest sign-in or practice.
UPDATE users SET last_seen_at = (
  SELECT max(at) FROM (
    SELECT created_at AS at FROM sessions WHERE user_id = users.id
    UNION ALL SELECT created_at FROM attempts WHERE user_id = users.id
    UNION ALL SELECT updated_at FROM quiz_sessions WHERE user_id = users.id
    UNION ALL SELECT updated_at FROM conversations WHERE user_id = users.id
  )
);
