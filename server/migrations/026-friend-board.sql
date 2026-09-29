-- The "Make new friends" board: learners who opted in to be found by strangers. Retracting deletes the row.
CREATE TABLE friend_board (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  blurb TEXT,
  created_at TEXT NOT NULL
) STRICT;
