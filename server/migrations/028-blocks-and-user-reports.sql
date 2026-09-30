-- Any account can block any other. Silent: a request the blocked account sends stays pending for them and never reaches
-- the blocker. Blocks used to live on the blocked account's friend request; those requests go back to plain pending.
CREATE TABLE blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
) STRICT;
CREATE INDEX blocks_blocked ON blocks(blocked_id);
INSERT INTO blocks (blocker_id, blocked_id, created_at)
  SELECT addressee_id, requester_id, coalesce(responded_at, created_at) FROM friendships WHERE status = 'blocked';
UPDATE friendships SET status = 'pending', responded_at = NULL WHERE status = 'blocked';

-- A learner reporting another. Their username and board blurb are copied as they were, since both can change.
CREATE TABLE user_reports (
  id INTEGER PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('username', 'board_post', 'requests', 'other')),
  note TEXT,
  username TEXT,
  blurb TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolution TEXT CHECK (resolution IN ('took_down_post', 'cleared_username', 'dismissed')),
  CHECK ((resolved_at IS NULL) = (resolution IS NULL))
) STRICT;
CREATE UNIQUE INDEX user_reports_open ON user_reports(reporter_id, reported_id) WHERE resolved_at IS NULL;
