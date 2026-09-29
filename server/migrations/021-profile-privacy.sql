-- Profile URLs use a random 10-character id (64-letter alphabet), so no one can step through accounts by number.
-- The trigger gives every new account one, whichever code inserts it.
ALTER TABLE users ADD COLUMN public_id TEXT;
UPDATE users SET public_id = substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1);
CREATE UNIQUE INDEX users_public_id ON users (public_id);
CREATE TRIGGER users_public_id AFTER INSERT ON users WHEN NEW.public_id IS NULL
BEGIN
  UPDATE users SET public_id = substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) || substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 1 + (random() & 63), 1) WHERE id = NEW.id;
END;

-- 0: people who aren't friends see only the username.
ALTER TABLE users ADD COLUMN profile_public INTEGER NOT NULL DEFAULT 1 CHECK (profile_public IN (0, 1));

-- Google's name and photo are never shown to anyone, so they aren't kept.
ALTER TABLE users DROP COLUMN name;
ALTER TABLE users DROP COLUMN picture;
