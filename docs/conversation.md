# Conversation mode

Called "Talk" in the interface. A speaking track separate from dictation: a spoken back-and-forth with an AI partner, with a coach that stops the conversation until each reply is said correctly. Languages: Italian, Dutch, English, Spanish, French, Greek. Irish is out until live Irish TTS exists. Pages: `/:lang/speak` (start, history, weak phrases) and `/:lang/speak/:id`; server in `server/conversation.ts`. Glosses are in the learner's own language (`conversations.locale`), or the course's support language when their own is the one practiced. The coach writes in that too, or in the course's language with help immersion on (`conversations.help_locale`). Titles do the same with interface immersion (`conversations.ui_locale`).

## Turn loop

1. The partner speaks a line (TTS in the voice picked at random from the language's two (`VOICES`, `server/content.ts`; sarah F, george M) when the conversation starts and kept in `conversations.voice`, on Eleven v4 Turbo, $40 per 1M characters and recorded as "speech" spend); it plays by itself and its transcript shows. Every level gets the same pace from TTS, since v4 Turbo has no speed control (docs/plan.md, Audio). Instead, the browser slows it: "Slow speech" (`prefs.slowTalk`, per course, on the Talk page's settings and beside the tap hint in a conversation) plays every line, suggestion and tapped chunk at `SLOW_TALK_RATE` (0.75, pitch kept). The learner's own recordings stay at 1×.
2. Suggested replies: three plausible replies, each steering the conversation a different way, each a polite full sentence of about 6 to 12 words even at A1. The learner may say one or say anything else. Hidden in hard mode, a per-conversation switch.
3. The learner records a reply (push-to-talk).
4. The coach judges it (below). A pass plays the success sound. A failure plays a marimba warning and pauses the conversation on the retry screen, introduced by "Good try! Here are some corrections:".
5. Once the reply passes, the partner answers and the loop repeats. If the partner's answer fails, a button retries it.

All paid calls run server-side, so they can be metered and capped.

Lines and suggestions come with translations into the support language, in chunks: word by word, grouping only where that would mislead (*ci vediamo* = "see you", *Le porto* = "I'll bring you"). The call that writes the partner's line chunks its suggestions; a second, smaller call (`gloss`) chunks the partner's line and the learner's line it answers, so past replies are glossed too. The gloss takes ~4 s against ~1.75 s for the speech (output tokens: one JSON entry per word), so the turn is returned and played once its speech is ready, and the gloss finishes in the background; the page then fetches `GET /api/conversations/:id/glosses`, which waits for any gloss in progress (held in memory, so a restart mid-gloss leaves those turns plain). A failed gloss (an error, or the wrong number of lines back) is retried once and logged as `Gloss failed`; if both tries fail, the turn is kept and shown as plain text without tooltips. A word tapped while its line's chunks are still on their way (a turn's or the "How do I say...?" sentence's) shows a loading tooltip, and their arrival replays the tap on the chunk holding it; a failed gloss just closes it. Chunks that don't join back into their line are stored anyway and logged as `Gloss mismatch`. Tapping a chunk shows its translation and speaks it in the partner's voice (`GET /api/conversations/:id/say`, rendered on demand, ~0.7-0.9 s, and cached only by the browser; it counts toward the daily spend cap). Chunks sit unpadded so the line reads as a sentence, and on hover a chunk gets a translucent tint (visible on any bubble) and a pointer cursor. Space works the record button (not while typing). A playing line's play button turns into an orange stop button.

"How do I say...?": tapping it opens the mic at once (start cue, pulsing mic, Stop button); the learner says what they mean in their own language, `gpt-transcribe` steered to that language writes it down, and a text call gives the target-language sentence, which the learner then says (through the coach as usual). The call returns the bare sentence, since chunking it would multiply its output tokens (~5.8 s chunked); the route streams it as soon as it's written, then glosses it with the `gloss` call and sends its chunks, which make it tappable like any line. There is no typing; the recording is sent for transcription and never stored, like a reply.

## Coach

The conversation trains fluency and vocabulary, not pronunciation (a separate pronunciation practice is on the [roadmap](roadmap.md#pronunciation)). OpenAI `gpt-transcribe`, steered to the conversation's language (`language`; it has no Irish), writes down what was said and reports the audio length it bills, and a text model (`CONVERSATION_MODEL`, default `gpt-6-luna`, reasoning effort `CONVERSATION_EFFORT`, default `low`) judges the transcript's grammar. It returns the sentence it thinks was meant (corrected), the fixes, a CEFR grade, and whether the reply is substantially one of the suggestions shown (`fromSuggestion`). A reply passes when the transcript already is that sentence; on a retry, the target. The learner's formal or informal address is theirs to choose and is never corrected or remarked on. The transcriber can spell a word the way a neighbouring language does (German "Bett" for Dutch "bed"); the coach takes a word that sounds the same or nearly so as the target-language word, and one whose sounds clearly differ ("Wasser" for "water") still fails, with feedback that allows for a mishearing (`neighbors` in `EXAMPLES`). The model's floor is ~0.7 s to first token; the rest of a coach call is output tokens.

The attempts route streams NDJSON progress (listening, judging, answering) so the page shows which step is running.

`server/speech.ts` fetches Eleven v4 Turbo lines (the partner and quiz mode) from OpenRouter as PCM, with a language tag on 1-2 word lines (`speechInput`) and zero data retention required, and writes them as WAV. A render that stalls for 20 s is retried once, so a line fails after 40 s at most; an HTTP error fails at once.

- The retry screen shows the sentence to say with a button to hear it in the partner's voice, the grammar fixes, and the transcript with a button to replay the recording.
- A recording is sent to transcription as bytes and never written to the server, for anyone, admins included. The page keeps it in IndexedDB for 30 days so the learner can replay it, and sign-out clears it (`web/src/recordings.ts`).
- "Say something else" rolls back to choosing a reply; the new reply goes through the coach again.
- After 5 failed tries at one sentence the coach offers to move on and records the phrase as a weak one.
- A report button on the retry screen stores the note on the attempt (`conversation_attempts.report_note`; the `reports` table needs a unit). Admins review them with spend on `/admin/speaking`.

## Scaffolding and progress

- Each learner turn records whether it came from a suggestion (the coach's `fromSuggestion`), "How do I say...?", moving on, or the learner's own words, plus chunks tapped and the coach's CEFR grade. The page shows the number of replies and "used N hints": the turns from any of the first three (`leaned`).
- A scenario is a starter (café, directions, hotel, meeting, market, weekend), any typed topic, or "surprise me". Level comes from the learner, and the partner speaks one notch above it.

## Spend

- Every paid call in the app (conversation, the "Why?" explainer, quiz audio) writes model, tokens or audio seconds, and computed cost to `api_usage` (`server/usage.ts`), tagged with user, purpose and, for conversation calls, the conversation. Prices live in code; an unknown model throws.
- A per-user daily cap (`DAILY_SPEND_CAP`, default $1), resetting at midnight UTC. `underCapOr429` (`server/usage.ts`) runs before every paid call starts: as middleware on conversation routes, and on a cache miss for the explainer and quiz audio. A request in progress may overshoot slightly. Free practice stays open; a refused call (429) sends the web app to `/cap`, which congratulates the learner and lists the free features.
- Every signed-in API response carries the learner's spend and cap (`X-Spend-Today`, `X-Spend-Cap`), shown in the footer. Admins see spend per user per day on `/admin/speaking`, per user on `/admin/users` and per day on `/admin/metrics`; conversations also show their own cost.
- The ledger is kept whole. Its only index is `(user_id, created_at)`, which keeps the cap check fast at any size; the admin reports scan up to 30 days. A row is ~150 bytes with its index; a spoken reply writes 4-5 rows, so 100 learners doing 50 replies a day add ~8M rows (~1.2 GB) a year. Past a few million rows, or if `/admin/*` slows, fold rows older than ~90 days into a per-user, per-day, per-purpose total table (as `rollUpMetrics` does, [metrics.md](metrics.md)): lifetime totals stay exact and only per-call detail is lost. Deleting an account deletes its ledger rows (cascade).

## Running it

Conversation mode is on when `OPENAI_API_KEY` is set; the server logs a warning when it is off. Partner audio goes to `SPEAK_AUDIO_DIR` (default `data/speak-audio`). `FAKE_CONVERSATION=1` swaps in scripted fakes (`server/conversation-fake.ts`) for E2E; it is refused in production.

## Not built

- Nothing reconciles `api_usage` against OpenAI's reported costs.
- Reloading mid-retry loses the retry screen: failed attempts are stored but not replayed into the page.
