-- One row per finished lesson run (a path's last item answered), repeats and Master runs included. The leaderboard counts these; `lesson_progress.completed_at` stays the lesson's first completion.
CREATE TABLE lesson_runs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL
) STRICT;
CREATE INDEX lesson_runs_user ON lesson_runs (user_id, completed_at);

-- Earlier completions are known only by each lesson's first one.
INSERT INTO lesson_runs (user_id, lesson_id, completed_at)
  SELECT user_id, lesson_id, min(completed_at) FROM lesson_progress WHERE completed_at IS NOT NULL GROUP BY user_id, lesson_id;
