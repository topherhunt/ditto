# Conversation mode (design, not built)

A speaking track separate from dictation: a spoken back-and-forth with an AI partner, with a coach that stops the conversation until each reply is said correctly. Languages: Italian, Dutch, English. Irish is out until live Irish TTS exists.

## Turn loop

1. The partner speaks a line (live TTS) and its transcript shows as it plays.
2. Suggested replies: three plausible replies, each steering the conversation a different way. The learner may say one or say anything else. Hidden in hard mode, a manual switch.
3. The learner records a reply (push-to-talk).
4. Speech-to-text writes down what was said. A text model checks its grammar: if wrong, the retry screen shows the corrected sentence and the judge scores the retry against it; if right, the judge scores this audio against the transcript. Either failure pauses the conversation (see Coach).
5. Once the reply passes, the partner answers and the loop repeats.

The loop is turn-based: the coach pauses every turn, so a streaming realtime session buys nothing. All paid calls run server-side, so they can be metered and capped. A realtime-only judge model is still usable, one server-side WebSocket request per attempt.

The call that writes the partner's line and the suggestions also returns their translations into the support language, in chunks (*ci vediamo* = "see you", not word by word). Tapping a chunk shows its translation; on hover a chunk gets a background color and a pointer cursor.

"How do I say...?": the learner says or types what they mean in their support language, gets the target-language sentence, and says it (through the coach as usual).

## Coach

- The retry screen shows the sentence the coach thinks the learner meant, with grammar fixes marked, plus notes on the flagged sounds (e.g. "hold the double t in *fatto*, or it sounds like *fato*"). The learner reads it aloud, and retries until it passes.
- "Say something else" leaves the coach and rolls back to choosing a reply, for when the learner changes their mind or the coach misread the meaning. The new reply goes through the coach again.
- After 5 failed attempts the coach offers to move on and records the phrase as a weak area.
- A report button on the retry screen, stored in the existing reports table, for being trapped by a wrong judgment.
- Strictness defaults to maximal: any missing, extra or substituted sound fails; accent and rhythm don't. A setting may loosen it later.

## Pronunciation judge

An OpenAI audio-input model, prompted to find errors rather than understand intent: it gets the audio plus the intended sentence, returns expected-vs-heard per word with a verdict, and is told a false pass is the worst failure. No Azure, no self-hosted phoneme recognizer.

Strictness is unproven. OpenAI makes no pronunciation-assessment claims for any model, and published zero-shot tests of GPT-4o (English, Speechocean762) correlate weakly with human raters, especially per phoneme (0.24, against 0.69 for a purpose-built model). Candidates as of 2026-09, all at $32/1M audio input tokens: `gpt-realtime-2` (reasoning, Realtime endpoint only) and `gpt-audio-1.5` (Chat Completions).

Trap: a mispronunciation that makes a different real word (*fato* for *fatto*) may be transcribed as that word, and the judge then passes it. The grammar check is the backstop.

A proof of concept (`scripts/pronunciation-poc.ts`) decides the model before the coach is built: recorded Italian and Dutch clips, correct takes plus deliberate errors (an added t, a dropped double consonant, a wrong vowel, a different-word slip), each judged several times per model. The existing TTS clips of the same sentences must pass. Takes are recorded on the dev-only admin page `/admin/pronunciation` (`server/poc.ts`), which writes them and `clips.json` to `data/poc/`. Pick the model that fails the errors consistently without failing correct takes; if none does, revisit the design.

## Scaffolding and progress

- Each turn records whether the learner used a suggestion, paraphrased one, said their own reply, or used "How do I say...?", plus chunks tapped and a complexity grade (a text-model call scoring against CEFR descriptors). Overall reliance shows subtly on screen; it never hides the suggestions.
- Conversations are stored and browsable, showing complexity and reliance over time.
- A scenario is a setting or role card (a café, asking directions, arguing about politics); level comes from the learner, not the scenario, and the partner speaks one notch above it. Entry points: starter scenarios, "surprise me", or any typed topic.

## Spend

Far more expensive than dictation, so metering comes first:

- Every paid call (conversation and the existing explainer) goes through one wrapper that writes model, text and audio tokens in/out, and computed cost to an `api_usage` table, tagged with user, conversation, turn and purpose. Costs come from a price table in code, reconciled daily against OpenAI's organization Costs API.
- A per-user daily cap of $5, resetting at midnight UTC, checked before each turn starts (a turn in progress may overshoot slightly).
- An admin dashboard of spend per user over time, and an in-session cost meter for the learner.

## Build order

1. Pronunciation judge proof of concept (a paid run, confirmed before running).
2. Spend ledger, cap and dashboards.
3. Conversation loop: live TTS, transcript, suggestions with tap-to-translate, "How do I say...?", stored history.
4. Coach: grammar and pronunciation gate, retry screen, move-on, report.
5. Reliance indicator, complexity grade, history view.
