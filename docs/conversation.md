# Conversation mode

A speaking track separate from dictation: a spoken back-and-forth with an AI partner, with a coach that stops the conversation until each reply is said correctly. Languages: Italian, Dutch, English. Irish is out until live Irish TTS exists. Pages: `/:lang/speak` (start, history, weak phrases) and `/:lang/speak/:id`; server in `server/conversation.ts`.

## Turn loop

1. The partner speaks a line (local Piper TTS, in one of the lessons' Piper voices for the language, picked at random per conversation); it plays by itself and its transcript shows.
2. Suggested replies: three plausible replies, each steering the conversation a different way. The learner may say one or say anything else. Hidden in hard mode, a per-conversation switch.
3. The learner records a reply (push-to-talk).
4. The coach judges it (below). A failure pauses the conversation on the retry screen.
5. Once the reply passes, the partner answers and the loop repeats. If the partner's answer fails, a button retries it.

All paid calls run server-side, so they can be metered and capped.

The call that writes the partner's line and the suggestions also returns their translations into the support language, in chunks (*ci vediamo* = "see you", not word by word), and chunks the learner's line it answers, so past replies are glossed too. Tapping a chunk shows its translation; on hover a chunk gets a background color and a pointer cursor.

"How do I say...?": the learner types what they mean in their support language, gets the target-language sentence, and says it (through the coach as usual).

## Coach

The conversation trains fluency and vocabulary, not pronunciation (a separate pronunciation practice is on the [roadmap](roadmap.md#pronunciation)). OpenAI `gpt-transcribe`, steered to the conversation's language (`languages`; it has no Irish), writes down what was said and reports the audio length it bills, and a text model (`CONVERSATION_MODEL`, default `gpt-6-luna`, reasoning effort `CONVERSATION_EFFORT`, default `low`) judges the transcript's grammar. It returns the sentence it thinks was meant (corrected), the fixes, and a CEFR grade. A reply passes when the transcript already is that sentence; on a retry, the target. The learner's formal or informal address is theirs to choose and is never corrected or remarked on. The model's floor is ~0.7 s to first token; the rest of a coach call is output tokens.

The attempts route streams NDJSON progress (listening, judging, answering) so the page shows which step is running.

The speech worker (`server/speech-worker.py`, driven by `server/speech.ts`) is one long-lived Python process in which Piper voices the partner. It starts on first use (about 1 s), keeps one voice loaded (a conversation speaks in one; switching reloads in ~0.5 s), and holds 170-250 MB, so the server stops it after `SPEECH_IDLE_MINUTES` (default 60) without calls. It needs `.venv` with Piper and the voices in `tools/piper-voices`; production installs these with `devops/provision.sh`.

- The retry screen shows the sentence to say with a button to hear it in the partner's voice, the grammar fixes, and the transcript with a button to replay the recording.
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
