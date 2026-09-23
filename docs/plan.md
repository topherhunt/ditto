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
- Practice: audio autoplay, replay, and 0.75x speed, in one of four voices picked at random per unit; per-word inputs with a hint level; letter-level diff; lenient accents; per-word hint; show answer.
- After each item (`it`/`nl`): a meaning check, which asks the learner to pick the translation out of three options. Then the full text, the translation, and tappable words that play word audio and show a gloss.
- Mistakes notebook, with focused practice of notebook items.
- Scheduled review (FSRS).
- AI explainer: a "Why?" button on any mistake that explains and categorizes it. Results are cached and attached to the notebook entry.
- Content: the full Italian A1+A2 curriculum (21 main and 7 optional modules, [curriculum-it.md](curriculum-it.md)); a one-module seed course for `en` and `nl`.

**Later**

- English and Dutch A1+A2 content.
- A stats page (accuracy, hint rate, streaks).
- Deploy automation.
- The learning blind spots in [roadmap.md](roadmap.md).

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
| AI | `openai` SDK, Responses API with a strict JSON-schema output, model `gpt-6-luna` (`EXPLAIN_MODEL`) | About $0.0004 per uncached explanation ($0.10 / $0.50 per 1M in/out tokens) |
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

Filenames are content-addressed: `sha1(renderVersion|lang|voice|text)` -> `/audio/{lang}/{hash}.m4a` (AAC plays in every browser). Bumping `RENDER_VERSION` in `server/content.ts` re-renders everything. Slow playback uses the browser's `playbackRate`, not a second render. Identical text across courses shares one file. Node serves the files with `Cache-Control: immutable`.

The server computes the URLs when it loads content, so there is no manifest. It fails at boot if a referenced file is missing (a warning in dev). Every unit and every word has one file per voice; the served `audio` arrays follow the voice order in `VOICES` (`server/content.ts`). Word audio is keyed on the lowercase surface form.

Voices, four per language, both genders:
- `en`: Piper amy, lessac (F) and ryan, joe (M).
- `it`: Piper paola, serena and Kokoro if_sara (F), plus Kokoro im_nicola (M). Kokoro has no other Italian voices.
- `nl`: Piper pim, ronnie (M) and two speakers of the multi-speaker `nl_NL-mls` model (F, chosen by median pitch).

`scripts/build-audio.ts` renders only missing files, with one `scripts/tts-render.py` process per voice in parallel. `--prune` also deletes files no content references. The renderer:
1. synthesizes with Piper or Kokoro (both installed in the gitignored `.venv`);
2. trims silence, matches loudness (RMS 0.08, peak capped at 0.95) and pads 150ms at each end;
3. encodes with `afconvert` into a `.part` file, then renames it, so an interrupted run never leaves a truncated file.

Models live in the gitignored `tools/piper-voices/` and `tools/kokoro/`.

## Content model

```jsonc
// content/courses/it/it-a1-bar.json
{
  "id": "it-a1-bar", "language": "it", "level": "A1", "order": 1,
  "title": "Al bar", "description": "Ordering coffee and snacks",
  "track": "main", "requires": [], "introduces": ["volere", "il", "lo", "prendere", "grazie"],
  "lexicon": {
    "vorrei": { "lemma": "volere", "pos": "VERB", "gloss": "I would like (conditional)" },
    "lo":      { "lemma": "il", "pos": "DET", "gloss": "the (before s+consonant, z)" },
    "lo#pron": { "lemma": "lo", "pos": "PRON", "gloss": "it / him" }
  },
  "lessons": [{
    "id": "it-a1-bar-1", "title": "Un caffè, per favore",
    "grammarFocus": ["indefinite articles", "vorrei + noun"],
    "units": [
      { "id": "it-a1-bar-1-u01", "rev": 1, "stage": "word", "text": "vorrei", "translation": "I would like",
        "distractors": ["I would pay", "I can have"] },
      { "id": "it-a1-bar-1-u04", "rev": 1, "stage": "sentence", "text": "Lo prendo grazie.",
        "translation": "I'll take it, thanks.", "distractors": ["I'll pay for it, thanks.", "I'll leave it, thanks."],
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
- Unit `id`s are permanent and never reused. Bump `rev` when the text changes, which invalidates cached explanations.
- There is no `translation` for `en` courses yet. The field becomes a locale map when a second support language is needed.

## Practice settings (per user, per language)

- **Path:** `full` (every stage) / `chunks` (chunk + sentence) / `sentences` (sentence only).
- **Hints:** `letters` (first letter + a dot per letter) / `initial` (first letter only) / `none` (a single free-text box, so the word count isn't revealed either).
- Also: autoplay count, playback rate.

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
5. **Variants:** the answer passes if it matches the main text or any variant under the same rules.
6. **Unit outcome** for an attempt:
   - `clean`: no wrong submissions and no hints.
   - `hinted`: no wrong submissions, but at least one hint.
   - `corrected`: at least one wrong submission, then fixed.
   - `revealed`: the answer was shown.

   A deterministic category is attached to each wrong word: `spelling`, `missing_word`, `extra_word`, or `word_order` (the same word missing in one place and extra in another).

## Learning flow

- **Learn:** units play in lesson order, filtered by Path, and position is saved per lesson and path.
- **Unlocks** (`server/unlocks.ts`): a course unlocks when every course it requires is complete (all lessons, on any path). Within it, a lesson unlocks when the one before is complete. A learn-mode attempt on a locked lesson gets a 403. Review and the notebook are never locked.
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
- It asks the model for structured output: `{ categories: [...], summary: string, details: string }`. Categories come from a fixed taxonomy: `spelling`, `mishearing`, `homophone`, `agreement`, `conjugation`, `article`, `preposition`, `elision_contraction`, `word_order`, `missing_word`, `extra_word`, `vocabulary`, `other`.
- **Cache:** the `explanations` table, keyed by `(unit_id, rev, answer key, model)`. The answer key is lowercased and whitespace-collapsed, and it keeps punctuation. It is shared across users, so a repeated mistake is free.
- **Spend guards:**
  - The endpoint only runs when a user clicks "Why?".
  - A per-user daily cap (`EXPLAIN_DAILY_LIMIT`, default 50).
  - The route returns 503 with a clear message when `OPENAI_API_KEY` is unset. The key stays server-side.
  - Tests use a fake client.

## Data model (SQLite)

```sql
users(id PK, google_sub UNIQUE, email, name, picture, prefs JSON, created_at)
sessions(token_hash PK, user_id FK, created_at, expires_at)
attempts(id PK, user_id, unit_id, unit_rev, course_id, lesson_id, mode  -- learn|mistakes|review
         , path, hints_level, outcome, wrong_submissions, hints_used, replays, accent_slips,
         submissions JSON, duration_ms, created_at)
lesson_progress(user_id, lesson_id, path, next_index, completed_at, PK(user_id, lesson_id, path))
mistakes(user_id, unit_id, first_wrong_at, last_wrong_at, wrong_count, last_answer,
         categories JSON, clean_streak, removed_at, PK(user_id, unit_id))
review_cards(user_id, unit_id, language, due, card JSON  -- ts-fsrs Card; `due` duplicated for the index
             , PK(user_id, unit_id))
explanations(id PK, unit_id, unit_rev, answer_key, model, categories JSON, summary, details, created_at,
             UNIQUE(unit_id, unit_rev, answer_key, model))
explain_usage(user_id, day, count, PK(user_id, day))
```

Migrations are numbered `.sql` files applied at boot and tracked with `PRAGMA user_version`. Content lives in JSON, not the DB. The DB references units by `unit_id` only.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/config` | Public: Google client ID and whether dev login is on |
| POST | `/api/auth/google` | `{credential}` from Google Identity Services. The server verifies the ID token (`google-auth-library`), checks `ALLOWED_EMAILS`, and sets an httpOnly `Secure` `SameSite=Lax` session cookie |
| POST | `/api/auth/dev` | Enabled only when `DEV_LOGIN=1`. Used by E2E tests |
| POST | `/api/auth/logout` | |
| GET | `/api/me` | User and prefs |
| PUT | `/api/prefs` | |
| GET | `/api/catalog?lang=` | The language's full courses (with audio URLs) and the user's per-lesson, per-path progress, plus review-due and notebook counts |
| POST | `/api/attempts` | Records the attempt and updates lesson_progress, mistakes and review_cards in one transaction |
| GET | `/api/review?lang=` | Due units with full payloads |
| GET | `/api/mistakes?lang=` | Notebook entries with unit payloads and cached explanations |
| DELETE | `/api/mistakes/:unitId` | |
| POST | `/api/explain` | See above |
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
- **API:** `app.request()` against a temp DB. Covers auth gating, recording attempts that update notebook and cards, the review due list after the clock moves, explainer caching and the daily cap (fake model client).
- **E2E (Playwright):** dev login -> Italian -> lesson -> type a wrong answer -> assert `qa-letter-delete` / `qa-letter-insert` -> fix -> type a word with a missing accent -> assert `qa-letter-accent` -> the notebook lists the entry.

Every selector used in tests is a `qa-*` class.

## Deployment

- `npm run build` builds the SPA into `dist/web`.
- systemd runs `node server/index.ts` with `NODE_ENV=production` and the env vars in `.env.example`. In production, boot fails if `GOOGLE_CLIENT_ID` is unset, if `DEV_LOGIN=1`, or if any audio file is missing.
- Audio is rendered locally (`npm run content:audio`, macOS: needs `afconvert`) and rsynced separately.
- Caddy config: `lang.example.com { reverse_proxy localhost:3000 }`.
- Backup: a nightly `sqlite3 app.db ".backup ..."`.

**Setup you do:** create a Google OAuth web client ID, with authorized JavaScript origins for `http://localhost:5173` and `https://ditto.topherhunt.com`.
