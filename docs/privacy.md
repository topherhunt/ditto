# Privacy policy: draft and open questions

A plain-language draft for a `/privacy` page, not yet published or legally reviewed. Every claim below matches the code as of this draft; when data handling changes, change this file with it. Usage metrics are detailed in [metrics.md](metrics.md).

## Open questions before publishing

1. **Legal review.** Learners in the EU (the app teaches Italian, Dutch and Irish) make this GDPR-relevant. It needs a named controller and contact address, a lawful basis per purpose (likely: contract for the service itself, legitimate interest for metrics and abuse prevention), and the right to complain to a supervisory authority.
2. **Account deletion is manual.** There is no self-serve delete. Either build one (cascades already remove nearly everything) or state "email us and we delete within 30 days".
3. **Voice recordings are kept indefinitely.** Conversation-mode recordings stay in the audio dir (`SPEAK_AUDIO_DIR`) as long as the conversation exists. Consider deleting them after e.g. 30 days, since the transcript and verdict are kept separately.
4. **OpenAI's retention.** Verify OpenAI's current API data-use and retention terms before citing them, and check that the account's settings match what the policy promises.
5. **Hosting location.** Name the VPS provider and country, since this is an international transfer for EU users.
6. **Minimum age.** Decide one (e.g. 13, or 16 in parts of the EU), or state the service isn't for children.
7. **Terms of service** are a separate page: acceptable use, no warranty, the free daily AI allowance can change, and account termination for abuse.

## Draft policy

**Who we are.** Ditto is a language-practice app run by Topher Hunt. Contact: _[email]_.

**What we store and why**

- **Your Google account id and email**, to sign you in. We don't store your Google name or photo. Your email is shown only to you and the operator, never to other learners.
- **Your username, interface language, languages you study, practice settings and profile visibility**, to run the app as you set it up. Other learners see only your username and, if your profile is public, your recent progress.
- **Your practice:** answers you type, outcomes, mistakes, review schedule, lessons completed, levels passed, quiz answers, and your conversations (text and your voice recordings). This is the learning record the app is built on: your notebook, reviews and progress come from it.
- **Friends, races, notifications and problem reports**, to provide those features.
- **Usage metrics:** how many minutes per day you spend in each part of the app (for example "lessons, Italian, 12 minutes"), and nothing finer. We use this to learn which features help people, and delete the per-person figures after 90 days, keeping only totals that identify no one. Server statistics (requests per hour, errors, response times) contain no personal data.
- **AI costs:** each AI call made for you (explanations, conversation replies, speech) with its cost, to enforce the free daily allowance and plan our budget.
- **A sign-in cookie**, which keeps you signed in for 30 days. We use no advertising or tracking cookies and no third-party analytics.

We don't store your IP address, device or browser details, or location, and we never sell or share your data for advertising.

**Who else processes it**

- **Google**, when you sign in with Google.
- **OpenAI**, when you use AI features. For an explanation, we send the exercise and your answer. In conversation mode, we send your voice recording for transcription, the conversation's text for replies and feedback, and text to be spoken. Quiz and conversation audio is also generated this way. We don't send your email or name.
- **Our hosting provider** _[name, country]_, which runs the server and stores the database and nightly backups.

**How long we keep it.** Your account and practice data are kept while your account exists. Per-person usage metrics are kept 90 days. Backups are kept 14 days, so deleted data disappears from them within that time.

**Your choices and rights.** You can make your profile private, change your username and stop using AI features at any time. You can ask for a copy of your data or for your account to be deleted by emailing _[email]_; deletion removes your practice, conversations, recordings, metrics and AI cost records.

**Changes.** We'll update this page when what we store changes, and note the date at the top.
