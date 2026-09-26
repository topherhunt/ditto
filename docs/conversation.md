# Conversation mode

A speaking track separate from dictation: a spoken back-and-forth with an AI partner, with a coach that stops the conversation until each reply is said correctly. Languages: Italian, Dutch, English. Irish is out until live Irish TTS exists. Pages: `/:lang/speak` (start, history, weak phrases) and `/:lang/speak/:id`; server in `server/conversation.ts`.

## Turn loop

1. The partner speaks a line (local Piper TTS) and its transcript shows.
2. Suggested replies: three plausible replies, each steering the conversation a different way. The learner may say one or say anything else. Hidden in hard mode, a per-conversation switch.
3. The learner records a reply (push-to-talk).
4. The coach judges it (below). A failure pauses the conversation on the retry screen.
5. Once the reply passes, the partner answers and the loop repeats. If the partner's answer fails, a button retries it.

All paid calls run server-side, so they can be metered and capped.

The call that writes the partner's line and the suggestions also returns their translations into the support language, in chunks (*ci vediamo* = "see you", not word by word). Tapping a chunk shows its translation; on hover a chunk gets a background color and a pointer cursor.

"How do I say...?": the learner types what they mean in their support language, gets the target-language sentence, and says it (through the coach as usual).

## Coach

Each reply is heard three ways, and a text model (`CONVERSATION_MODEL`, default `gpt-6-luna`, reasoning effort `CONVERSATION_EFFORT`, default `low`) makes sense of them. At effort `none` the coach answers in about 3.5 s instead of 5–8 s but missed a wrong final vowel that `low` caught:

- **transcript**: OpenAI `gpt-transcribe`, what words were said.
- **heard**: a local phone recognizer (wav2vec2 `facebook/wav2vec2-xlsr-53-espeak-cv-ft`) on the learner's audio, as space-separated IPA.
- **want / native**: the target sentence as eSpeak IPA, and the same recognizer run on a Piper rendering of it. `native` shows which differences are recognizer noise rather than learner error.

The target is the retry screen's sentence on a retry, else the transcript. The coach returns the sentence it thinks was meant (corrected), grammar fixes, a per-word sound verdict with hints, and a CEFR grade. A reply passes only if grammar and pronunciation both pass. The learner's formal or informal address is never corrected unless their own reply mixes both or it would be a faux pas anywhere. Hints and feedback are plain words in the support language with sounds respelled ("vor-RAY"), never IPA. The prompt (`server/conversation-ai.ts`) is maximally strict and says a false pass is the worst failure; it tolerates only tʃ/dʒ and k/g at word start, length and stress marks (except Dutch aa/a, ee/e, oo/o), Italian e/ɛ and o/ɔ, and differences `native` shows too. A single consonant where native has a double fails.

The speech worker (`server/speech-worker.py`, driven by `server/speech.ts`) is one long-lived Python process that loads its models on first use (about 10 s). On CPU it holds about 1.6 GB: torch ~400 MB, the wav2vec2 recognizer ~0.7–1.2 GB, Kokoro (loaded only for its phonemizer) ~500 MB, a Piper voice ~100 MB. Warm, the local steps of a reply take about 0.5 s; the OpenAI calls take the rest. It needs `.venv` with the phonemizer, the recognizer and Piper, the voices in `tools/piper-voices`, and ffmpeg.

The dev-only admin page `/admin/pronunciation` (`server/poc.ts`) records correct and deliberately mispronounced takes to `data/poc/`, and `scripts/pronunciation-poc.ts` scores judges against them.

Trap: a mispronunciation that makes a different real word (*fato* for *fatto*) may be transcribed as that word. The phone recognizer and the grammar check are the backstops.

- The retry screen shows the sentence to say with a button to hear it in the partner's voice, grammar fixes, notes on the flagged sounds, what was heard, and (collapsed) the raw IPA.
- "Say something else" rolls back to choosing a reply; the new reply goes through the coach again.
- After 5 failed tries at one sentence the coach offers to move on and records the phrase as a weak one.
- A report button on the retry screen stores the note on the attempt (`conversation_attempts.report_note`; the `reports` table needs a unit). Admins review them with spend on `/admin/speaking`.

## Scaffolding and progress

- Each learner turn records whether it came from a suggestion (exact match after normalizing), "How do I say...?", moving on, or the learner's own words, plus chunks tapped and the coach's CEFR grade. Reliance shows subtly on screen; it never hides the suggestions. Paraphrasing a suggestion counts as the learner's own.
- A scenario is a starter (café, directions, hotel, meeting, market, weekend), any typed topic, or "surprise me". Level comes from the learner, and the partner speaks one notch above it.

## Spend

- Every conversation call writes model, tokens or audio seconds, and computed cost to `api_usage` (`server/usage.ts`), tagged with user, conversation and purpose. Prices live in code; an unknown model throws.
- A per-user daily cap (`DAILY_SPEND_CAP`, default $5), resetting at midnight UTC, checked before each paid request starts, so a request in progress may overshoot slightly.
- An admin table of spend per user per day, and an in-session cost meter for the learner.

## Running it

Conversation mode is on when `OPENAI_API_KEY` is set and `SPEECH_PYTHON` (default `.venv/bin/python`) exists; the server logs why when it is off. Recordings and partner audio go to `SPEAK_AUDIO_DIR` (default `data/speak-audio`). `FAKE_CONVERSATION=1` swaps in scripted fakes (`server/conversation-fake.ts`) for E2E; it is refused in production.

## Not built

- The explainer's calls don't go through `api_usage`, and nothing reconciles it against OpenAI's Costs API.
- Speaking the "How do I say...?" question instead of typing it.
- Reloading mid-retry loses the retry screen: failed attempts are stored but not replayed into the page.
