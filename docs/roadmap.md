# Roadmap: learning blind spots

Dictation of scaffolded single sentences trains recognition, spelling and core grammar. It leaves the gaps below against what CEFR A1+A2 describes. None of this is scheduled: it comes later, after the basic interface is polished. Each entry names the gap and a candidate approach.

## Natural speech

- **Gap:** every unit is read slowly and clearly by TTS, one sentence at a time. Real speech has connected-speech effects (elision, linking, reduced vowels), faster tempo, and background noise.
- **Idea:** a "natural speed" setting that renders a faster second take. Later levels add short clips with light noise. Recorded human speech for the sentences that matter most.

## Discourse and dialogue

- **Gap:** units are independent sentences. Learners never follow a short exchange, where a reply depends on what was just said (who, when, what was agreed).
- **Idea:** dialogue lessons. A 4-8 line exchange between two voices is dictated line by line, then a comprehension question covers the whole exchange.

## Production

- **Gap:** the learner only reproduces what they hear. Nothing asks them to build a sentence from meaning (English -> Italian) or to vary one (change the person or tense).
- **Idea:** reverse units (see the translation, type the Italian, graded against `text` and `variants`) and transformation drills generated from the existing units.

## Interaction

- **Gap:** there is no turn-taking. Learners never choose or write a fitting reply to a question.
- **Idea:** reply units. The learner hears a question, types an answer, and the answer is checked against accepted replies, or by the AI explainer for open replies (a paid call, so it needs a spend guard like the explainer's).

## Placement and skipping ahead

- **Gap:** unlocks are strictly sequential. A learner who already knows A1 has to complete every earlier module first.
- **Idea:** a placement test per level that samples sentences from each module and unlocks the modules it passes. Also a "test out" option per module.

## Speaking and pronunciation

- **Gap:** no speaking at all.
- **Idea:** shadowing mode: record the learner repeating the audio, then score it with ASR (Whisper or a browser speech API) against `text`. Pronunciation feedback per word comes later.

## Reading and writing beyond the sentence

- **Gap:** no reading of connected text and no free writing (messages, short forms), both part of A2.
- **Idea:** short texts built from a module's vocabulary, with comprehension questions. Guided writing prompts checked by the explainer.
