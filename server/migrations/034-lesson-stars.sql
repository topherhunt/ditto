-- Best star rating (1-3) per lesson; `practiced_at` is when the lesson was last practiced (any non-Master attempt, or a finished Master run), which the Master wait counts from.
CREATE TABLE lesson_stars (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 3),
  practiced_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
) STRICT;

-- Lessons completed before stars existed keep one star.
INSERT INTO lesson_stars (user_id, lesson_id, stars, practiced_at)
  SELECT user_id, lesson_id, 1, max(completed_at) FROM lesson_progress WHERE completed_at IS NOT NULL GROUP BY user_id, lesson_id;

-- `studied`: the study-first screen was shown before this item. `master`: the item was part of a Master run.
ALTER TABLE attempts ADD COLUMN studied INTEGER NOT NULL DEFAULT 0 CHECK (studied IN (0, 1));
ALTER TABLE attempts ADD COLUMN master INTEGER NOT NULL DEFAULT 0 CHECK (master IN (0, 1));
