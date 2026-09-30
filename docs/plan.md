# Ditto: Plan

Ditto is a dictation trainer & language learning app, served at `https://ditto.topherhunt.com`: listen to a word, phrase or sentence in the target language, type what you hear, and get letter-level feedback. It features a mistakes notebook, spaced review, and an on-demand AI explainer. Launch languages: English (`en`), Italian (`it`), Dutch (`nl`).

## Basic learning approach

- **Hierarchy:** course (a curriculum *module*: one situation, main or optional track) -> lessons -> an ordered list of units (one dictation item each). The curriculum and its unlock order are in [curriculum.md](curriculum.md); the schema is under Content model below.
- **Order is fixed and scaffolded, not shuffled.** Units build up to each target sentence, then the next one starts: `Sorry` -> `is` -> `there` -> `a pharmacy` -> `is there a pharmacy` -> `Sorry, is there a pharmacy` -> `near` -> `the station` -> `near the station` -> **`Sorry, is there a pharmacy near the station?`**. Five target sentences take 36 units.
- **Difficulty filters the scaffold:** easy = every stage (words, phrases, chunks, combined chunks, sentences); medium = chunks and up; hard = target sentences only.
- **Hint level is a separate axis:** initials plus exact-length dots / first letter only / no clues. Answers go into per-word inputs.
- **Checking is deterministic:** struck-out letters to remove, green letters to add, and the learner fixes the answer themselves (`autoCorrect: off`). Wrong submissions, hints and replays are counted per round. There is no LLM call in the bundle.
- Audio for its development course is pre-rendered with macOS `say` (Samantha, 155 wpm), one file per unit, plus separate word-level audio.

## Product scope

**Milestone 1 (build now)**

- Google sign-in (the only login method), with an email allowlist.
- A catalog per language, grouped by level: courses -> lessons, unlocked in order (see Learning flow).
- Practice: audio autoplay, replay, and 0.75x speed, in one of two voices picked at random per unit (among those matching its `speaker`); per-word inputs with a hint level; letter-level diff; lenient accents; per-word hint; show answer.
- After each item: a meaning check, which asks the learner to pick the translation out of three options. Then the full text, the translation, and tappable words that play word audio and show a gloss.
- The UI is localized into English, Latin American Spanish, Dutch and Italian (`LOCALES`: `en`, `es-419`, `nl`, `it`). The learner's locale (`users.locale`, "Your language", picked at sign-in or in Settings) is the UI language and their support language: translations, distractors, glosses and descriptions come in it where the course supports it (`SUPPORT_LOCALES`: `it` has `en`, `es-419`, `nl`; `en` has `es-419`, `it`, `nl`; `es` has `en`, `it`, `nl`; `nl` has `en`, `es-419`; `ga` has `en`, `es-419`, `nl`, `it`), else in the course's first support language (`supportLocale`). Explanations and Speak coaching are written live, so they come in the learner's own language even where the content lacks it (`ownLocale`/`helpLocale` in `server/auth.ts`). Immersion is per course, in prefs, for courses written in a locale (`languageLocale` in `shared/content.ts`: `es` is `es-419`; `ga` has none): `immerseUi` puts every page in its language while that course is the current one (the route's, else the home course), Speak titles included; the device remembers it (localStorage `immersion`), so the signed-out homepage and sign-in stay immersed until the visitor picks a language there. `immerseHelp` puts explanations and coaching in it. Translations and glosses stay in the learner's language.
- Mistakes notebook, with focused practice of notebook items.
- "Report a problem" under each item (bad audio, wrong text, wrong meaning, "my answer should be accepted" after a wrong check, other), stored with the voice and audio file that played, for review and re-rendering. Admins (`ADMIN_EMAILS`) triage them at `/admin/reports` (account menu > Reports): play the reported clip, pick a decision (dismiss, fix audio, fix text, fix translation, accept answer, discuss), optionally with a note; dismissing closes the report. Fixes are made locally: `devops/reports.sh pull` mirrors production's reports into the dev DB, where the same page plays the current clip beside the reported one and records the admin's approve/reject review; after the fix is deployed, `devops/reports.sh push` closes on production every report approved or closed in the dev DB, then `pull` brings the closures back.
- Admins watch usage and abuse at `/admin/users` (account menu > Users): every account with registration, last seen (`users.last_seen_at`, stamped by signed-in requests at most every 5 minutes), last practice, items, active days, friends, pending requests, blocks received, reports filed and AI spend, searchable, filterable and sortable in the browser. A user's page adds practice per language, daily activity, friends, blocks, reports and a link to their public profile. `/admin/metrics` (account menu > Metrics) shows daily learners, engaged time per activity, traffic, errors and latency ([metrics.md](metrics.md)).
- Scheduled review (FSRS).
- AI explainer: a "Why?" button on any mistake that explains and categorizes it. The explanation is saved on the learner's own notebook entry.
- Friends, found on the Friends page by exact username (a leading `@` is ignored) or exact email, or added from a profile. A search shows only the username and how you stand, so people can connect without sharing an email. A learner can send 3 new requests in any 24 hours (declined ones count; accepting someone else's doesn't). The other person can accept or decline (the request is deleted). Either side can unfriend.
- Blocking and reporting, from the "⋯" menu on any profile but your own (and Block on an incoming request). Blocking is silent and ends any friendship, request and race: the blocked account's later requests look pending to them and never reach the blocker, and the board hides each from the other. "Report and block" also files a report (offensive username, board post, unwanted requests, or other, with an optional note) that copies their username and board post as they were. Admins handle reports at `/admin/user-reports` (account menu > People reports): take down the board post, clear the username (the app then makes them pick a new one), or dismiss.
- Usernames: picked on a blocking screen right after first sign-in, changeable under Account settings (`/account`). ASCII `[A-Za-z0-9_.-]{3,20}`, unique regardless of capitals. Lists, races, notifications and leaderboards show only the username.
- Identity privacy: learners know each other only by username. Email, Google name and Google photo are never shown to another learner, friends included; the Google name and photo aren't stored. The email is shown only to its owner (Settings) and the operator (`/admin`). Users appear in URLs and the API by `users.public_id` (random, 10 characters from a 64-character alphabet), never by the numeric row ID.
- Profiles (`/people/:publicId`, `/people/me`). Your own profile carries a note on what strangers see, linking to Settings. A public profile (the default) shows anyone the username, the language they study that they most recently practiced (a lesson tried in another language doesn't count), the activity line and lessons completed in the past day/week/month, with an Add friend button. A private one (Settings > "Public profile" off) shows strangers only the username and the button. Only you and your friends see the rest: accuracy, the current module per language, a step graph of lessons completed with level markers, and recent lessons with a Play link. Activity is the shortest window (day/week/month/year) with 2+ lessons, else the last completion date. Accuracy covers the last 10 lessons worked on. "Lessons completed" always means first completions.
- Make new friends board (`/friends/board`, from a button at the bottom of the Friends page): opt-in. Post an entry with an optional one-line blurb (140 chars) to see the board; take it down in one click. It lists up to 50 entries in a fresh random order, with no search or filter: username, language, level, activity line, blurb and an Add friend button, and your own entry labeled "(Hey, this is you!)". Posting shows these even if your profile is private. No DMs.
- A lesson any friend has started is playable out of sequence. Its done screen compares your latest run with friends who have played it.
- Races between friends, which start once the opponent accepts: most lessons in 1/3/7/14/30 days, or first to N lessons (15-200). A first-to race has a 30-day deadline, where the leader wins and a tie is a draw. One open race per pair. Races are settled lazily when races or notifications are read.
- A leaderboard (`/leaderboard`) of lessons completed in the past 1, 7 or 30 days, among you and your friends only, with a note saying so and a link to find friends. Strangers and friends of friends never appear. Top 20, ties share a rank, and your own row is added below if you're outside it. Each name links to the profile.
- An in-app notifications bell (no email or push).
- Quiz mode (nav: Quiz): preset multiple-choice grammar and vocab decks per language and level, scheduled with FSRS, with per-deck stats and session history. Levels unlock in order, by graduating 90% of a level or a perfect 20-question test-out. Question audio is gpt-4o-mini-tts. Presets are stored once and shared; see [quizzes.md](quizzes.md).
- Content: the full Italian A1 to B1 curriculum (31 main and 10 optional modules, [curriculum-it.md](curriculum-it.md)); English A1 to B1 for Spanish and Italian speakers (31 main and 10 optional modules, [curriculum-en.md](curriculum-en.md)); Dutch A1 to B1 for English and Spanish speakers (31 main and 10 optional modules, [curriculum-nl.md](curriculum-nl.md)); Irish A1 for English, Spanish, Dutch and Italian speakers (11 main modules, [curriculum-ga.md](curriculum-ga.md)).

**Later**

- A stats page (accuracy, hint rate, streaks).
- Deploy automation.
- The learning blind spots in [roadmap.md](roadmap.md).
- Conversation mode, a spoken role-play with a grammar coach: [conversation.md](conversation.md).

**Not doing:** content or audio generated on demand at runtime, CJK or right-to-left languages, other login methods.

## Architecture

One Node process (a monolith) serves the SPA, the JSON API and audio files. Caddy only terminates TLS and proxies `ditto.topherhunt.com` to `localhost:$PORT`. Caddy does no path routing.

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node 24+ running TypeScript directly (native type stripping, `erasableSyntaxOnly`) | No server build step. The VPS needs Node >= 24. |
| HTTP | Hono + `@hono/node-server` | Tiny, uses standard Request/Response, and tests run in-process via `app.request()` |
| DB | SQLite through built-in `node:sqlite`, WAL mode | One file, no daemon, no native module to compile on the VPS. Postgres would idle at around 100MB RAM for no benefit here. |
| Frontend | Vite + SolidJS + TypeScript, `@solidjs/router` | Fine-grained reactivity, small bundle. Trap: never destructure props (it breaks reactivity) |
| CSS | Bootstrap 5 (CSS only) utilities, plus one component stylesheet for the dictation widget | Utility-first |
| SRS | `ts-fsrs` | FSRS schedules more efficiently than SM-2 and the library is maintained |
| AI | `openai` SDK, Responses API with a strict JSON-schema output, model `gpt-6-luna` (`EXPLAIN_MODEL` in `server/explain.ts`) | About $0.0004 per explanation ($0.10 / $0.50 per 1M in/out tokens) |
| Tests | Vitest (unit + API), Playwright (E2E) | |

### Repo layout

```
server/        app.ts (routes), index.ts (boot), db.ts, migrations/*.sql, auth.ts, content.ts, srs.ts, explain.ts
web/           index.html, src/ (pages, components, api client)
shared/        grader.ts, tokenize.ts, types.ts   -- used by both web and server
content/       courses/{lang}/{courseId}.json      -- source of truth, in git
               audio/{lang}/{hash}.m4a             -- generated, gitignored, rsynced to VPS
scripts/       build-audio.ts, validate-content.ts
tests/         unit/, api/, e2e/
```

### Content: served by the backend, not bundled

Course JSON is loaded and validated at boot. Invalid content crashes startup with a precise error. The server serves it via `/api/courses/:id`. Reasons to keep it server-side:

- The review queue mixes units from many courses.
- The explainer must look up the correct answer server-side, so the endpoint can't be used as a free general-purpose LLM proxy.
- The client bundle stays small as decks grow.

### Audio

Filenames are content-addressed: `sha1(renderVersion|lang|voice|text[|fix])` -> `/audio/{lang}/{hash}.m4a` (AAC plays in every browser). Bumping `RENDER_VERSION` in `server/content.ts` re-renders everything. Slow playback uses the browser's `playbackRate`, not a second render. Identical text across courses shares one file. Node serves the files with `Cache-Control: immutable`.

The server computes the URLs when it loads content, so there is no manifest. It fails at boot if a referenced file is missing (a warning in dev). Every word, and every unit without a `speaker`, has one file per voice; the served `audio` arrays follow the voice order in `VOICES` (`server/content.ts`), with `null` for voices that don't match a unit's `speaker`. Word audio is keyed on the lowercase surface form.

`content/audio-fixes.json` fixes single clips that render badly, keyed by language, voice id and text as rendered (lowercase for word audio): `say` is what the engine reads instead (a respelling or punctuation), `cut` drops seconds off the end after trimming (a breath the silence trim keeps), and `take` forces a fresh render, since OpenAI output is random per run. A fix joins the hash, so the fixed clip gets a new file and the old one stays until `--prune` (don't prune while reports on it are under review). A fix for text nothing renders is a load error.

Voices, one per gender in each language:
- `en`, `es`, `fr`, `it`, `nl`: OpenAI gpt-4o-mini-tts marin (F) and cedar (M), with Spanish asked for as Latin American Spanish. By ear in September 2026 they beat Piper, local Kokoro, Kokoro on OpenRouter and Gemini 3.8 Flash TTS in Italian (clearer, fewer mispronunciations, no clipped endings), and Piper by a wide margin in English and Dutch. Rendering needs `OPENAI_API_KEY` in `.env`; `en`, `it` and `nl` together cost an estimated $12-15 at list price (about $0.015 per audio minute).
- `ga`: ABAIR's Munster voices Neasa (F) and Colm (M), matching the course's Munster forms. gpt-4o-mini-tts (marin, cedar, asked for Irish Gaelic) was no better in quality and has a distinct American accent in Irish, so Irish stays on ABAIR. ABAIR (Trinity College Dublin) is a free public service; credit it wherever Irish audio ships.

`scripts/build-audio.ts` renders only missing files, with one `scripts/tts-render.py` process per voice in parallel, except ABAIR voices, which run one at a time with a 1s pause per request. `--prune` also deletes files no content references. The renderer:
1. fetches from OpenAI (4 workers per voice) or ABAIR's web reader endpoint;
2. trims silence, matches loudness (RMS 0.08, peak capped at 0.95) and pads 150ms at each end;
3. encodes with `afconvert` into a `.part` file, then renames it, so an interrupted run never leaves a truncated file.

**gpt-4o-mini-tts has no reliable pace control.** OpenAI clips are asked for the language, a native accent and "a normal conversational pace, the way a native speaker says it to a friend" (`scripts/tts-render.py`). The language is named because TTS models read a bare word in whatever language they guess (Gemini read "nome" as English "gnome"). In a September 2026 test (9 Italian items, one take each), "conversational" and "brisk" pace instructions changed spoken length less than two takes of the same text differ, and `speed: 1.25` sped some clips up by 10-30% and left others unchanged. Speeding clips up locally (ffmpeg `atempo`) is reliable but sounded artificial and was rejected.

**Sanity check after rendering:** `npm run content:check-audio` (`scripts/check-audio.ts`; pass flags after `--`) runs a phoneme recognizer (`facebook/wav2vec2-xlsr-53-espeak-cv-ft`, language-independent IPA, via torch and transformers in `.venv`, with espeak's IPA from `phonemizer-fork` and `espeakng-loader`, downloaded to the Hugging Face cache on first run) over clips of 1-2 word texts, compares what it heard with espeak's IPA for the text, and writes `data/audio-check.html`: clips ranked by phoneme error rate (PER) with play buttons. `--all`, `--lang`, `--voice` and `--text` change the scope; results are cached per clip in `data/audio-check.jsonl`, so later runs score only new renders (the first pass over every short clip takes about an hour on Apple silicon). It is a ranker for listening, not a verdict: its "heard" column matched every complaint in the first batch of reports (si-ye, nosey, bosso, shee-trah), but PER alone doesn't separate good from bad (approved clips scored up to 0.5, and o/ɔ is folded, so an open-vowel error scores 0). When fixing a clip, list candidate fixes per text in `data/audio-candidates.json` (shaped like `audio-fixes.json`, with a list of fixes per text) and run `npm run content:audio-candidates`: it renders each to the file its fix would use, scores them, and writes `data/audio-candidates.html`. Adopting one means copying its fix into `audio-fixes.json`; the file is already in place. Pick one whose heard phonemes carry no extra glide, trailing θ/s, b for p or ʃ for tʃ; then listen. Text-level ASR (Whisper) is not a substitute: it guesses the intended word and passed clips that people rejected.

## Content model

```jsonc
// content/courses/it/it-a1-bar.json
{
  "id": "it-a1-bar", "language": "it", "level": "A1", "order": 1,
  "title": "Al bar", "description": { "en": "Ordering coffee and snacks", "es-419": "…", "nl": "…" },
  "track": "main", "requires": [], "introduces": ["volere", "il", "lo", "prendere", "grazie"],
  "lexicon": {
    "vorrei": { "lemma": "volere", "pos": "VERB", "gloss": { "en": "I would like (conditional)", "es-419": "quisiera (condicional)", "nl": "…" } },
    "lo#pron": { "lemma": "lo", "pos": "PRON", "gloss": { "en": "it / him", "es-419": "lo", "nl": "het / hem" } }
  },
  "lessons": [{
    "id": "it-a1-bar-1", "title": "Un caffè, per favore",
    "grammarFocus": { "en": ["indefinite articles", "vorrei + noun"], "es-419": ["…"], "nl": ["…"] },
    "units": [
      { "id": "it-a1-bar-1-u04", "rev": 1, "stage": "sentence", "text": "Lo prendo grazie.",
        "translation": { "en": "I'll take it, thanks.", "es-419": "Lo tomo, gracias.", "nl": "Ik neem het, bedankt." },
        "distractors": { "en": ["I'll pay for it, thanks.", "I'll leave it, thanks."], "es-419": ["…", "…"], "nl": ["…", "…"] },
        "senses": { "0": "pron" }, "commas": [1] }
    ]
  }]
}
```

- `track`: `main` or `optional`. `requires`: course ids that must be complete first. A main course never requires an optional one, and cycles are load errors.
- `introduces`: the lemmas this course teaches. Every non-PROPN lemma a unit uses must be introduced by this course or one it requires, transitively. A lemma introduced twice along a chain, or introduced but never used, is a load error.
- `stage`: `word` | `phrase` | `chunk` | `sentence`. The units before each `sentence` scaffold toward it. A lesson must end with a `sentence`. A sentence ends in `.`, `!` or `?`, and a word never does.
- `lexicon`: one annotation per lowercase surface form in the course. Entries from required courses are inherited, and the course's own entry wins. A unit's `senses` maps a word index to a sense suffix when a surface is ambiguous (`lo` -> `lo#pron`). At load, the server attaches the entry and word audio to every token of `tokenize(text)`, so offsets are never stored. Missing and unused lexicon entries are load errors.
- `variants[]`: other answers that are also accepted (numerals, contractions).
- `commas[]`: word indices after which a comma or semicolon is accepted although the text has none.
- `distractors`: two wrong translations for the meaning check. Required exactly when there is a `translation`.
- `speaker`: `F` or `M` when the text gives the speaker's gender away ("sono stanca", "I'm Maria"); only voices of that gender read the unit. Its words keep every voice.
- Unit `id`s are permanent and never reused. Bump `rev` when the text changes, which hides saved explanations of the old text.
- **Localized fields** (`description`, `grammarFocus`, `gloss`, `translation`, `distractors`) are locale maps with exactly the course language's `SUPPORT_LOCALES`; a missing or extra locale is a load error. The loader builds one served copy of the content per UI locale. Every unit needs a `translation`.
- New support languages are added as one patch per course and locale, checked and merged by `scripts/merge-locale.ts` (`--check` validates without writing).

## Practice settings (per user, per language)

- **Path:** `full` (every stage) / `chunks` (chunk + sentence) / `sentences` (sentence only).
- **Hints:** `letters` (first letter + a dot per letter) / `initial` (first letter only) / `none` (a single free-text box, so the word count isn't revealed either).
- Also: autoplay count, playback rate.
- Edited only on `/:lang/settings`. The catalog summarizes them in one line that links there; account Settings doesn't show them.

## Grader (`shared/grader.ts`, pure and exhaustively unit-tested)

1. **Tokenize:** a word is a run of letters, digits and combining marks, plus internal `'` and `-` and a trailing `%`. Apostrophe variants (`’ ‘ ʼ`) normalize to `'`. Each typed punctuation mark is attached to the word before it and judged:
   - **ok:** the canonical text has it there. `.` and `!` count as the same mark. A comma or semicolon is also ok where the text has either one, or where the unit's `commas` allows it.
   - **wrong:** the end mark is the wrong kind: `?` on a statement, or `.`/`!` on a question. This fails the attempt with category `punctuation`.
   - **stray** (shown orange, not a mistake): anything else, including any end mark on a word unit.
   Missing punctuation is never an error.
2. **Compare key:** NFC, lowercase, diacritics stripped (NFD, then remove `\p{M}`). Case is ignored.
3. **Align words:** in slot modes, word *i* aligns to slot *i*. In `none` mode, the typed words are aligned to the target words with an edit-distance DP whose substitution cost is twice the normalized letter distance (so an unrelated word costs the same as one extra plus one missing word). The result is match / substitute / missing word / extra word.
4. **Per word:**
   - Keys equal and exact text equal: **correct**.
   - Keys equal but diacritics differ (missing, wrong, or extra accent): **accent-fixed**. The word is replaced with the correct form, the affected letters turn **orange**, and it is not a mistake. This counts toward `accentSlips` only.
   - Keys differ: **wrong**. A letter-level diff (LCS on the key) marks letters to delete (red strikethrough) and letters to insert (green). The learner must edit and resubmit.
5. **Variants:** the answer passes if it matches the main text or any variant under the same rules. Failing that, both sides are compared in canonical form (`shared/equivalents.ts`), so common equivalent spellings pass silently. English: contractions both ways (`I'd` = `I would`/`I had` from the next word), `$100` = `100 dollars`, `60,000` = `60000`, hyphen = space, and a list of joined compounds (`cellphone`, `email`, `alright`). Italian, Dutch and Irish: the euro sign on either side of the amount. English, Italian and Dutch: common spellings of the curriculum's names (`Marko` = `Marco`, `Ana` = `Anna`, `Sarah` = `Sara`, `Janssen` = `Jansen`). There is no other spacing leniency outside English.
6. **Unit outcome** for an attempt:
   - `clean`: no wrong submissions and no hints.
   - `hinted`: no wrong submissions, but at least one hint.
   - `corrected`: at least one wrong submission, then fixed.
   - `revealed`: the answer was shown.

   A deterministic category is attached to each wrong word: `spelling`, `missing_word`, `extra_word`, or `word_order` (the same word missing in one place and extra in another).

## Learning flow

- **Learn:** units play in lesson order, filtered by Path, and position is saved per lesson and path.
- **Unlocks** (`server/unlocks.ts`): a course unlocks when every course it requires is complete (all lessons, on any path) or its level is passed (`level_passes`, see the level test in [curriculum.md](curriculum.md)). Within it, a lesson unlocks when the one before is complete, or at once in a passed level. A learn-mode attempt on a locked lesson gets a 403. Review and the notebook are never locked.
- **Meaning check:** after the dictation, the learner picks the translation out of the translation and two distractors, in shuffled order. A wrong pick records the category `meaning`, adds a notebook entry, and schedules the card as a miss, even when the dictation was clean. `attempts.meaning_correct` is null for units without a translation.
- **Mistakes notebook:**
  - An entry is created on the first wrong submission or reveal. It keeps first and last wrong dates, a wrong count, the last wrong answer, and categories.
  - Practice-mistakes mode drills the notebook entries.
  - An entry graduates after 2 consecutive `clean` attempts, or can be removed by hand.
- **Scheduled review:**
  - Every completed `sentence` unit gets an FSRS card. Word, phrase and chunk units get a card only if they were missed.
  - Ratings: `clean` = Good, `hinted` = Hard, `corrected` / `revealed` = Again. Accent slips don't affect the rating.
  - The home screen shows the number of due cards per language.

## AI explainer

- `POST /api/explain {unitId, rev, answer}`. The server loads the unit (text, words with lemma/POS, grammarFocus, language) and computes the grader diff.
- It asks the model for structured output: `{ categories: [...], summary: string, details: string }`. Categories come from a fixed taxonomy: `spelling`, `mishearing`, `homophone`, `agreement`, `conjugation`, `article`, `preposition`, `elision_contraction`, `word_order`, `missing_word`, `extra_word`, `vocabulary`, `other`. It writes in the learner's UI locale.
- **Saved per learner:** in `mistakes.explanation`, when it explains that entry's `last_answer`, and shown (and reused instead of a new call) only while the unit `rev`, help locale and answer key still match. The answer key is lowercased and whitespace-collapsed, and it keeps punctuation. Explanations are never shared between learners. In a lesson, "Why?" appears after the meaning check, once the attempt that creates the notebook entry is saved.
- **Spend guards:**
  - The endpoint only runs when a user clicks "Why?".
  - Each uncached explanation is charged to the learner in `api_usage` and counts toward the daily spend cap (docs/conversation.md, Spend).
  - The route returns 503 with a clear message when `OPENAI_API_KEY` is unset. The key stays server-side.
  - Tests use a fake client.

## Data model (SQLite)

```sql
users(id PK  -- internal only; never sent to the client
      , public_id UNIQUE  -- random [A-Za-z0-9_-]{10}, set by an AFTER INSERT trigger
      , google_sub UNIQUE, email, prefs JSON, locale, created_at
      , username  -- NULL until picked; UNIQUE COLLATE NOCASE
      , profile_public  -- 1 (default) or 0
      )
sessions(token_hash PK, user_id FK, created_at, expires_at)
attempts(id PK, user_id, unit_id, unit_rev, course_id, lesson_id, mode  -- learn|mistakes|review
         , path, hints_level, outcome, wrong_submissions, hints_used, replays, accent_slips,
         submissions JSON, meaning_correct, duration_ms, created_at)
lesson_progress(user_id, lesson_id, path, next_index, completed_at, PK(user_id, lesson_id, path))
mistakes(user_id, unit_id, first_wrong_at, last_wrong_at, wrong_count, last_answer,
         categories JSON, clean_streak, removed_at, explanation JSON, PK(user_id, unit_id))
review_cards(user_id, unit_id, language, due, card JSON  -- ts-fsrs Card; `due` duplicated for the index
             , PK(user_id, unit_id))
explain_usage(user_id, day, count, PK(user_id, day))  -- unused since the dollar cap replaced the count cap
reports(id PK, user_id, unit_id, unit_rev, language, text, voice  -- e.g. openai:marin
        , audio_file, kind  -- audio|text|translation|accept|other
        , answer  -- accept only: the typed answer that was graded wrong
        , note, created_at
        , decision, admin_note, triaged_at  -- set by triage; decision: dismiss|fix_audio|fix_text|fix_translation|accept_answer|discuss
        , resolved_at, resolution  -- closed: by a dismissal or by devops/reports.sh push
        , review, review_note  -- approved|rejected: the admin's verdict on a proposed fix, on the dev DB mirror
        )
friendships(requester_id, addressee_id, status  -- pending|accepted
            , created_at, responded_at, PK(requester_id, addressee_id))
blocks(blocker_id, blocked_id, created_at, PK(blocker_id, blocked_id))
friend_board(user_id PK, blurb, created_at)  -- retracting deletes the row
user_reports(id PK, reporter_id, reported_id, reason  -- username|board_post|requests|other
             , note, username, blurb  -- copied at report time
             , created_at, resolved_at, resolution  -- took_down_post|cleared_username|dismissed
             )  -- at most one open report per reporter and reported account
challenges(id PK, challenger_id, opponent_id, kind  -- most|first_to
           , days, target, status  -- pending|active|declined|cancelled|finished
           , created_at, started_at, ends_at, finished_at, winner_id  -- NULL on a draw
           )
notifications(id PK, user_id, kind, actor_id, challenge_id, created_at, read_at)
```

Migrations are numbered `.sql` files applied at boot and tracked with `PRAGMA user_version`. Content lives in JSON, not the DB. The DB references units by `unit_id` only.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/config` | Public: Google client ID and whether dev login is on |
| POST | `/api/auth/google` | `{credential}` from Google Identity Services. The server verifies the ID token (`google-auth-library`), checks `ALLOWED_EMAILS`, and sets an httpOnly `Secure` `SameSite=Lax` session cookie |
| POST | `/api/auth/dev` | Enabled only when `DEV_LOGIN=1`. Used by E2E tests |
| POST | `/api/auth/logout` | |
| GET | `/api/me` | User, username, prefs, profile visibility, and whether they're an admin |
| PUT | `/api/username` | `{username}`; 409 if taken regardless of capitals |
| PUT | `/api/profile-visibility` | `{public}` |
| PUT | `/api/prefs` | |
| GET | `/api/catalog?lang=` | The language's full courses (with audio URLs) and the user's per-lesson, per-path progress, plus review-due and notebook counts |
| POST | `/api/attempts` | Records the attempt and updates lesson_progress, mistakes and review_cards in one transaction |
| GET | `/api/review?lang=` | Due units with full payloads |
| GET | `/api/mistakes?lang=` | Notebook entries with unit payloads and saved explanations |
| DELETE | `/api/mistakes/:unitId` | |
| POST | `/api/explain` | See above |
| POST | `/api/reports` | `{unitId, rev, voice, kind, answer?, note}` (`answer` only and always for `accept`), where `voice` is the index into the unit's `audio` |
| GET | `/api/admin/reports?status=(new\|triaged\|closed)` | Admins only (403 otherwise), like every `/api/admin` route. Each report with its reporter, reported clip, and the unit as the running content has it |
| PUT | `/api/admin/reports/:id/triage` | `{decision, note}`, where `note` may be empty; dismissing also closes the report. 409 if closed |
| PUT | `/api/admin/reports/:id/review` | `{review: "approved"\|"rejected", note}`; the note is required to reject. Triaged reports only |
| POST | `/api/admin/reports/:id/reopen` | A dismissed report goes back to new, any other back to triaged |
| GET | `/api/admin/users` | Every account with its stats (`AdminUserRow`), newest first |
| GET | `/api/admin/users/:publicId` | One account's stats plus per-language practice, daily activity, friends, blocks and reports (`AdminUserDetail`) |
| GET | `/api/friends` | Friends and incoming/outgoing/blocked requests |
| GET | `/api/leaderboard?window=(day\|week\|month)` | You and your friends: `{rows, me}`; `me` is your row when it's outside the top 20 |
| GET | `/api/friends/search?q=` | Exact username or email. Only whether the account exists, its person (id and username) and how you stand with it |
| POST | `/api/friends/requests` | `{userId}`, a public ID from a search or profile. If they already asked you, this accepts their request. 403 past 3 new requests in 24 hours |
| POST | `/api/friends/:id/(accept\|decline\|block\|unblock\|unfriend)` | Unfriending and blocking cancel open races. Block works from any relation but self and blocked; unblocking also drops any request they sent meanwhile |
| POST | `/api/people/:id/report` | `{reason, note}`, note may be empty. Also blocks. 409 while your earlier report on them is open |
| GET | `/api/admin/user-reports` | People reports (`AdminUserReport`), open first, with the copied and current board post |
| POST | `/api/admin/user-reports/:id/(take-down\|clear-username\|dismiss)` | Taking down or clearing also resolves the other open reports on that account for the same reason. 409 if resolved |
| GET | `/api/friend-board` | `{posted: false}`, or `{posted: true, entries}` in random order (`BoardEntry`) |
| PUT | `/api/friend-board` | `{blurb}`, empty for none. Posts or updates your entry; needs a username. Returns the board |
| DELETE | `/api/friend-board` | Takes your entry down |
| GET | `/api/profile/(:publicId\|me)` | Person and relation. `summary` (language, activity, lesson counts) is null for a stranger viewing a private profile; `details` is null unless self or friends. Never includes email. Every `:id`, `userId` and `opponentId` naming a user is a public ID |
| GET | `/api/lessons/:lessonId/compare` | Your latest run of the lesson next to your friends' |
| GET | `/api/challenges` | Settles due races; lists open ones and the past 30 days |
| POST | `/api/challenges` | `{opponentId, kind: "most", days}` or `{opponentId, kind: "first_to", target}` |
| POST | `/api/challenges/:id/(accept\|decline\|cancel)` | Only the opponent can accept or decline; only the challenger can cancel |
| GET | `/api/notifications` | Settles due races; the last 20 notifications and the unread count |
| POST | `/api/notifications/read` | |
| GET | `/audio/*`, `/assets/*`, `/*` | Static files, and the SPA fallback to `index.html` |

- Every `/api` route except auth requires a session.
- Mutating routes require `Content-Type: application/json` and a same-origin `Origin`. That plus SameSite cookies covers CSRF.
- The server clock is injectable so SRS tests can move time forward.

## Testing

- **Unit:** grader edge cases:
  - Accents: missing, wrong, extra; Italian `è`/`é`; Dutch `één`/`een`.
  - Apostrophes: `l'uomo`, `I'll`, `auto's`.
  - Case, punctuation, alignment in `none` mode, variants.

  Also tokenizer/`words` alignment, FSRS rating mapping, unlocks, and the content loader: its rules on small in-test courses, plus one load of the real content.
- API and E2E tests run against the frozen fixture content in `tests/fixtures/content` (`CONTENT_DIR`), so curriculum edits don't break them.
- **API:** `app.request()` against a temp DB. Covers auth gating, recording attempts that update notebook and cards, the review due list after the clock moves, saved explanations and the daily cap (fake model client).
- **E2E (Playwright):** dev login -> Italian -> lesson -> type a wrong answer -> assert `qa-letter-delete` / `qa-letter-insert` -> fix -> type a word with a missing accent -> assert `qa-letter-accent` -> the notebook lists the entry.

Every selector used in tests is a `qa-*` class.

## Deployment

- `npm run build` builds the SPA into `dist/web`.
- systemd runs `node server/index.ts` with `NODE_ENV=production` and the env vars in `.env.example`. In production, boot fails if `GOOGLE_CLIENT_ID` is unset, if `DEV_LOGIN=1`, or if any audio file is missing.
- Audio is rendered locally (`npm run content:audio`, macOS: needs `afconvert`) and rsynced separately.
- Scripts, host layout, secrets and nightly backups: [`devops/README.md`](../devops/README.md).

**Setup you do:** create a Google OAuth web client ID, with authorized JavaScript origins for `http://localhost:5173` and `https://ditto.topherhunt.com`.
