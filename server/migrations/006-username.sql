-- The public name on leaderboards and profiles. Null until the user picks one right after first sign-in.
ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX users_username ON users (username COLLATE NOCASE);
