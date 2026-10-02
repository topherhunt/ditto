-- 1: the learner dismissed the dashboard's "add Ditto to your home screen" alert (shown on iOS Safari), so it never returns.
ALTER TABLE users ADD COLUMN install_hint_dismissed INTEGER NOT NULL DEFAULT 0 CHECK (install_hint_dismissed IN (0, 1));
