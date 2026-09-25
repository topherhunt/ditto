-- One row per pair of users, in either direction. A blocked request stays pending in the requester's eyes.
CREATE TABLE friendships (
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TEXT NOT NULL,
  responded_at TEXT,
  PRIMARY KEY (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
) STRICT;
CREATE INDEX friendships_addressee ON friendships(addressee_id);

-- A race between two friends, counting lessons first completed after it starts. `most`: most lessons by ends_at.
-- `first_to`: first to `target` lessons; at ends_at the leader wins. winner_id is null for a draw.
CREATE TABLE challenges (
  id INTEGER PRIMARY KEY,
  challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('most', 'first_to')),
  days INTEGER NOT NULL,
  target INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'declined', 'cancelled', 'finished')),
  created_at TEXT NOT NULL,
  started_at TEXT,
  ends_at TEXT,
  finished_at TEXT,
  winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  CHECK ((kind = 'first_to') = (target IS NOT NULL))
) STRICT;
CREATE INDEX challenges_status ON challenges(status);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('friend_request', 'friend_accepted', 'challenge_invite', 'challenge_accepted', 'challenge_declined', 'challenge_finished')),
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  read_at TEXT
) STRICT;
CREATE INDEX notifications_user ON notifications(user_id, created_at);

-- Profiles and lesson comparisons read a user's attempts per lesson.
CREATE INDEX attempts_user_lesson ON attempts(user_id, lesson_id);
