-- How many questions the session's queue held. A session counts as a lesson (server/leaderboard.ts) once that many distinct
-- questions have been answered; sessions from before this column are judged against min(20, deck size).
ALTER TABLE quiz_sessions ADD COLUMN queue_size INTEGER;
