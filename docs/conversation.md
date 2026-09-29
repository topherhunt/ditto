# Conversation mode

Called "Talk" in the interface. A speaking track separate from dictation: a spoken back-and-forth with an AI partner, with a coach that stops the conversation until each reply is said correctly. Languages: Italian, Dutch, English. Irish is out until live Irish TTS exists. Pages: `/:lang/speak` (start, history, weak phrases) and `/:lang/speak/:id`; server in `server/conversation.ts`.

## Turn loop

1. The partner speaks a line (TTS in one fixed voice per language, `PARTNER_VOICES` in `server/speech.ts`: gpt-4o-mini-tts marin for Italian and cedar for English and Dutch, ~$0.015 per audio minute and recorded as "speech" spend); it plays by itself and its transcript shows. Lower levels hear it slower (A1 1.3, A2 1.2, B1 1.1 times as long; `PACE` in `server/conversation.ts`), but gpt-4o-mini-tts only gets the pace as an instruction, which it follows unreliably (docs/plan.md, Audio).
2. Suggested replies: three plausible replies, each steering the conversation a different way, each a polite full sentence of about 6 to 12 words even at A1. The learner may say one or say anything else. Hidden in hard mode, a per-conversation switch.
3. The learner records a reply (push-to-talk).
4. The coach judges it (below). A pass plays the success sound. A failure plays a marimba warning and pauses the conversation on the retry screen, introduced by "Good try! Here are some corrections:".
5. Once the reply passes, the partner answers and the loop repeats. If the partner's answer fails, a button retries it.

All paid calls run server-side, so they can be metered and capped.

The call that writes the partner's line and the suggestions also returns their translations into the support language, in chunks: word by word, grouping only where that would mislead (*ci vediamo* = "see you", *Le porto* = "I'll bring you"), and chunks the learner's line it answers, so past replies are glossed too. Tapping a chunk shows its translation and speaks it in the partner's voice, 30% slower (`GET /api/conversations/:id/say`, rendered on demand, ~0.7-0.9 s, and cached only by the browser; it counts toward the daily spend cap). Chunks sit unpadded so the line reads as a sentence, and on hover a chunk gets a translucent tint (visible on any bubble) and a pointer cursor. Space works the record button (not while typing). A playing line's play button turns into an orange stop button.

"How do I say...?": the learner types what they mean in their support language, gets the target-language sentence, and says it (through the coach as usual).

## Coach

The conversation trains fluency and vocabulary, not pronunciation (a separate pronunciation practice is on the [roadmap](roadmap.md#pronunciation)). OpenAI `gpt-transcribe`, steered to the conversation's language (`language`; it has no Irish), writes down what was said and reports the audio length it bills, and a text model (`CONVERSATION_MODEL`, default `gpt-6-luna`, reasoning effort `CONVERSATION_EFFORT`, default `low`) judges the transcript's grammar. It returns the sentence it thinks was meant (corrected), the fixes, a CEFR grade, and whether the reply is substantially one of the suggestions shown (`fromSuggestion`). A reply passes when the transcript already is that sentence; on a retry, the target. The learner's formal or informal address is theirs to choose and is never corrected or remarked on. The model's floor is ~0.7 s to first token; the rest of a coach call is output tokens.

The attempts route streams NDJSON progress (listening, judging, answering) so the page shows which step is running.

The speech worker (`server/speech-worker.py`, driven by `server/speech.ts`) is one long-lived Python process that fetches gpt-4o-mini-tts lines (the partner and quiz mode) from OpenAI (`OPENAI_API_KEY`, inherited from the server) and writes them as WAV. It starts on first use (about 1 s), and the server stops it after `SPEECH_IDLE_MINUTES` (default 60) without calls. It needs `.venv` with `numpy`; production installs that with `devops/provision.sh`.

- The retry screen shows the sentence to say with a button to hear it in the partner's voice, the grammar fixes, and the transcript with a button to replay the recording.
- "Say something else" rolls back to choosing a reply; the new reply goes through the coach again.
- After 5 failed tries at one sentence the coach offers to move on and records the phrase as a weak one.
- A report button on the retry screen stores the note on the attempt (`conversation_attempts.report_note`; the `reports` table needs a unit). Admins review them with spend on `/admin/speaking`.

## Scaffolding and progress

- Each learner turn records whether it came from a suggestion (the coach's `fromSuggestion`), "How do I say...?", moving on, or the learner's own words, plus chunks tapped and the coach's CEFR grade. The page shows the number of replies and "used N hints": the turns from any of the first three (`leaned`).
- A scenario is a starter (café, directions, hotel, meeting, market, weekend), any typed topic, or "surprise me". Level comes from the learner, and the partner speaks one notch above it.

## Spend

- Every paid call in the app (conversation, the "Why?" explainer, quiz audio) writes model, tokens or audio seconds, and computed cost to `api_usage` (`server/usage.ts`), tagged with user, purpose and, for conversation calls, the conversation. Prices live in code; an unknown model throws.
- A per-user daily cap (`DAILY_SPEND_CAP`, default $1), resetting at midnight UTC. `underCapOr429` (`server/usage.ts`) runs before every paid call starts: as middleware on conversation routes, and on a cache miss for the explainer and quiz audio. A request in progress may overshoot slightly. Free practice stays open; a refused call (429) sends the web app to `/cap`, which congratulates the learner and lists the free features.
- Every signed-in API response carries the learner's spend and cap (`X-Spend-Today`, `X-Spend-Cap`), shown in the footer. Admins see spend per user per day on `/admin/speaking`; conversations also show their own cost.

## Running it

Conversation mode is on when `OPENAI_API_KEY` is set and `SPEECH_PYTHON` (default `.venv/bin/python`) exists; the server logs why when it is off. Recordings and partner audio go to `SPEAK_AUDIO_DIR` (default `data/speak-audio`). `FAKE_CONVERSATION=1` swaps in scripted fakes (`server/conversation-fake.ts`) for E2E; it is refused in production.

## Not built

- Nothing reconciles `api_usage` against OpenAI's reported costs.
- Speaking the "How do I say...?" question instead of typing it.
- Reloading mid-retry loses the retry screen: failed attempts are stored but not replayed into the page.
