-- Usage metrics (docs/metrics.md). Only daily and hourly aggregates: no event log, no content, no IP or browser.

-- Seconds a learner had a page visible and had used it within the last minute, per UTC day, course language ('' outside one)
-- and activity. After METRICS_KEEP_DAYS, rollUpMetrics (server/metrics.ts) folds rows into the two anonymous tables below.
CREATE TABLE engaged_time (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  language TEXT NOT NULL,
  activity TEXT NOT NULL,
  seconds INTEGER NOT NULL,
  PRIMARY KEY (user_id, day, language, activity)
) STRICT;
CREATE INDEX engaged_time_day ON engaged_time (day);

-- users: learners with engaged time that day in that language and activity.
CREATE TABLE engaged_time_totals (
  day TEXT NOT NULL,
  language TEXT NOT NULL,
  activity TEXT NOT NULL,
  users INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  PRIMARY KEY (day, language, activity)
) STRICT;

-- Distinct learners with any engaged time that day, for days rolled up out of engaged_time.
CREATE TABLE active_users_daily (
  day TEXT PRIMARY KEY,
  users INTEGER NOT NULL
) STRICT;

-- hour: '2026-09-30T14' (UTC). peak_users: the most learners engaged within one 5-minute window of the hour.
CREATE TABLE concurrency_hourly (
  hour TEXT PRIMARY KEY,
  peak_users INTEGER NOT NULL
) STRICT;

-- route: the matched route pattern ('POST /api/conversations/:id/attempts'), 'static' or 'unmatched', never a real path.
-- The ms_* columns count responses by time to the response headers (LATENCY_BUCKETS in shared/api.ts).
CREATE TABLE http_hourly (
  hour TEXT NOT NULL,
  route TEXT NOT NULL,
  requests INTEGER NOT NULL,
  errors_4xx INTEGER NOT NULL,
  errors_5xx INTEGER NOT NULL,
  ms_100 INTEGER NOT NULL,
  ms_300 INTEGER NOT NULL,
  ms_1000 INTEGER NOT NULL,
  ms_3000 INTEGER NOT NULL,
  ms_slow INTEGER NOT NULL,
  PRIMARY KEY (hour, route)
) STRICT;
