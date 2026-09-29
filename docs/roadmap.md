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
- **Idea:** spoken conversation mode, designed in [conversation.md](conversation.md).

## Placement and skipping ahead

- **Gap:** a level test skips a whole level or nothing. A learner who knows half of A2 still starts at its first module.
- **Idea:** a "test out" option per module, built on the level test.

## Pronunciation

- **Gap:** conversation mode trains fluency and judges grammar only; nothing tells a learner which sounds they get wrong.
- **Idea:** a separate pronunciation practice, so it never interrupts the conversation. Commit 88c3776 built a version inside conversation mode:
  - A phone recognizer (wav2vec2 `facebook/wav2vec2-xlsr-53-espeak-cv-ft`) heard the learner as IPA. A text model compared it with espeak's IPA for the sentence and gave respelled hints ("vor-RAY").
  - The recognizer is noisy even on native speech (drops glides and unstressed vowels, merges doubles). The judge had to be lenient: fail only a clearly different sound, an extra or missing consonant or stressed vowel, or a wrong Italian final vowel.
  - It holds ~1 GB on CPU, too much for the production VPS, so it needs GPU or serverless hosting (Modal, Replicate, RunPod).
  - The dev-only `/admin/pronunciation` recorder and `scripts/pronunciation-poc.ts` still score candidate judges.

## Custom quiz decks

- **Gap:** Quiz mode offers only the preset decks. Learners can't drill their own material, which matters for making Ditto their own learning app.
- **Idea:** upload a CSV in the preset format (`docs/quizzes.md`) as a deck owned by the learner (`quiz_decks.owner_id`), validated by the same `parseDeck`. The upload page offers a prompt to paste into any chatbot:

  > Create a CSV flashcard deck for studying [TOPIC]. Target level: [BEGINNER / INTERMEDIATE / ADVANCED]. Language: [LANGUAGE].
  >
  > Use this exact header row:
  > title,question,correct,wrong1,wrong2,wrong3,explanation
  >
  > Generate [NUMBER] multiple-choice questions. Each row must have exactly 7 comma-separated columns. Wrap any field that contains a comma in double quotes. The "explanation" column should give a brief reason why the correct answer is right.
  >
  > Output ONLY the CSV with no other text.

## Reading and writing beyond the sentence

- **Gap:** no reading of connected text and no free writing (messages, short forms), both part of A2.
- **Idea:** short texts built from a module's vocabulary, with comprehension questions. Guided writing prompts checked by the explainer.
