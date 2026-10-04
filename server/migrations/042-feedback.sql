-- In-app feedback, replacing the Google Form. A row can be just a mood (tapped on the dashboard card) that the feedback page later fills in.
-- `page` is the route it was started from; `locale` the learner's interface language, so the operator knows what language `message` is likely in.
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  message TEXT,
  may_contact INTEGER NOT NULL DEFAULT 0 CHECK (may_contact IN (0, 1)),
  page TEXT NOT NULL,
  locale TEXT NOT NULL,
  created_at TEXT NOT NULL,
  handled_at TEXT,
  admin_note TEXT
) STRICT;
CREATE INDEX feedback_user ON feedback(user_id, created_at);
-- Tag codes come from FEEDBACK_TAGS in shared/api.ts.
CREATE TABLE feedback_tags (
  feedback_id INTEGER NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (feedback_id, tag)
) STRICT;
