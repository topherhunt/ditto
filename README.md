# Ditto

Ditto is a dictation trainer for language learners. You listen to a word, phrase or sentence in the language you're learning, type what you hear, and get letter-level feedback. Then a quick meaning check makes sure you understood it, not just spelled it. It runs at https://ditto.topherhunt.com.

## Features

- 🎧 Scaffolded lessons: words build into chunks, and chunks build into full sentences.
- 🗣️ Several native-sounding voices per language, picked at random per item, with a slow-playback button.
- ✍️ Letter-level diffs that are lenient on accents, with per-word hints and a "show answer" escape hatch.
- 🧠 A meaning check after each item, then tappable words that play word audio and show a gloss.
- 📓 A mistakes notebook with focused practice. An entry leaves after two clean attempts in a row.
- 🔁 Spaced review, scheduled with FSRS.
- 🤔 An on-demand AI explainer ("Why was that wrong?"), cached per mistake.
- 🏁 Friends, profiles, weekly leaderboards and races.
- 🌍 A UI in English, Latin American Spanish, Dutch and Italian.

## Courses

| Language | Content | Support languages |
|---|---|---|
| Italian (`it`) | A1 to B1 curriculum, [docs/curriculum-it.md](docs/curriculum-it.md) | English, Spanish, Dutch |
| English (`en`) | A1 and A2, [docs/curriculum-en.md](docs/curriculum-en.md) | Spanish, Italian |
| Irish (`ga`) | A1, [docs/curriculum-ga.md](docs/curriculum-ga.md) | English |
| Dutch (`nl`) | One seed module | English |

Course content is JSON in `content/courses/{lang}/`, validated at boot. The schema and rules are in [docs/plan.md](docs/plan.md#content-model).

## Stack

A single Node process serves the SPA, the JSON API and the audio files.

- Server: Node 24+ running TypeScript directly, [Hono](https://hono.dev), SQLite via `node:sqlite`.
- Web: [SolidJS](https://www.solidjs.com), `@solidjs/router`, Vite, Bootstrap 5 (CSS only).
- Tests: Vitest (unit and API) and Playwright (E2E).

The design doc is [docs/plan.md](docs/plan.md).

## Setup

You need Node 24+ and, to render audio, macOS (the renderer encodes with `afconvert`) and Python 3.

```sh
npm install
cp .env.example .env    # DEV_LOGIN=1 gives you a dev sign-in form locally
npm run dev             # API on :3000, Vite on :5173
```

`OPENAI_API_KEY` is optional; without it the "Why?" explainer is disabled. `GOOGLE_CLIENT_ID` is only needed for real sign-in.

### Audio

Audio files are generated, not committed. Set up the text-to-speech tools once:

```sh
python3 -m venv .venv
.venv/bin/pip install piper-tts kokoro-onnx numpy
```

Then put the Piper voice models named in `VOICES` (`server/content.ts`) in `tools/piper-voices/` ([rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)), and `kokoro-v1.0.onnx` plus `voices-v1.0.bin` in `tools/kokoro/` ([kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases)).

```sh
npm run content:audio            # renders only missing files into content/audio/
npm run content:audio -- --prune # also deletes files no content references
```

Irish audio comes from ABAIR's online service rather than a local model, so it needs no setup. The renderer sends those requests one at a time, with a pause after each, to go easy on a free service.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Server (with `--watch`) and Vite dev server |
| `npm run build` | Builds the SPA into `dist/web` |
| `npm start` | Runs the server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit and API tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright), against frozen fixture content |
| `npm run content:validate` | Validates all course JSON; add `--require-audio` to also check every audio file exists |
| `npm run content:audio` | Renders missing audio |

## Deployment

`bash devops/deploy.sh` runs the quality gates, then ships to the VPS. See [devops/README.md](devops/README.md).

## Credits and thanks 💙

**Go raibh míle maith agaibh to [ABAIR](https://abair.ie).** Every Irish sentence in Ditto is spoken by ABAIR's native-speaker voices (here, Neasa and Colm from Munster). ABAIR is a research project at the Phonetics and Speech Laboratory of Trinity College Dublin, and it offers Irish speech technology for free. A language you can hear is a language you can learn, and ABAIR makes Irish something people can hear. Thank you. *Irish text-to-speech by [ABAIR, Trinity College Dublin](https://abair.ie).*

Voices for the other languages come from [Piper](https://github.com/rhasspy/piper) and [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M). Thanks to their authors and to the voice datasets behind them.

Made with 💙 by Topher Hunt.
