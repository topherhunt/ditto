# Privacy obligations

What Ditto owes its learners under GDPR (and Brazil's LGPD and similar Latin American laws, which ask for the same things), and what's still open. The public texts are [`web/src/pages/Privacy.tsx`](../web/src/pages/Privacy.tsx) and [`web/src/pages/Terms.tsx`](../web/src/pages/Terms.tsx); every claim in them must match the code. Usage metrics are detailed in [metrics.md](metrics.md).

## Processors

- **OpenAI:** its [DPA](https://openai.com/policies/data-processing-addendum/) is incorporated into the Services Agreement every API account accepts, so it's in effect with nothing to sign. It includes the Standard Contractual Clauses, and OpenAI is DPF-certified. The version in effect is saved in [legal/](legal/2026-09-openai-data-processing-addendum.pdf); save the new one there when it changes.
- **RackNerd:** no DPA (see Accepted gaps).
- **Google:** sign-in (Google acts as its own controller) and the feedback form (Google Forms).

## Before this deploy

- **Add the URLs to the Google OAuth consent screen:** `https://ditto.topherhunt.com/privacy` and `/terms`.

## Soon

- **Self-serve account deletion.** Until it exists, deletion is manual: `DELETE FROM users WHERE id = ?` (cascades remove everything else). It leaves the conversation's partner audio files in `SPEAK_AUDIO_DIR`, which hold no personal data.
- **Data export.** A request for a copy has no tooling yet; a script dumping every row keyed to the user as JSON would answer it.
- **Translate the policy and terms into Latin American Spanish**, then Dutch and Italian. Both GDPR and LGPD expect a notice people can understand.

## Ongoing

- **Healthchecks.io gets no personal data** (`server/healthcheck.ts` sends fixed text plus an error class name), so it needs no DPA. Keep it that way: never put an error message, path, id or request data in a ping body.

- **When data handling changes, update the policy in the same change**: a new table or column holding personal data, a new third party, a new retention period, or anything shown to other learners. Bump its "Last updated" date. A new third party also needs its DPA signed before it receives data.
- **Answer data requests within 30 days.** Log them outside this repo (they contain personal data).
- **Breach:** if learner data is exposed, tell affected learners promptly, and if EU learners are at real risk, notify a supervisory authority within 72 hours.
- **Cookies and analytics:** the policy's "nothing to consent to" holds only while the sole cookie is the sign-in cookie. Any analytics or tracking cookie needs a consent banner first.

## Planned changes that touch the policy

- **Mail sending service:** add it to "Who else processes your data", sign its DPA, and say what mail it sends.

## Accepted gaps

Revisit these if Ditto grows well past a hobby, takes payments, or someone complains.

- **RackNerd has no Art. 28 processor agreement or transfer mechanism.** It's an unmanaged VPS: the host has no access to or role in the data. Hetzner (GDPR DPA, US and EU regions) is the swap if needed.
- **No EU representative (Art. 27).** Arguably exempt as occasional, small-scale processing with no sensitive data.
- **Backups live on the same VPS as the database** (`/srv/ditto/backups`, 14 nightly). Not a privacy gap, but a host failure loses both.
