# General Language Quizzes

## Overview

General-purpose multiple-choice quiz decks for language learners across four languages (Dutch, Greek, English, Italian) and eight CEFR-aligned levels (A1, A1+, A2, A2+, B1, B1+, B2, B2+). Each deck contains ~50 items in 4-option multiple-choice format, consumed by the quizzer app (`quizzer/quizzer.html`).

### Status

- AR, EL, IT, FR, and NL have been reviewed for quality.

### Useful snippets

- CREATE DECK: Please read source/tools/quizzer/quizzes/PROJECT.md. Your task is to create decks for Arabic, carefully conforming to the quality criteria described there. Use sub-agents.

- REVIEW DECKS: Please read source/tools/quizzer/quizzes/PROJECT.md and then use subagents to thoroughly review all decks in source/tools/quizzer/quizzes/ar/. Does all content conform to the quality-check criteria? Any correct answers marked incorrect? Any confusing questions that need to be clearer to elicit the to-learn rule?

- REVIEW CHANGES: Please read source/tools/quizzer/quizzes/PROJECT.md and then thoroughly review all changes in source/tools/quizzer/quizzes/en/. Do the changes all conform to the quality-check criteria? Do they all make the questions better and more unambiguous? Do any of them make the questions inappropriately more confusing or harder?

## CSV format

```
"title","question","correct","wrong1","wrong2","wrong3","explanation"
```

7 columns. No `module` column (the deck itself is the module). No `wrong4` column.

## Deck structure

Each language/level combination gets **4 decks**:

| Deck | Purpose |
|------|---------|
| **Vocab 1** | Core thematic vocabulary for the level |
| **Vocab 2** | Second vocabulary theme for the level |
| **Grammar 1** | Introduces grammar constructs at the level — straightforward, pattern-recognition style |
| **Grammar 2** | Same constructs, harder — nuance, exceptions, tricky contexts, easy-to-confuse pairs |

Grammar 1 and Grammar 2 cover the **same set of constructs** for a given level. Grammar 1 is "easy mode" (clear examples, regular forms, simple sentences). Grammar 2 is "hard mode" (irregular forms, subtle distinctions, longer sentences, traps).

**Critical: "harder" means deeper, not broader.** Grammar 2 must test the same constructs as Grammar 1 — just with trickier contexts, edge cases, and subtler distractors. It must NOT introduce constructs from other levels or add sub-topics that Grammar 1 doesn't cover. Every Grammar 2 question should trace back to a construct that Grammar 1 also tests. If Grammar 1 has 6 questions on articles, Grammar 2 should have ~6 questions on articles (harder ones), not 3 on articles and 3 on something new.

**Total: 4 languages x 8 levels x 4 decks = 128 decks, ~6,400 items.**

## File naming

```
{LangName} {Level} {Module} {Num}.csv
```

Examples:
- `nl/Dutch A1 Vocab 1.csv`
- `en/English B1 Grammar 2.csv`
- `it/Italian A2+ Vocab 2.csv`

Files live under `quizzes/{lang-code}/`.

> ⚠️ **Do not rename these files without also updating `quizzer/quizzer.html`.** The quizzer's "Add Deck" page builds preset links by constructing filenames from a hardcoded pattern (`{LangName} {Level} {Module} {Num}.csv`) in `renderPresetsSection()`. Any change to the naming convention — capitalization, separators, language-name spelling, level/module tokens — will break the preset links silently. If you change the convention, update the `PRESET_LANGS` / `PRESET_LEVELS` / `PRESET_COLS` constants and the filename template in `renderPresetsSection()` to match.

## Quiz language

All questions, answer options, and explanations are written in the **target language** at every level. This is a language-learning tool — immersion from day one. At lower levels (A1–A2), use simple target-language phrasing in explanations.

## Vocabulary themes by level (all languages)

| Level | Vocab 1 | Vocab 2 |
|-------|---------|---------|
| A1 | Greetings, Numbers, Colors, Days | Home, Family, Body |
| A1+ | Food, Shopping, Restaurants | Clothes, Weather, Animals |
| A2 | Travel, Directions, Transport | Health, Time, Daily Routines |
| A2+ | Work, Education, Hobbies | City, Nature, Descriptions |
| B1 | Opinions, Emotions, Relationships | Media, Culture, Technology |
| B1+ | Society, Environment, News | Abstract Nouns, Idioms |
| B2 | Academic & Professional Language | Formal Register, Nuance |
| B2+ | Collocations, False Friends | Style, Rhetoric, Precision |

## Grammar constructs by language and level

The tables below list constructs **non-exhaustively** — they indicate the territory, not the boundary. Both Grammar 1 and Grammar 2 draw from the same construct list; they differ in difficulty, not topic.

### Dutch (nl)

| Level | Grammar constructs |
|-------|--------------------|
| A1 | Present tense regular verbs (stam + t), zijn/hebben, basic word order (SVO), de/het articles, plurals (-en, -s), negation (niet/geen) |
| A1+ | Inversie (V2 after adverbs), yes/no and wh-questions, adjective endings (de/het), diminutives (-je), basic conjunctions (en, maar, of) |
| A2 | Perfect tense (hebben/zijn + voltooid deelwoord), separable verbs, subordinating conjunctions (dat, omdat, want), prepositions (in, op, aan, met) |
| A2+ | Modal verbs (kunnen, moeten, willen, mogen), er-constructions (er is/er zijn, locative er), object pronouns (mij/me, hem, haar), reflexive verbs |
| B1 | Imperfectum (simple past), 't kofschip rule, relative clauses (die/dat), om...te/te + infinitive, word order in bijzinnen |
| B1+ | Passive voice (worden + voltooid deelwoord), zou/zouden + conditional, indirect speech, conjunctions (hoewel, tenzij, doordat, zodat) |
| B2 | Advanced er (prepositional er: eraan, erop), subjunctive remnants (leve de koning), formal written register, participial constructions |
| B2+ | Cleft sentences, emphasis and fronting, subtle word-order choices for information structure, common errors and confusables (als/wanneer, dan/toen) |

### Greek (el)

| Level | Grammar constructs |
|-------|--------------------|
| A1 | Present tense (Group 1 -ω, Group 2 -ώ), είμαι/έχω, articles (ο/η/το), nominative and accusative cases, basic negation (δεν), plural formation |
| A1+ | Accusative with prepositions (σε, με, για), adjective agreement (gender/number/case), possessive pronouns (μου, σου), question words (πού, πώς, τι, ποιος) |
| A2 | Past simple (αόριστος) regular forms, weak object pronouns (με, σε, τον/την/το), future with θα, basic conjunctions (και, αλλά, ή, γιατί) |
| A2+ | Irregular αόριστος, imperfective past (παρατατικός), θα + imperfective vs θα + perfective, prepositions + cases (από, σε, με, για, χωρίς) |
| B1 | Subjunctive (να + verb), genitive case, passive voice (present and past), relative clauses (που, ο οποίος), conjunctions (αν, όταν, ενώ, αφού) |
| B1+ | Imperatives (formal/informal), indirect speech, conditional (αν + παρατατικός / θα + παρατατικός), compound tenses (έχω + infinitive-like forms) |
| B2 | Aspect (perfective vs imperfective in all tenses), formal register (learned vocabulary, passive preference), participles (present and past) |
| B2+ | Katharevousa remnants in fixed expressions, complex relative clauses, discourse markers (ωστόσο, εντούτοις, εξάλλου), nuanced aspect and mood choices |

### Italian (it)

| Level | Grammar constructs |
|-------|--------------------|
| A1 | Present tense regular (-are, -ere, -ire), essere/avere, articles (il/lo/la/l'/i/gli/le), gender and plurals, basic negation (non), c'è/ci sono |
| A1+ | Irregular present (fare, andare, venire, dire, uscire), prepositions + articles (del, nel, al, sul), possessives with articles, question formation |
| A2 | Passato prossimo (avere vs essere, agreement), reflexive verbs, direct object pronouns (lo, la, li, le), basic conjunctions (perché, quando, se, che) |
| A2+ | Imperfetto vs passato prossimo, indirect object pronouns (gli, le), combined pronouns (glielo), stare + gerundio, preposition usage (di, a, da, in, su) |
| B1 | Congiuntivo presente (penso che, credo che), condizionale presente, imperative (tu/Lei/voi), relative pronouns (che, cui, il quale), connectors (benché, affinché, purché) |
| B1+ | Si impersonale and si passivante, congiuntivo passato, conditional sentences (primo e secondo tipo), ne (partitive and locative), ci (locative and idiomatic) |
| B2 | Congiuntivo imperfetto and trapassato, periodo ipotetico (all three types), gerund and infinitive constructions, passive voice (venire/essere/andare) |
| B2+ | Advanced congiuntivo triggers, formal register and written style, discourse markers (tuttavia, pertanto, anzi), subtle pronoun placement, idiomatic constructions |

### French (fr)

| Level | Grammar constructs |
|-------|--------------------|
| A1 | Présent regular (-er, -ir, -re), être/avoir, articles (le/la/les, un/une/des), gender and plurals, basic negation (ne...pas), c'est / il y a |
| A1+ | Irregular present (aller, faire, venir, prendre, pouvoir, vouloir), contracted articles (du, des, au, aux), possessive adjectives (mon/ma/mes, ton/ta/tes), question formation (est-ce que, inversion) |
| A2 | Passé composé (avoir vs être, agreement with être), reflexive verbs, direct object pronouns (le, la, les), basic conjunctions (parce que, quand, si, que) |
| A2+ | Imparfait vs passé composé, indirect object pronouns (lui, leur), futur proche vs futur simple, prepositions (à, de, en, dans, chez) |
| B1 | Subjonctif présent (il faut que, je veux que, bien que), conditionnel présent, impératif (tu/nous/vous), relative pronouns (qui, que, dont, où), connectors (bien que, pour que, avant que) |
| B1+ | Pronouns y and en, double pronoun order, plus-que-parfait, si-clauses (type 1 and 2), passive voice (être + participe passé) |
| B2 | Subjonctif passé, concordance des temps, gérondif (en + participe présent), periodo ipotetico / si-clauses (all three types), passive alternatives (se faire + inf, on) |
| B2+ | Subjonctif imparfait (literary), advanced subjonctif triggers, formal register and discourse markers (néanmoins, toutefois, par ailleurs), subtle pronoun placement, common confusables (an/année, jour/journée, savoir/connaître) |

### English (en)

| Level | Grammar constructs |
|-------|--------------------|
| A1 | Present simple, present continuous, be/have/do, articles (a/an/the/zero), plurals, basic negation and questions, subject pronouns, there is/there are |
| A1+ | Past simple (regular and common irregulars), prepositions of time and place (in/on/at), possessives ('s and of), object pronouns, countable/uncountable (some/any) |
| A2 | Present perfect (have + past participle), present perfect vs past simple, modal verbs (can/could/must/should/may), future with will and going to |
| A2+ | Comparatives and superlatives, first conditional (if + present, will), adverbs of frequency and degree, gerund vs infinitive (basic), too/enough |
| B1 | Second conditional (if + past, would), relative clauses (who/which/that/where), passive voice (present and past), reported speech basics, used to / would for past habits |
| B1+ | Third conditional, wish + past/past perfect, modals of deduction (must be/can't be/might be), defining vs non-defining relative clauses, so/such...that |
| B2 | Mixed conditionals, advanced passive (have something done), inversion after negative adverbs, phrasal verbs (literal vs idiomatic), cleft sentences (it is...that) |
| B2+ | Subtle tense distinctions (narrative tenses, future perfect, future continuous), discourse markers (nevertheless, furthermore, whereas), collocation patterns, common errors (affect/effect, lay/lie, fewer/less) |

## Generation workflow

Each deck is produced by two **foreground sub-agents** run in sequence:

1. **Generator agent** — Writes the ~50-item CSV from scratch, following the construct list and quality standards. One agent per deck.
2. **Reviewer agent** — A separate, fresh sub-agent that reads the generated CSV and reviews it against the quality standards below. It corrects any issues in-place (bad distractors, ambiguous questions, duplicate options, structurally obvious answers, unclear explanations, etc.). The reviewer has no shared context with the generator — it evaluates the deck cold.

Grammar 2 decks get a third step after review:

3. **Cross-check agent** — Reads *both* the Grammar 1 and Grammar 2 CSVs for the same level and checks for construct consistency. Fixes issues in Grammar 2 in-place. Specifically checks:
   - **Dropped constructs**: Any construct area in Grammar 1 that Grammar 2 doesn't cover → add harder questions for it, replacing scope-creep questions.
   - **Scope creep**: Any construct in Grammar 2 that Grammar 1 doesn't test → remove or replace with a harder version of an existing Grammar 1 construct.
   - **Near-duplicates across decks**: Questions that appear in both Grammar 1 and Grammar 2 at similar difficulty → rework the Grammar 2 version to be meaningfully harder.
   - **Difficulty parity**: Grammar 2 questions that aren't actually harder than their Grammar 1 counterparts → increase difficulty (add edge cases, exceptions, longer contexts, trickier distractors).
   - **Construct balance**: Grammar 1 has N questions on construct X → Grammar 2 should have roughly N questions on construct X too, not half as many.

**All sub-agents must run in the foreground — never background.** This is a hard rule, not a suggestion. Do not use `run_in_background: true` regardless of permission mode (`bypassPermissions` included). Two reasons:

1. **Background agents cannot run Bash.** Even with `bypassPermissions`, Bash calls are denied in background mode. This means reviewers can't run CSV validation scripts (column counts, duplicate detection, format checks) and fall back to manual visual review only — missing an entire class of structural errors.
2. **Background write operations are unreliable.** They have historically failed silently, burning tokens without producing output.

To run agents in parallel, use a single message with multiple foreground Agent tool calls — this achieves the same concurrency without the permission restrictions.

When generating multiple decks, launch them in parallel where practical (e.g., all Grammar 1 decks across levels simultaneously, then their reviewers).

### Parallelism guidance

From generating the EN decks (32 decks = 8 levels x 4 types):

- **All 8 generators for one module** can run in parallel safely (e.g., all Grammar 1 levels at once). Each writes to a different file.
- **All 8 reviewers for one module** can also run in parallel after the generators finish.
- **Vocab 1, Vocab 2, and Grammar 1** can all run in parallel (24 generators) — they have no dependencies on each other.
- **Grammar 2 must wait for Grammar 1 to finish** (generate + review). The Grammar 2 generator needs to read the reviewed Grammar 1 CSV as a reference for construct coverage. Once Grammar 1 is reviewed, all 8 Grammar 2 generators can run in parallel.
- **Grammar 2 cross-checks** run after Grammar 2 review. All 8 cross-check agents can run in parallel (each reads one Grammar 1 + Grammar 2 pair).
- **One language at a time** per Claude session is practical. Running all 4 languages would be 128 agents; better to use separate Claude sessions per language.

### Generator prompt guidance

The generator prompt must specify:
1. Exact file path to write
2. CSV format (7 columns, header row, all double-quoted)
3. Language, level, and deck type
4. The specific grammar constructs or vocab themes to cover
5. For Grammar 2: the generator must **read the corresponding Grammar 1 CSV first** and use it as the construct reference. The prompt should explicitly instruct: "Cover the same constructs as Grammar 1, in roughly the same proportions, but test edge cases, exceptions, irregular forms, and subtle distinctions. Do not introduce constructs that Grammar 1 doesn't cover."
6. Quality rules (especially: the isolation test in §2a, the banned fixes in §2b, and the self-check in §2e — no distractor may be valid language in any realistic context)
7. Exact count: 50 questions, distributed across all constructs

### Reviewer prompt guidance

The reviewer prompt must specify:
1. Exact file path to read and fix in place
2. The full quality checklist (including §2a isolation test, §2b banned fixes, §2c valid fixes, §2d landmine constructs, §2e self-check)
3. The constructs the deck should cover (so reviewer can check coverage)
4. Instruction to apply the §2a isolation test to every distractor in every question, not just ones that look suspicious
5. Instruction to fix issues directly using only §2c methods — explicitly forbid the §2b banned fixes (hedge words like "in general" / "usually" / "more common", full-sentence reframing of still-grammatical options, explanation-softening)
6. Instruction to report, per fix, which §2c method (1–4) was applied; and for any question retained in a §2d landmine category, to include the §2e self-check sentence for each distractor

### Cross-check prompt guidance

The cross-check prompt must specify:
1. Exact file paths for both Grammar 1 and Grammar 2 CSVs
2. The 5 checks listed above (dropped constructs, scope creep, near-duplicates, difficulty parity, construct balance)
3. Instruction to fix Grammar 2 in-place — replace scope-creep questions with harder versions of under-covered Grammar 1 constructs
4. The construct list for the level (so the agent can categorize questions)

### Common issues reviewers catch

From the EN generation pass, the most frequent problems (in order):

1. **Valid wrong answers** (~80% of all fixes). The generator creates distractors that are actually correct English. Most common patterns:
   - Synonyms: "cost" vs "price", "monitor" vs "screen", "however" vs "nevertheless"
   - Dialect variation: British vs American ("loan me" is valid AmE, "fill out" vs "fill in")
   - Informal-but-correct: "was" for "were" in conditionals, optional backshift in reported speech
   - Context-dependent: "some" valid in expecting-yes questions, "already" valid in surprise questions
   - **Fix strategy**: See §2a–2e below. The short version: replace the distractor with something genuinely ungrammatical, pick a different stem where the distractor really is impossible, or drop the question. **Do not** try to rescue a broken question by sprinkling hedge words ("in general", "usually", "normally", "more common") onto the stem — that does not make a grammatical alternative ungrammatical.

2. **Structurally obvious answers** (~10%). The correct answer is noticeably longer or shorter than distractors, especially in formal-register vocab decks where formal phrases are longer than informal ones.

3. **Out-of-category distractors** (~5%). Wrong answers from a different semantic field (e.g., "wallet" among luggage types, "library card" among travel documents).

4. **Near-duplicate questions** (~3%). Two questions testing the same word/concept in very similar ways.

5. **Fill-in-the-blank incoherence** (~2%). Blank-filling creates grammatical nonsense (e.g., answer includes words already in the stem).

### Common issues cross-checks catch

From reviewing the EN Grammar 2 decks against their Grammar 1 counterparts:

1. **Scope creep** (~40% of Grammar 2 decks). The generator interprets "harder" as "broader" — adding new constructs (e.g., stative verbs, been/gone, get-passive, mixed conditionals) instead of testing existing constructs more deeply. Worst at B2+ (only ~65% construct overlap with Grammar 1), best at B1+ (~95%).

2. **Dropped constructs** (~50% of Grammar 2 decks). When the generator adds new topics, it drops Grammar 1 topics to stay at ~50 questions. E.g., A1+ Grammar 2 dropped some/any entirely; B2+ dropped 7 confusable pairs.

3. **Near-duplicates across decks** (~30% of decks). Questions appear in both Grammar 1 and Grammar 2 at similar difficulty — same construct, same answer pattern, just different nouns. E.g., A2 had a word-for-word identical "dark clouds" question in both decks.

4. **Uneven construct balance** (~25% of decks). Grammar 1 might have 5 questions on a construct while Grammar 2 has 2 (and uses the freed slots for scope creep). E.g., B2+ had 2 lay/lie questions in Grammar 1 but 5 in Grammar 2.

## Quality standards

Use this as a checklist when creating or reviewing questions.

### Option-level problems

**1. Identical options.** Every option (correct + all wrongs) must be a unique string. Duplicate distractors break the question and look sloppy.

**2. "Wrong" options that are actually correct.** If a distractor is linguistically valid, the question has multiple right answers and is unanswerable. Common trap: Dutch "zij" is both singular (she) and plural (they), so "Welke vervoeging is correct?" without specifying singular/plural can yield two valid options. Always disambiguate.

**Never mark valid, natural language as "wrong" to teach a pedagogical distinction.** If two options are both correct (e.g., "will" vs "going to" for predictions, "made of" vs "made from"), either (a) reframe the question to ask about a specific meaning, emphasis, or register so only one option answers what's actually being asked, or (b) replace the valid distractor with something genuinely wrong. The learner should never be told they're wrong for producing correct language. Explanations that say "both are possible, but X is more natural" while marking the other option wrong are self-contradictory — fix the question instead.

### 2a. The isolation test (mandatory for every distractor)

For **every** distractor in **every** question, apply this test before accepting the question:

> **Read the distractor as a complete utterance, standing alone, with no stem around it. Could a fluent native speaker naturally say or write this sentence in any realistic situation — a different topic, a different speaker, a different context than the one the stem implies? If yes, the distractor fails. The question is broken.**

"More natural," "less common," "not what we'd usually say," "not the intended meaning" — **none of these rescue a distractor.** The learner is being told they are *wrong*, not *less idiomatic*. If the distractor is grammatical in any context a fluent speaker would accept, marking it wrong is a lie to the learner.

### 2b. The three ways context-patching fails (do not use these)

When an agent notices a distractor is valid, the *wrong* reflexes are:

1. **Adding hedge words to the stem** ("in general", "right now", "usually", "normally", "typically", "what's more common"). These bias a reading but do not make the distractor ungrammatical. `"I love ___ in general"` → "I love the music in general" is still a valid English sentence. **Do not do this.** Hedge words are banned as a repair technique.
2. **Converting to "which sentence is correct?" with full-sentence options.** This only works if the "wrong" sentences are actually ungrammatical in isolation. Moving `"the music"` into a full sentence `"I love the music."` doesn't help — it's still correct English. **Do not do this unless the wrong options are genuinely ungrammatical in isolation.**
3. **Rewriting the explanation to admit both are valid but prefer one.** Any explanation containing "that would mean X," "more natural," "more common," "usually," "normally," "we'd typically say," "in most cases" is a **confession that the distractor is valid**. Do not paper over this. The question is broken. Delete or replace it.

**Gray area — legitimate semantic-intent framing is allowed.** There is one narrow exception that is *not* context-patching: a stem that names a clear, concrete semantic intent the learner has to match, where the distractors then fail to express that intent (not merely express it less naturally). This is OK **only when all of the following hold**:

- The stem's intent is stated in plain, natural target-language wording — not through hedge words like "in general" / "more common" / "usually". Prefer concrete framing: "Which sentence asks about a lifetime experience?", "Which sentence describes an action happening as you speak?", "Which sentence is about a scheduled future event?"
- The "wrong" options genuinely do not satisfy that intent when read in isolation — not merely that they satisfy it less well. If a fluent speaker would accept a distractor as also expressing the stated intent, it still fails the isolation test.
- The correct answer is the *simplest, most common* way to express that intent — not an obscure or stilted phrasing chosen to dodge the fact that the distractor also works.
- The explanation says *why* the distractors don't match the intent in concrete grammatical or semantic terms, not by hedging.

If you cannot find a simple, natural phrasing of the correct answer that unambiguously expresses the intent while the distractors unambiguously do not — drop the question. Don't reach for "in general" or "more common" to paper over the gap.

### 2c. The only valid fixes

When the isolation test fails, choose exactly one of:

1. **Replace the distractor with something genuinely ungrammatical** — wrong agreement, wrong word form, impossible inflection, nonsense plural, etc. ("a music", "an music", "musics" — ungrammatical in every context.) This is almost always the best fix.
2. **Change the stem to one where the distractor is truly ungrammatical in isolation**, not merely disfavored. Good targets: proper nouns that forbid "the" ("She lives in ___ France" — "the France" is ungrammatical in standard English); mass-noun quantifiers where the alternative produces agreement errors; tense contexts where a wrong form produces a real error.
3. **Abandon the question and test a different sub-point of the same construct.** Not every construct can be drilled with every surface format. If you can't find a clean fill-in for "generic vs specific reference," test a different article contrast that has clean wrong answers.
4. **Reframe as an explicit semantic-intent question** — only under the narrow gray-area rules in §2b above.

### 2d. Constructs where fill-in-the-blank routinely fails the isolation test

Treat these as landmines. Default to replacing distractors with ungrammatical forms (fix #1 above) rather than trying to engineer context:

- **Articles — generic vs specific reference.** "I love ___" / "I like ___" / "I hate ___" + mass noun: "the X" is always valid in some context.
- **some/any in neutral statements.** Both are often valid; only polarity-sensitive environments (true negatives, genuine yes/no questions without expectation) reliably force one.
- **will vs going to for predictions and promises.** Both work in almost all contexts. "I promise I will / I'm going to" are both natural.
- **Stative verbs in the continuous.** "I'm loving it," "I'm needing help" are accepted in many dialects and registers. Don't mark them wrong.
- **Optional backshift in reported speech.** Both backshifted and non-backshifted forms are standard. Don't mark one wrong.
- **much/many in positive statements.** Register variation; "much money" vs "a lot of money" are both fine.
- **Comparative "than I" vs "than me."** Both are standard. Don't mark one wrong.
- **"Who" vs "whom" in object position.** "Whom did you see" and "Who did you see" are both accepted in modern English.

For all of the above: the safe strategy is to contrast the target form against an **ungrammatical form** ("a music", "musics", "any moneys"), not against another valid form.

### 2e. Mandatory self-check before accepting any question

For every question, the agent must be able to complete this sentence for each distractor:

> "This distractor is wrong because it is ungrammatical / impossible due to: ________."

The blank must contain a concrete grammatical rule the distractor violates (wrong agreement, nonexistent word form, impossible tense, wrong preposition that produces an error in every context, etc.). If the blank can only be filled with "it's less natural," "it means something different," "it's more common in another context," "the stem implies another reading," or any hedge — **the question fails and must be rewritten using §2c or dropped.**

This self-check is not optional. In reviewer reports, any question retained in a §2d landmine category must include the completed self-check sentence for each distractor.

**3. Distractors too absurd to be useful.** Wrong options should require the learner to think. Distractors with secondary errors (wrong agreement, missing article, invented-but-plausible word forms like "coulded" or "websiting", etc.) are fine — recognizing those mistakes is itself a useful skill, especially at lower levels where learners are still building the ability to distinguish real forms from fake ones. Only flag a distractor if it is completely unrelated to the construct being tested (e.g., "pizza" as an alternative to "walk") such that a learner could discard it without engaging any relevant or adjacent language knowledge.

**4. Correct answer structurally obvious.** If the correct option stands out purely by surface formatting (e.g., it is the only long answer, or the only one with a period), students can pick it without reading. However, if the correct answer "stands out" because it is the only grammatically sound option, that is acceptable — the learner still has to apply grammar knowledge to identify it.

### Question-level problems

**5. Blank-substitution incoherence.** When a question uses fill-in-the-blank (`___`), every option must be a short fragment that plugs into the blank and produces a sentence (grammatical or not). If options are full sentences/phrases that duplicate or conflict with text in the stem, substituting them produces nonsensical run-ons.

**Bad example:**
- Stem: `"Ik eet, ___ ik honger heb."`
- Option: `"want ik heb honger en omdat ik honger heb"`
- Substituted: *"Ik eet, want ik heb honger en omdat ik honger heb ik honger heb."* — gibberish.

**Fix:** Either make options short fragments that fit the blank (`want`, `omdat`, `daarom`), or remove the blank and reframe as *"Welke zin is correct?"* with complete standalone sentences as options.

**6. Incorrect or misleading definitions.** Don't assign a meaning to a word that it doesn't really carry. Example: defining Dutch "dan" as "als gevolg daarvan" (which is really "daarom"/"dus") when "dan" is actually a correlative particle in "als..., dan..." constructions. If a word has multiple functions, test the specific usage in context rather than offering a debatable gloss.

**7. Overstated claims about "correct" usage.** Languages often have multiple accepted forms. Claiming one is wrong when it's widely used (e.g., Dutch "huiswerk doen" is common alongside "huiswerk maken") misleads learners. Prefer framing like "most common" / "meest gebruikelijke" over "the only correct form" when both are accepted.

### Explanation-level problems

**8. Confusing explanations.** Explanations should be accessible at the target level. Avoid abstract metalinguistic terms when a concrete rule works better. Example: "kijk naar de letter voor '-en' in het hele werkwoord" is clearer than "de onderliggende letter" for the 't kofschip v/z edge case.

### Additional notes

- Grammar 2 (hard mode) can test exceptions and edge cases, but the *correct answer* must still be unambiguously correct **and every distractor must still pass the §2a isolation test**. "Harder" is not license to mark valid language wrong.
