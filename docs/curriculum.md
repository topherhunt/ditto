# Curriculum: A1 to B1

This doc covers the language-neutral structure, the ordering principles and the module list. Each language has its own plan, with its grammar sequence and the lemmas every module introduces: [curriculum-it.md](curriculum-it.md), [curriculum-en.md](curriculum-en.md) (A1 and A2) and [curriculum-ga.md](curriculum-ga.md) (A1). Dutch comes later and reuses the same modules and themes, with its own grammar order.

## Principles

- **Only known words.** A unit may use only lemmas that its module or one of its required modules introduces. The loader enforces this (see `server/content.ts`). Every sentence is comprehensible input. Proper nouns (people, cities) are exempt.
- **Situations first, grammar in service.** Each module is a situation a traveler or new resident meets (ordering, introducing yourself, asking the way). Grammar enters when a situation needs it, in the smallest useful form. For example, `vorrei` is taught as a chunk in module 1, and the conditional as a system in module 21.
- **Build-up inside a lesson.** Words lead to phrases, phrases to chunks, and chunks to sentences. The sentences reuse the pieces just drilled. Each lesson ends on a sentence, and the loader enforces this.
- **Recycling.** Each lesson reuses at least a third of its sentence vocabulary from earlier modules. High-frequency function words recur everywhere by design.
- **Core means frequency and need.** A lemma belongs to the core (main-track) curriculum when it is high-frequency or needed in everyday survival situations. Topic words that only one domain needs (cooking verbs, sports, office equipment) go into optional modules.
- **One grammar step at a time.** A module adds at most two new grammar points. A form is always met as a chunk before its paradigm is taught.
- **Natural and standard.** Neutral register, current usage, standard spelling and punctuation. No slang, no regional forms, and no invented names of real businesses.

## Structure

- **Level:** A1, A2, B1. The Home page groups modules by level.
- **Module** (a `course` in the content schema): one situation or theme, about 6 lessons, and 40–80 new lemmas. It has a `track`, `main` or `optional`.
- **Lesson:** 14–16 units that build toward 5–7 sentences. It ends on a sentence.
- **Unit:** one dictation item with stage `word`, `phrase`, `chunk` or `sentence`. A unit has a translation and two distractors for the meaning check, one set per support language (`SUPPORT_LOCALES` in `shared/content.ts`).

A typical lesson: 3–4 words, 3–4 phrases, 2–3 chunks and 5–6 sentences, interleaved so that each sentence follows the pieces it uses.

## Unlocks

- A module unlocks once every module in its `requires` is complete. A module is complete when all of its lessons are complete, on any path.
- Within an unlocked module, a lesson unlocks once the lesson before it is complete.
- Main-track modules form a chain: each one requires the previous main module. Optional modules require the main module that supplies their prerequisite vocabulary and grammar. A main module never requires an optional one.
- Review and the mistakes notebook are never locked.

- A level test skips a whole level: 10 random sentences from the longer half of the level's main-track modules (`server/level-test.ts`). Passing takes every one clean: no wrong check, no accent slip, the right meaning; the first miss ends the test. A pass counts every module of the level as complete for unlocking and opens all its lessons in any order, but marks no lesson complete. Retakes are unlimited and test answers are not recorded.

## Content rules

- **Punctuation:** a sentence unit ends in `.`, `!` or `?`. A word unit never does; phrases and chunks don't either. `commas` lists extra word gaps where a comma or semicolon is also acceptable, and it should be liberal (after a vocative, before `ma`, around an interjection). Only a wrong end mark counts as an error. See `shared/grader.ts`.
- **Numbers:** written as words in the text, with digit spellings in `variants` (`due euro` -> `2 euro`).
- **Variants:** other correct spellings of the same audio, never paraphrases. The audio is rendered from `text` only.
- **Distractors:** two wrong translations per support language, of the same length and shape as the real one. Each differs in one or two key content points (a different item, person, time or polarity), so choosing needs real understanding. A distractor must never also be a correct translation: English "you" also covers formal (usted/Lei) and plural addressees, so never contrast on those; and learners don't see `senses`, so a single-word unit's distractor must not be another common sense of the word (`light` -> `claro`). Avoid fixed patterns, such as the answer always being the longest option. Each support language gets its own distractors, not a translation of the English ones: a contrast English draws (he/she, you/they, if/when, by/of) can collapse in a pro-drop or differently split language, so pick a contrast that survives there.
- **Lexicon:** each module carries a lexicon entry for every surface form it uses, so a module is self-contained to read. Glosses are short and learner-facing: meaning, then gender or irregularity when it matters.

## Modules

The same 31 main modules and 10 optional modules apply in every language. Titles below are the Italian ones. The grammar column is the Italian sequence; the language plans own the details.

### A1 (main track)

| # | Module | Can-do | Italian grammar |
|---|---|---|---|
| 1 | Al bar | Order a drink and a snack, ask the price, pay | `vorrei` + noun, `un/una/un'`, `il/la`, `posso` + infinitive as a chunk |
| 2 | Piacere! | Greet, introduce yourself, say where you're from | `essere` (singular), `chiamarsi` (singular), `non`, nationality agreement |
| 3 | Numeri e ore | Count to 100, tell the time, give your age and phone number, name the days | `avere` (singular), numbers, `che ora è / sono le...`, `a che ora` |
| 4 | La famiglia | Describe your family and people | plural nouns and articles, adjective agreement, possessives, full `essere` and `avere` |
| 5 | Lavoro e studio | Say what you do and where, what languages you speak | present of `-are` verbs, `fare`, articulated prepositions (`al`, `nel`) |
| 6 | La mia giornata | Describe your daily routine | `-ere` and `-ire` verbs (`-isc-`), reflexive verbs, frequency adverbs |
| 7 | In città | Ask for and understand directions, find places | `c'è / ci sono`, `andare` and `venire`, `dovere` + infinitive, place prepositions |
| 8 | A tavola | Book a table, order a meal, say what you like | `mi piace / mi piacciono`, partitive `del/della`, `bere` |
| 9 | Tempo libero | Talk about hobbies, make and answer invitations | full `volere` and `potere`, `giocare a` / `suonare`, question words |
| 10 | Fare spese | Buy clothes and food, ask about sizes, colors and quantities | `questo/quello`, color agreement, quantities (`un chilo di`) |
| 11 | In viaggio | Buy a ticket, book a room, talk about the weather | `partire/arrivare`, times and dates, `fa caldo`, months and seasons |

### A2 (main track)

| # | Module | Can-do | Italian grammar |
|---|---|---|---|
| 12 | Lo scorso weekend | Say what you did | passato prossimo with `avere`, irregular participles, `fa`, `già` |
| 13 | La mia storia | Tell where you went and key life events | passato prossimo with `essere`, agreement, reflexives in the past |
| 14 | Da bambino | Describe the past and past habits | imperfetto |
| 15 | Cos'è successo? | Tell a short story with background and events | passato prossimo vs. imperfetto, `mentre`, `all'improvviso` |
| 16 | Dal medico | Say what hurts, understand simple advice, buy medicine | `mi fa male`, body parts, `bisogna`, `stare meglio` |
| 17 | La casa nuova | Describe a home, rent, move | direct object pronouns, `ne`, place prepositions |
| 18 | Regali e feste | Talk about celebrations, give and thank for gifts | indirect object pronouns, `piacere` with all persons, dates |
| 19 | Progetti | Talk about plans and conditions | futuro semplice, `se` + present/future, `tra` for time |
| 20 | Meglio o peggio | Compare places, people and things | comparatives, relative superlative, `-issimo`, `migliore/meglio` |
| 21 | Per cortesia | Make polite requests, give advice, handle a phone call | condizionale presente, informal and formal imperative |

### B1 (main track)

| # | Module | Can-do | Italian grammar |
|---|---|---|---|
| 22 | Imprevisti di viaggio | Handle cancellations, strikes and lost luggage; tell what had already happened | trapassato prossimo, `appena`, `dopo che`, `ormai` |
| 23 | Me lo presti? | Ask for and do favors, lend, borrow and return things | combined pronouns, `andarsene`, `farcela`, `tenerci` |
| 24 | Cerco lavoro | Look for a job, talk about a CV, get through an interview | `stare` + gerundio, gerundio, `stare per` |
| 25 | Secondo me | Give and ask for opinions, agree, disagree, hedge | congiuntivo presente after opinion verbs; indicative after `secondo me` |
| 26 | Sentimenti | Talk about feelings and relationships, wish, worry, make up | congiuntivo after wishes, emotions and impersonal expressions; congiuntivo passato |
| 27 | Libri e film | Describe and recommend books, films and series | relative pronouns `che`, `cui`, `il quale`, `chi`, `quello che` |
| 28 | L'ambiente | Talk about recycling, rules and the environment | impersonal and passive `si`, passive with `essere`/`venire`/`andare` |
| 29 | Se potessi... | Imagine, dream and express regrets | congiuntivo imperfetto, hypothetical `se`, `come se`, condizionale passato |
| 30 | Le notizie | Report what others said and asked, follow the news | reported speech, indirect questions, future in the past |
| 31 | Vivere in Italia | Weigh pros and cons of life abroad, argue a point | conjunctions with the congiuntivo vs. the indicative |

### Optional modules

| Module | Requires | Adds |
|---|---|---|
| In cucina | 8 A tavola | Cooking verbs, ingredients, kitchen tools, recipe steps |
| Sport | 9 Tempo libero | Sports, the gym, matches, winning and losing |
| Natura | 11 In viaggio | Landscape, animals, outdoor activities, more weather |
| In ufficio | 13 La mia storia | Office life, meetings, email, colleagues, job interviews |
| Tecnologia | 13 La mia storia | Phones, computers, apps, accounts and passwords |
| Arte e cultura | 15 Cos'è successo? | Museums, painting, architecture, music, theater, history |
| Burocrazia | 21 Per cortesia | Documents, forms, the post office, the bank, residence permits |
| C'era una volta | 27 Libri e film | Fairy tales, and the passato remoto for reading |
| Soldi | 24 Cerco lavoro | Saving, taxes, loans, mortgages, prices and the economy |
| Benessere | 26 Sentimenti | Stress, sleep, diet, fitness and balance |

## Coverage and gaps

A1 to B1 as specified by CEFR also covers listening to connected speech, short conversations and reading. Dictation of single sentences covers recognition, spelling and core grammar. It does not cover discourse, interaction or speaking. [roadmap.md](roadmap.md) lists these blind spots and ideas to close them.
