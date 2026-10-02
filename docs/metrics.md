# Usage metrics

What Ditto measures about how it is used, why, and how the numbers answer product questions. It is also the source for the usage section of the privacy policy (`web/src/pages/Privacy.tsx`, obligations in [privacy.md](privacy.md)). Code: `server/metrics.ts`, `web/src/metrics.ts`, migration `023-metrics.sql`; report at `/admin/metrics` (account menu > Admin > Metrics, admins only).

## Principle

Collect the least that answers a question we actually have, as aggregates, never as a trail. Each measure below names the question it answers; a measure without one gets removed. There are no third-party analytics, no cookies beyond the sign-in session, no fingerprinting and no advertising use, and nothing is sold or shared.

## What is recorded

| Measure | Stored as | Question it answers |
|---|---|---|
| Engaged time | `engaged_time`: seconds per learner, UTC day, course language and activity | Which activities do learners spend their time on, and does that change as they progress? |
| Daily active learners | Derived from `engaged_time` (`active_users_daily` after roll-up) | Is the app growing or losing people? |
| Peak concurrent learners | `concurrency_hourly`: the most learners engaged in one 5-minute window, per hour; no user ids | How much load must one server take? |
| Requests per route | `http_hourly`: count, 4xx, 5xx and a latency histogram per UTC hour and route pattern; no user ids | Is the app healthy and fast enough, and which endpoints need work? |
| AI spend | `api_usage`: one row per paid call (existing; see [conversation.md](conversation.md#spend)) | What does a learner cost, who are heavy users, what budget is reasonable? |

**Engaged time** counts only while a page is visible and the learner pressed a key, clicked, tapped or scrolled within the last minute, so a tab left open overnight adds nothing. The browser counts 5-second ticks and reports them every 30 seconds, on leaving the page and on hiding the tab; the server refuses more than 60 seconds per report. A report carries only the activity name (from the route: `home`, `lesson`, `review`, `level-test`, `notebook`, `talk`, `quiz-study`, `quiz-test`, `quiz-decks`, `social`, `settings`, `other`; `ACTIVITIES` in `shared/api.ts`), the course language and the seconds. Admin pages are not counted.

**Not recorded:** URLs or ids of what was viewed, clicks, keystrokes, text, timestamps finer than the day, IP addresses, browser or device details, referrers, or location. Route patterns (`GET /api/lessons/:lessonId`) are stored, never real paths. Caddy keeps no access log.

## Retention

- `engaged_time` keeps per-learner rows for 90 days (`METRICS_KEEP_DAYS`). `rollUpMetrics` runs at server start and hourly: it adds older rows into `engaged_time_totals` (learners and seconds per day, language and activity) and `active_users_daily`, then deletes them. Admin reports show the same numbers before and after.
- Deleting an account deletes its `engaged_time` rows (cascade). Rolled-up totals no longer link to anyone and stay.
- `concurrency_hourly` and `http_hourly` hold no user data and are kept indefinitely: at most one row per hour, plus one per route pattern used that hour.
- Nightly database backups keep 14 days (`BACKUP_KEEP`), so deleted rows linger that long in backups.

## How the numbers answer "what's useful"

Time shows what's popular, not what helps. Plan to read them together:

1. **Where time goes:** minutes per activity and per learner-day on `/admin/metrics`. A feature nobody spends time in is a candidate to cut or redesign; one with high time but low progress may be confusing rather than valuable.
2. **Retention by activity (planned query):** among learners whose first week included activity X, how many were active in weeks 2-4, compared with those without X. This comes closest to "X keeps people learning". It needs no new data: `engaged_time` has learner, day and activity for 90 days.
3. **Learning outcomes (already stored as practice data):** accuracy trends in `attempts`, quiz ratings and graduation in `quiz_answers`/`quiz_cards`, lessons completed and levels passed. An activity is useful if learners who use it improve faster on these.
4. **Cost per engaged minute:** `api_usage` spend divided by `talk` minutes shows whether conversation mode's cost is justified by use, and sets the daily cap.
5. **Health:** 5xx counts and p95 latency per route show what to fix first; peak concurrency and requests per hour show when a bigger server is needed.

Items 2 and 3 are analysis to write when there are enough learners to compare, not features to build now.

## Why each measure is justified

- **Engaged time per learner** is the only per-person measure here. It is kept per learner, not only in total, for three reasons. Retention by activity (item 2) needs to follow the same learner across days. Totals alone can't separate one heavy user from many light ones. An admin investigating abuse or a cost spike needs to see one account's pattern. It is limited to a daily sum per activity and deleted after 90 days, after which only anonymous totals remain.
- **Concurrency and request stats** carry no user identity. They are standard operational data needed to keep the service up.
- **AI spend per call** has real money attached. The daily cap enforces it per learner, and budgeting needs per-purpose detail.

## Scale

At ~15 activity rows per learner-day at most, 1,000 daily learners over 90 days is ~1.4M `engaged_time` rows (tens of MB). The per-day aggregates keep the admin queries fast. `api_usage` grows ~4-5 rows per spoken reply. Past a few million rows, roll it into per-user daily totals the same way (see the note in [conversation.md](conversation.md#spend)).
