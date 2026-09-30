# Greek curriculum plan

This is the Greek (`el`) instance of [curriculum.md](curriculum.md): the same 31 main modules, in the same order and situations, for A1 (1-11), A2 (12-21) and B1 (22-31). It is modeled on [curriculum-fr.md](curriculum-fr.md). The language is Standard Modern Greek as spoken in Greece and Cyprus, written in the monotonic system. Support languages are `en`, `es-419`, `it` and `nl`, in that order. The ten optional modules of curriculum.md are not planned yet for Greek.

Each module entry below is machine-read: the `Introduces` line is the module's `introduces` list (lemmas in dictionary form, lowercase, NFC, tonos as in the lexicon). The loader rejects a lemma that appears in two modules along the required chain, so every lemma below appears in exactly one module in the whole plan. Proper nouns (names, cities, countries) are exempt and not listed. A lemma is used in a unit only from its own module onward.

## Module list

| # | Id | Title | Level |
|---|---|---|---|
| 1 | `el-a1-kafes` | Ένας καφές, παρακαλώ | A1 |
| 2 | `el-a1-xairo-poly` | Χαίρω πολύ | A1 |
| 3 | `el-a1-arithmoi-ora` | Αριθμοί και ώρα | A1 |
| 4 | `el-a1-oikogeneia` | Η οικογένεια | A1 |
| 5 | `el-a1-douleia-spoudes` | Δουλειά και σπουδές | A1 |
| 6 | `el-a1-mera-mou` | Η μέρα μου | A1 |
| 7 | `el-a1-poli` | Στην πόλη | A1 |
| 8 | `el-a1-trapezi` | Στο τραπέζι | A1 |
| 9 | `el-a1-eleftheros-xronos` | Ελεύθερος χρόνος | A1 |
| 10 | `el-a1-psonia` | Ψώνια | A1 |
| 11 | `el-a1-taxidi` | Στο ταξίδι | A1 |
| 12 | `el-a2-savvatokyriako` | Το περασμένο Σαββατοκύριακο | A2 |
| 13 | `el-a2-istoria-mou` | Η ιστορία μου | A2 |
| 14 | `el-a2-paidi` | Όταν ήμουν παιδί | A2 |
| 15 | `el-a2-ti-egine` | Τι έγινε; | A2 |
| 16 | `el-a2-giatros` | Στον γιατρό | A2 |
| 17 | `el-a2-kainourio-spiti` | Το καινούριο σπίτι | A2 |
| 18 | `el-a2-dora-giortes` | Δώρα και γιορτές | A2 |
| 19 | `el-a2-sxedia` | Σχέδια | A2 |
| 20 | `el-a2-kalytera-xeirotera` | Καλύτερα ή χειρότερα | A2 |
| 21 | `el-a2-me-efgeneia` | Με ευγένεια | A2 |
| 22 | `el-b1-aproopta` | Απρόοπτα στο ταξίδι | B1 |
| 23 | `el-b1-daneizeis` | Μου το δανείζεις; | B1 |
| 24 | `el-b1-psaxno-douleia` | Ψάχνω δουλειά | B1 |
| 25 | `el-b1-gnomi` | Κατά τη γνώμη μου | B1 |
| 26 | `el-b1-synaisthimata` | Συναισθήματα | B1 |
| 27 | `el-b1-vivlia-tainies` | Βιβλία και ταινίες | B1 |
| 28 | `el-b1-perivallon` | Το περιβάλλον | B1 |
| 29 | `el-b1-an-mporousa` | Αν μπορούσα... | B1 |
| 30 | `el-b1-eidiseis` | Οι ειδήσεις | B1 |
| 31 | `el-b1-zoi-stin-ellada` | Ζωή στην Ελλάδα | B1 |

Module 1 is the ordering root and requires `none`. Every other module requires the previous main module.

## Orthography

- **Monotonic.** One accent, the tonos (´), on the stressed vowel of every word of two or more syllables. Diaeresis (ϊ, ϋ) only where needed (`παϊδάκια` is not used). No breathings, no circumflex.
- **Monosyllables take no tonos**, except the disambiguating `πού` (where), `πώς` (how), `ή` (or). `που` (relative or "that") and `πως` are the unaccented partners. The conjunction `ότι` is used for "that"; `πως` as a conjunction is avoided. `ό,τι` is never used: the tokenizer splits at the comma, so `ό` would become a stray token. Use `οτιδήποτε` (M27).
- **Enclitic accent.** A word stressed on the third-from-last syllable gets a second tonos before a clitic: `το όνομά μου`, `το τηλέφωνό σου`, `ο φίλος μου` (no change, stress is on the penultimate). The extra accent is part of the spelling in `text`. A learner who omits it makes an accent slip (pass, orange).
- **Final `ς`.** Always written at word end (`καφές`, never `καφεσ`). The grader treats `ς`/`σ` differences as accent slips, like a missing tonos. Every other spelling difference is an error.
- **Capitals.** A capitalized vowel keeps its tonos on the first letter: `Έναν καφέ, παρακαλώ.`, `Ώρα`. Days and months are lowercase except at sentence start. Names, cities and countries are capitalized.
- **Real Greek letters only.** Never Latin look-alikes (Latin `o`, `a`, `v`, `i` for Greek ο, α, ν, ι). A content check for mixed-script words is recommended.
- **Loanwords** that Greek writes in Greek letters (`τοστ`, `σάντουιτς`, `πάρτι`) are used in their standard Greek spelling. No Latin-script words appear in `text`.

## Question mark

- Questions end in the Greek question mark `;` (`Πώς σε λένε;`). Statements end in `.` or `!`. The app accepts `?` or `;` for a question in the learner's answer; `text` always holds `;`.
- Never the ano teleia `·` and never guillemets `«»` in `text`. Quotation in reported speech uses plain sentences.
- A final `;` is an end mark in the Greek grader and loader and is never read as a comma (see Implementation notes).

## Elision

- No elided forms. Write the full forms: `από` (not `απ'`), `με` (not `μ'`), `θα` (not `θ'`), `σε` (not `σ'`), `και` (not `κι`), `δεν`. This keeps every token a dictionary word, and the apostrophe rule of the tokenizer never matters. Any exception is stated in the module entry (none planned).
- **Contracted prepositions:** `στο`, `στη`, `στην`, `στον`, `στα`, `στις`, `στους` are each ONE token and surface forms of the lemma `σε`. `από` has no contraction.

## Register

- `εσύ` is the informal singular, `εσείς` the formal singular and every plural. Both are taught early: `Τι κάνεις;` (informal) and `Καλημέρα, πώς είστε;` (formal) in M2. Verb forms differ (`είσαι`/`είστε`), so the register is visible in the text.
- Never contrast `εσύ` and `εσείς` in a distractor, in any support language: English `you`, Spanish `usted/ustedes`, Italian `Lei/voi` and Dutch `u/jullie` all overlap.
- **Pro-drop:** Greek drops subject pronouns. `εγώ`, `εσύ`, `αυτός`, `εμείς` appear only for emphasis or contrast (`Εγώ είμαι η Μαρία, και εσύ;`). Units never need a pronoun for grammar.

## Gender and case

- **Articles:** `ο/η/το` (definite), `ένας/μία/ένα` (indefinite), plural `οι/οι/τα`. All are surface forms of the lemmas `ο` and `ένας`. The spelling `μια` is the variant of `μία`, same audio, and is listed in `variants`.
- **A1 covers nominative and accusative only.** The accusative articles `τον/την/το` and `έναν/μια/ένα` are taught from module 1 (`Θέλω έναν καφέ`), then `στον/στην/στο` with `σε` in M2. Genitive appears first as fixed chunks: `του/της` with names (`το όνομα του Νίκου`), and the possessive clitics `μου/σου/του/της/μας/σας/τους` as chunks in M4. Genitive as a system (articles `του/της/των`, noun endings) starts in A2 (M12 for `του χρόνου`, systematically in M18 and M22).
- **Vocative** only as fixed forms; the rule: a name after a greeting takes the vocative, and the token is a PROPN. `Γεια σου, Νίκο!` has surface `νίκο` (PROPN, lemma `νίκος`). Female names (`Μαρία`, `Ελένη`, `Άννα`, `Κατερίνα`, `Σοφία`, `Ιωάννα`, `Δήμητρα`) are unchanged in the vocative. Male names in the vocative: `Νίκο`, `Γιώργο`, `Δημήτρη`, `Κώστα`, `Γιάννη`, `Πέτρο`, `Αλέξανδρε`.
- **Exact name set.** Female: Μαρία, Ελένη, Άννα, Κατερίνα, Σοφία, Ιωάννα, Δήμητρα. Male: Νίκος, Γιώργος, Δημήτρης, Κώστας, Γιάννης, Πέτρος, Αλέξανδρος. Nominative in statements (`Με λένε Μαρία`, `Ο Νίκος είναι φίλος μου`), accusative when object (`Βλέπω τον Γιώργο`, from M6), vocative only in greetings and requests, genitive only in `του Νίκου`-type chunks from M4.
- **Names and cases per module:** M2 nominative (`Με λένε Μαρία`) and vocative (`Γεια σου, Νίκο!`); M4 nominative plus genitive chunks; M6 onward accusative objects; genitive with `του/της` only in chunks until M18.
- **Plural and gender agreement** of adjectives is taught from M4 (`ο ψηλός αδελφός, η ψηλή αδελφή, το ψηλό παιδί`). Adjectives are listed by the masculine nominative singular.

## Verbs

- **Dictionary form: first person singular present active** (`θέλω`, `είμαι`, `μιλάω`, `έχω`). Verbs with no active form use the middle form (`έρχομαι`, `κάθομαι`). The two A1 present groups are `-ω` (`γράφω, γράφεις, γράφει, γράφουμε, γράφετε, γράφουν`) and `-άω/-ώ` (`μιλάω, μιλάς, μιλάει, μιλάμε, μιλάτε, μιλάνε`). The contracted `-ώ` spelling (`μιλώ`) is not used; the `-άω` spelling is.
- **A1:** present of both groups, `είμαι`, `έχω`, `θέλω`, `μπορώ`, `πρέπει` (impersonal, always with `να`). `να` + subjunctive appears as a chunk in M1 (`Μπορώ να πληρώσω;`, `Μπορώ να έχω...;`) long before its system, and `θα` + verb as a chunk in M8 (`Θα πάρω μια σαλάτα`).
- **A2:** aorist (M12 active, M13 passive/middle and `έχω` + participle as a chunk family), imperfect (M14), aorist vs. imperfect (M15), `θα` future system and `αν` (M19), comparatives (M20), conditional and imperative (M21).
- **B1:** pluperfect (M22), combined clitic pronouns (M23), gerund `-οντας` and `πρόκειται να` (M24), `να` subjunctive systems (M25, M26), relative pronouns (M27), passive (M28), contrary-to-fact `αν` + imperfect/pluperfect (M29), reported speech (M30), subordinating conjunctions (M31).
- Order mirrors the French and Spanish sequence but fits Greek: Greek has no partitive, no `ser/estar` split and no auxiliary choice, so those slots are taken by the aorist, the subjunctive and the pronoun clitics.
- Verb forms are surface forms of one lemma (the lexicon maps `πήγα`, `πάω`, `πάμε`, `πηγαίνετε` to `πάω`). Participles (`φάει`, `πάει`) are surface forms of the verb lemma.

## Numbers and money

- Numbers are words in `text` and digits in `variants` (`δύο ευρώ` -> `2 ευρώ`). Digit variants are the only exception to "no digits in `text`".
- **Gender:** `ένας/μία/ένα`, `τρεις/τρία`, `τέσσερις/τέσσερα` agree with the noun; `δύο`, `πέντε` and up are invariable. `δεκατρείς/δεκατρία` and `δεκατέσσερις/δεκατέσσερα` agree too. The lemmas are the masculine forms `ένας`, `τρεις`, `τέσσερις`, `δεκατρείς`, `δεκατέσσερις`. `είκοσι ένας` is not used: the compound numbers 21-99 agree only in the last digit (`είκοσι ένα ευρώ`, `είκοσι μία μέρες` is not needed).
- **Euros:** `ευρώ`, invariable, no `€` sign. `λεπτά` (plural of `λεπτό`) is used after A1 when cents are needed. `δύο ευρώ και πενήντα λεπτά`.
- Years and large numbers are rare; `χιλιάδα` appears only in M11.

## Settings

- Greece and Cyprus. Real cities and places are PROPN: Αθήνα, Θεσσαλονίκη, Πάτρα, Ηράκλειο, Ρόδος, Λευκωσία, Κρήτη, Κύπρος, Ελλάδα. No real business names, no brands. Countries and nationalities: countries are PROPN, nationalities are NOUN (see M2).
- Days and months are lowercase common nouns (`δευτέρα`, `μάιος`); holidays take capitals in text (`Πάσχα`, `Χριστούγεννα`, `Πρωτοχρονιά`) and are NOUN lemmas in lowercase.
- Neutral register, current usage, standard Greek. No dialect, no slang, no katharevousa.

## Homophones

Greek vowel spelling is historical: `ι/η/υ/ει/οι/υι` all sound /i/, `ο/ω` sound /o/, `ε/αι` sound /e/, and `ου` is /u/. The TTS reads `text`, so the audio cannot tell `η` from `οι`. Policy:

- Each unit is written so that grammar or context decides the spelling (`Η μητέρα μου` versus `Οι μητέρες`: the noun fixes it). A bare word-stage unit is avoided for any word that has a same-sound partner in the chain; such words first appear inside a phrase.
- `variants` are only for same-audio, same-meaning spellings: digits, `δύο`/`δυο`, `μία`/`μια`. Never for homophones.
- Accent-only pairs (`η/ή`, `που/πού`, `πως/πώς`, `μισώ/μισό`) are accent slips in the grader (orange, not wrong), so the units put each in a clause that fixes it and never rely on the accent as the only difference between two answers.
- Verb endings `-ει/-εις/-η` (`γράφει` versus `γράφεις`) differ audibly only by the final `ς`; the subject pronoun or context fixes the person. `-ετε` (you, pl.) versus `-εται` (passive, M28): a `-εται` unit never has `-ετε` as a close option.
- `ήρθε` (came, M13) versus `έρθει` (will come, M19): the time word (`χθες` versus `αύριο`) decides.
- `ποιος` versus `ποιοι`, and `τι` (what, always in a question) versus `τη` (the, always before a noun): distractors never contrast them.
- Family words with the same ending sound (`θείος`/`θεία`) are never paired in distractors.

## Support languages

The support languages are `en` (American English), `es-419` (Latin American Spanish: `ustedes`, no `vosotros`, with `¿ ¡`), `it` and `nl`. Translations are natural, not word-for-word: `Με λένε Μαρία` is "My name is Maria", `Πώς σε λένε;` is "What's your name?".

**Glosses** are short: the meaning, then the gender for nouns as `(m)/(f)/(n)` in all four languages, then irregularities, then a `watch out:` / `ojo:` / `attenzione:` / `let op:` note only in the language concerned. Example: `{"lemma": "καφές", "pos": "NOUN", "gloss": {"en": "coffee (m)", "es-419": "café (m)", "it": "caffè (m)", "nl": "koffie (m)"}}`.

**Distractors** follow curriculum.md: two per support language, same shape, differing in one or two content points. Greek-specific rules:

- Never contrast what a support language collapses: Greek `είμαι` is `ser` and `estar` (es), `essere` (it), `zijn` (nl), so never `soy/estoy`. `έχω` is also `have` and the Spanish auxiliary. `ξέρω` (know a fact) and `γνωρίζω` (know a person) are `saber/conocer`, `sapere/conoscere`, `weten/kennen`: never contrast. `μπορώ` is `can` and `may`. `εσύ/εσείς` are never contrasted. `καλησπέρα` is `buenas tardes/noches`, `buonasera`, `goedenavond`: never contrast with `καληνύχτα` in a greeting unit. `πάω` is `go` and `walk`.
- Never contrast homophone-only or accent-only differences (`πού/που`, `η/ή`).
- Gender contrasts on a noun (`o/η/το`) are fine only when the translation shows gender (`he/she`, `el/la`).
- Double negation: Greek `δεν ... κανένας` is one negative; English `I didn't see anyone` is the natural translation. Distractors never add a second negative.

**False friends and pitfalls**, per support group:

- **English:** `ώρα` is hour and time of day, not "hour" only. `σήμερα` is today (not "summer"). `καφές` is masculine. `ταξίδι` (trip) and `ταξί` (taxi) look alike. `γραφείο` is office and desk. `μαγαζί` is a shop. `ακριβός` is expensive but `ακριβώς` is exactly. `μισώ` is hate, `μισό` is half. `χαρτί` is paper, not chart. `μήλο` is apple, `μέλι` honey. `ναι` is yes (it is not "no" though it sounds like Dutch `nee`).
- **es-419:** `ώρα` is `hora` (good) but also `tiempo`. `σήμερα` is `hoy`. `μπορώ` is `puedo`, but not `poder` alone. `πρέπει` is `debo/hay que`: impersonal, not conjugated. `τώρα` is `ahora`. `ojo:` `ναι` /ne/ vs `ni`; `έχω` covers `tengo/he`. `ακριβός` is `caro` but `ακριβώς` is `exactamente`. `ταξίδι` is `viaje`, not `taxi`. `βιβλιοθήκη` is `biblioteca` and also `estante`. `γραφείο` is `oficina/escritorio`. `παιδί` is `niño/hijo`.
- **it:** `attenzione:` `ώρα` is `ora` (good) but `τώρα` is `adesso`, not `ora` (`ora` is also an Italian adverb). `σήμερα` is `oggi`. `μπορώ` is `posso`. `πρέπει` is `bisogna/devo`, impersonal. `καφές` masculine like `caffè`. `ταξίδι` is `viaggio`, not `taxi`. `μέλι` and `μήλο` (`miele`, `mela`) differ by one vowel. `σαν` is `come`. `γλυκός` is `dolce`. `κρύο` is `freddo`. `παιδί` is `bambino/figlio`.
- **nl:** `let op:` `ναι` sounds like `nee` but means `ja`; `όχι` is `nee`. `ώρα` is `uur` and `tijd`. `σήμερα` is `vandaag`. `καφές` is `koffie` (m/f). `μπορώ` is `kan/mag`. `πρέπει` is `moet`, impersonal. `τώρα` is `nu`. `παιδί` is `kind`. `σχολείο` is `school`. `γραφείο` is `kantoor/bureau`. `γλυκός` is `zoet`.

## Lemma conventions

- **Tokens** follow `shared/tokenize.ts`: a word is a run of letters, digits and marks; Greek letters are `\p{L}`. Apostrophes and hyphens between letters join tokens, but Greek text here has neither. Commas and `;` are separators.
- **Lexicon keys** are the lowercase surface form with tonos (`καφές`, `έναν`). Every surface form used in a module needs an entry unless a required module already has it.
- **Lemmas:** nouns use the nominative singular (feminine and masculine forms of people nouns such as `φίλος/φίλη`, `δάσκαλος/δασκάλα`, `Έλληνας/Ελληνίδα` are separate lemmas, both listed); adjectives the masculine nominative singular; articles `ο`; `ένας` covers `ένα/μία`; numerals the masculine form; verbs the first person singular present active. Adverbs formed from an adjective (`καλά`, `αργά`, `γρήγορα`, `ωραία`) are separate ADV lemmas, except `πολύ`, `λίγο`, `μόνο`, `όσο`, `τόσο`, `πόσο`, `περισσότερο`, which are surface forms of the adjectives `πολύς`, `λίγος`, `μόνος`, `όσος`, `τόσος`, `πόσος`, `περισσότερος`.
- **Pronouns and clitics are lemmas:** `μου` (lemma `εγώ`), `σου` (`εσύ`), `μας` (`εμείς`), `σας` (`εσείς`); the weak object pronouns `τον/την/το/τα` and `του/της/τους` (lemma `αυτός`).
- **Contractions:** `στο/στη/στην/στον/στα/στις/στους` are ONE token each, lemma `σε`.
- **Sense pairs** (a surface with two readings needs `surface#sense` keys and `senses` in the unit): `με` (ADP) vs `με#pron` (clitic of `εγώ`, `Με λένε`); `σε` vs `σε#pron` (clitic of `εσύ`, `Πώς σε λένε;`); `το/τον/την/τα/της/του/τους` as article (lemma `ο`) vs `…#pron` (lemma `αυτός`); `τρίτη` only as the weekday (the feminine ordinal `τρίτη`, `τετάρτη`, `πέμπτη` is avoided so no sense pair is needed); `ωραία` as adjective and as the interjection `Ωραία!` (the same lemma `ωραίος`).
- **POS tags allowed:** NOUN VERB AUX ADJ ADV PRON DET ADP CCONJ SCONJ NUM INTJ PROPN PART. `είμαι` is AUX in every use. `έχω` is VERB (AUX only in the perfect chunk family, tagged per unit with `senses`). `θα`, `να`, `δεν`, `μην` are PART. `ο/η/το/ένας` are DET. `τι`, `ποιος`, `πόσος` are PRON or DET by use (PRON when alone). Numerals are NUM. Names are PROPN.
- **Proper nouns** are exempt from the lemma rules but need a lexicon entry (`μαρία`, `αθήνα`).

## The `speaker` field

Set `speaker` to `F` or `M` whenever the form reveals the speaker's gender: `Είμαι κουρασμένος` (M) / `Είμαι κουρασμένη` (F), `Είμαι Έλληνας` (M) / `Είμαι Ελληνίδα` (F), `Είμαι δάσκαλος` (M) / `Είμαι δασκάλα` (F), `Είμαι παντρεμένος/η`, `Είμαι ευχαριστημένος/η`, `Ήμουν μόνος/η`, and the aorist or participle forms that show gender (`Έχω γίνει πιο ήρεμος/η`). The voice pair for `el` is the openai `marin` (F) and `cedar` (M).

## TTS note

Audio is gpt-4o-mini-tts reading `text`. Avoid digits, abbreviations and symbols in `text` (numbers are words, money is `ευρώ`). Stress may slip on a few words: `πολύ` (stressed on the last syllable), `ποιος` (one syllable, `ποιος`), `κόρη`, `ώρα`, `μάτι`, `πόσο`, `όχι`, and on the enclitic-shift forms (`το όνομά μου`). Slips are fixed in `content/audio-fixes.json`, not by respelling `text`. Greek stress is always visible in the tonos, so a slip is a voice error, never a spelling ambiguity.

## A1

### Module 1: Ένας καφές, παρακαλώ (`el-a1-kafes`)

- **Requires:** `none`
- **Can-do:** Greet, order a drink and a snack, ask the price, pay.
- **Grammar:** `θέλω` + accusative (`Θέλω έναν καφέ`), articles `ο/η/το` and `ένας/μία/ένα` with nominative and accusative (`τον/την/το`, `έναν/μια/ένα`), `να` + subjunctive as chunks (`Μπορώ να έχω...;`, `Μπορώ να πληρώσω;`), `έχω` as `Έχετε...;`, `με/χωρίς`, `πόσο κάνει`.
- **Lessons:**
  1. Greetings and please: `γεια`, `καλημέρα`, `καλησπέρα`, `παρακαλώ`, `ευχαριστώ` -> `Καλημέρα, παρακαλώ.`, `Ναι, παρακαλώ.`, `Όχι, ευχαριστώ.`
  2. Drinks: `καφές`, `τσάι`, `νερό`, `χυμός`, `μπύρα`, `κρασί` -> `ένας καφές` -> `Θέλω έναν καφέ.`, `Θέλω ένα τσάι, παρακαλώ.`
  3. Snacks and how: `τοστ`, `κέικ`, `παγωτό`, `σοκολάτα`, `με γάλα`, `χωρίς ζάχαρη`, `ζεστός`/`κρύος` -> `Θέλω έναν καφέ με γάλα, χωρίς ζάχαρη.`
  4. The waiter: `Τι θέλετε;`, `Θέλετε κάτι άλλο;`, `τίποτα` -> `Τίποτα άλλο, ευχαριστώ.`, `Έχετε μπισκότα;`
  5. Price and numbers: `δύο`, `τρεις`, `τέσσερις`, `πέντε`, `δέκα` with `ευρώ`, `πόσο κάνει` -> `Πόσο κάνει ο καφές;`, `Κάνει τρία ευρώ.`
  6. Paying: `λογαριασμός`, `μετρητά`, `κάρτα`, `Μπορώ να πληρώσω με κάρτα;` -> a full café dialogue as five sentences.
- **Introduces:** γεια, καλημέρα, καλησπέρα, παρακαλώ, ευχαριστώ, ναι, όχι, συγγνώμη, βεβαίως, θέλω, μπορώ, έχω, πληρώνω, κάνω, να, ο, ένας, και, με, χωρίς, ή, τι, πόσος, αυτός, κάτι, τίποτα, άλλος, μικρός, μεγάλος, ζεστός, κρύος, λίγος, καφές, τσάι, νερό, γάλα, ζάχαρη, χυμός, μπύρα, κρασί, τοστ, σάντουιτς, κέικ, παγωτό, κρουασάν, μπισκότο, σοκολάτα, ψωμί, τυρί, ζαμπόν, πορτοκάλι, λεμόνι, λογαριασμός, ευρώ, μετρητά, κάρτα, δύο, τρεις, τέσσερις, πέντε, δέκα

### Module 2: Χαίρω πολύ (`el-a1-xairo-poly`)

- **Requires:** `el-a1-kafes`
- **Can-do:** Greet formally and informally, introduce yourself, say where you are from and where you live.
- **Grammar:** `είμαι` (singular and `είστε`), `με λένε` / `σε λένε` as fixed chunks, `δεν`, nationality nouns with feminine forms, `από` + place, `σε`/`στην` + place, `εσύ/εσείς`, `το όνομά μου` as a chunk.
- **Lessons:**
  1. Meeting: `χαίρω`, `πολύ`, `επίσης`, `κύριος`, `κυρία` -> `Χαίρω πολύ.`, `Επίσης, κύριε.`
  2. Name: `λέω`, `όνομα`, `επώνυμο`, `πώς` -> `Με λένε Μαρία.`, `Πώς σε λένε;`, `Το όνομά μου είναι Νίκος.`
  3. Being: `είμαι`, `εγώ`, `εσύ`, `εσείς`, `δεν` -> `Είμαι η Μαρία.`, `Δεν είμαι ο Νίκος.`, `Είστε η κυρία Ελένη;`
  4. Nationalities: `Έλληνας/Ελληνίδα`, `Ιταλός/Ιταλίδα`, `Ισπανός/Ισπανίδα` and the rest -> `Είμαι Ελληνίδα.`, `Είσαι Ισπανός;` (speaker set).
  5. From and live: `από`, `πού`, `χώρα`, `μένω`, `σε`, `εδώ` -> `Από πού είσαι;`, `Είμαι από την Αθήνα.`, `Μένω στη Θεσσαλονίκη.`
  6. Small talk and goodbye: `καλά`, `πάρα`, `αντίο`, `καληνύχτα`, `αύριο` -> `Τι κάνεις; Καλά, ευχαριστώ, και εσύ;`, `Τα λέμε αύριο.`
- **Introduces:** είμαι, εγώ, εσύ, εσείς, λέω, χαίρω, όνομα, επώνυμο, πώς, από, σε, πού, μένω, δεν, πολύς, πάρα, καλά, χώρα, κύριος, κυρία, επίσης, εδώ, αντίο, καληνύχτα, αύριο, Έλληνας, Ελληνίδα, Ιταλός, Ιταλίδα, Ισπανός, Ισπανίδα, Γάλλος, Γαλλίδα, Γερμανός, Γερμανίδα, Άγγλος, Αγγλίδα, Αμερικανός, Αμερικανίδα, Ολλανδός, Ολλανδέζα, Κύπριος, Κύπρια

### Module 3: Αριθμοί και ώρα (`el-a1-arithmoi-ora`)

- **Requires:** `el-a1-xairo-poly`
- **Can-do:** Count to 100, tell the time, give your age and phone number, name the days.
- **Grammar:** `έχω` (singular), cardinal numbers with gender (`ένας/μία/ένα`, `τρεις/τρία`), `Τι ώρα είναι;` / `Είναι ... η ώρα`, `στις` + hour, `και τέταρτο`, `παρά τέταρτο`, `και μισή`.
- **Lessons:**
  1. 0-20: `μηδέν`, `έξι`... `δώδεκα`, `δεκατρείς`... -> `Έχω δεκαέξι ευρώ.`
  2. Tens to 100: `είκοσι`, `τριάντα` ... `εκατό`, `είκοσι πέντε`, `ογδόντα εννέα` -> prices and ages.
  3. Age and phone: `χρονών`, `τηλέφωνο`, `κινητό`, `αριθμός`, `ποιος` -> `Πόσο χρονών είσαι;`, `Είμαι είκοσι πέντε χρονών.`, `Ποιο είναι το τηλέφωνό σου;`
  4. Time on the hour: `ώρα`, `Τι ώρα είναι;`, `στις`, `ακριβώς`, `περίπου` -> `Είναι τρεις ακριβώς.`, `Στις οκτώ.`
  5. Quarters and halves: `τέταρτο`, `μισός`, `λεπτό`, `παρά`, `και` -> `Είναι πέντε και τέταρτο.`, `Είναι έξι παρά είκοσι.`
  6. Days: `δευτέρα`... `κυριακή`, `σήμερα`, `τώρα`, `πότε`, `νωρίς`, `αργά` -> `Σήμερα είναι τρίτη.`, `Πότε είναι το μάθημα; Την πέμπτη, στις έξι.`
- **Introduces:** μηδέν, έξι, επτά, οκτώ, εννέα, έντεκα, δώδεκα, δεκατρείς, δεκατέσσερις, δεκαπέντε, δεκαέξι, δεκαεπτά, δεκαοκτώ, δεκαεννέα, είκοσι, τριάντα, σαράντα, πενήντα, εξήντα, εβδομήντα, ογδόντα, ενενήντα, εκατό, δευτέρα, τρίτη, τετάρτη, πέμπτη, παρασκευή, σάββατο, κυριακή, ώρα, λεπτό, τέταρτο, μισός, παρά, πότε, τώρα, σήμερα, περίπου, ακριβώς, ποιος, χρόνος, τηλέφωνο, κινητό, αριθμός, νωρίς, αργά

### Module 4: Η οικογένεια (`el-a1-oikogeneia`)

- **Requires:** `el-a1-arithmoi-ora`
- **Can-do:** Describe your family and other people: who they are, how old, what they look like.
- **Grammar:** plural nouns and articles (`οι/τα`), adjective agreement (`ψηλός/ψηλή/ψηλό`), possessive clitics as chunks (`ο αδελφός μου`, `η μητέρα σου`, `το παιδί του`), full `είμαι` and `έχω`.
- **Lessons:**
  1. Parents and siblings: `μητέρα`, `πατέρας`, `μαμά`, `μπαμπάς`, `αδελφός`, `αδελφή` -> `Η μαμά μου.`, `Έχω έναν αδελφό.`
  2. More family: `γιαγιά`, `παππούς`, `θείος`, `θεία`, `ξάδερφος`, `ξαδέρφη`, `γιος`, `κόρη`, `παιδί`, plural `παιδιά` -> `Έχω δύο παιδιά, ένα αγόρι και ένα κορίτσι.`
  3. Plural and agreement: `ο αδελφός / οι αδελφοί`, `η αδελφή / οι αδελφές`, `το παιδί / τα παιδιά` -> `Οι γονείς μου είναι εδώ.`
  4. Describing: `ψηλός`, `κοντός`, `νέος`, `όμορφος`, `έξυπνος`, `ευγενικός` with `μεγάλος/μικρός` -> `Ο αδελφός μου είναι ψηλός και νέος.`, `Η αδελφή μου είναι μικρή.`
  5. Status and feelings: `παντρεμένος`, `ανύπαντρος`, `κουρασμένος`, `χαρούμενος` -> `Είμαι κουρασμένη.` (speaker), `Ο Γιώργος είναι παντρεμένος με τη Μαρία.`
  6. Whole family: `εμείς`, `μαζί`, `ζω`, `μόνος`, `σκύλος`, `γάτα` -> `Εμείς είμαστε πέντε.`, `Ζω με την οικογένειά μου.`, `Έχουμε έναν σκύλο και δύο γάτες.`
- **Introduces:** οικογένεια, μητέρα, πατέρας, μαμά, μπαμπάς, γονέας, αδελφός, αδελφή, παιδί, γιος, κόρη, παππούς, γιαγιά, θείος, θεία, ξάδερφος, ξαδέρφη, σύζυγος, άντρας, γυναίκα, φίλος, φίλη, αγόρι, κορίτσι, άνθρωπος, μωρό, εγγονός, εγγονή, σκύλος, γάτα, ψηλός, κοντός, νέος, όμορφος, ωραίος, καλός, έξυπνος, ευγενικός, κουρασμένος, χαρούμενος, ηλικιωμένος, παντρεμένος, ανύπαντρος, εμείς, ζω, μόνος, μαζί

### Module 5: Δουλειά και σπουδές (`el-a1-douleia-spoudes`)

- **Requires:** `el-a1-oikogeneia`
- **Can-do:** Say what you do, where you work or study, and which languages you speak.
- **Grammar:** present of `-ω` verbs (`δουλεύω`, `γράφω`, `διαβάζω`) and `-άω` verbs (`μιλάω`, `ρωτάω`), `κάνω`, `σε` + article (`στο γραφείο`, `στη δουλειά`, `στην εταιρεία`), `για`, `ως`.
- **Lessons:**
  1. Jobs: `δάσκαλος/δασκάλα`, `γιατρός`, `νοσοκόμος/νοσοκόμα`, `μηχανικός`, `σερβιτόρος/σερβιτόρα` -> `Είμαι δάσκαλος.` (speaker), `Τι δουλειά κάνεις;`
  2. More jobs: `φοιτητής/φοιτήτρια`, `μαθητής/μαθήτρια`, `μάγειρας`, `δικηγόρος`, `υπάλληλος`, `πωλητής/πωλήτρια` -> `Η Σοφία είναι φοιτήτρια.`
  3. Workplace: `γραφείο`, `εταιρεία`, `νοσοκομείο`, `σχολείο`, `πανεπιστήμιο`, `εστιατόριο`, `μαγαζί` -> `Δουλεύω σε ένα μαγαζί.`, `Σπουδάζω στο πανεπιστήμιο.`
  4. Languages: `ελληνικά`, `αγγλικά`, `ισπανικά`, `ιταλικά`, `γαλλικά`, `γερμανικά`, `ολλανδικά`, `γλώσσα`, `μιλάω`, `ξέρω` -> `Μιλάω λίγα ελληνικά.`
  5. Learning: `μαθαίνω`, `διαβάζω`, `γράφω`, `καταλαβαίνω`, `μάθημα`, `βιβλίο`, `λέξη` -> `Μαθαίνω ελληνικά.`, `Δεν καταλαβαίνω.`
  6. Why and but: `γιατί`, `επειδή`, `αλλά`, `ακόμα`, `ρωτάω`, `απαντάω`, `βοηθάω` -> `Γιατί μαθαίνεις ελληνικά; Επειδή μένω στην Αθήνα.`
- **Introduces:** δουλεύω, σπουδάζω, διαβάζω, γράφω, μαθαίνω, μιλάω, καταλαβαίνω, ξέρω, ρωτάω, απαντάω, βοηθάω, δουλειά, δάσκαλος, δασκάλα, γιατρός, φοιτητής, φοιτήτρια, μαθητής, μαθήτρια, μηχανικός, νοσοκόμος, νοσοκόμα, σερβιτόρος, σερβιτόρα, μάγειρας, αστυνομικός, δικηγόρος, υπάλληλος, πωλητής, πωλήτρια, συνταξιούχος, οδηγός, συνάδελφος, διευθυντής, εταιρεία, γραφείο, νοσοκομείο, σχολείο, πανεπιστήμιο, μαγαζί, εστιατόριο, ελληνικά, αγγλικά, ισπανικά, ιταλικά, γαλλικά, γερμανικά, ολλανδικά, γλώσσα, μάθημα, βιβλίο, λέξη, για, ως, ακόμα, γιατί, επειδή, αλλά

### Module 6: Η μέρα μου (`el-a1-mera-mou`)

- **Requires:** `el-a1-douleia-spoudes`
- **Can-do:** Describe your daily routine and say how often you do things.
- **Grammar:** the rest of the present (`τρώω`, `πίνω`, `παίρνω`, `βλέπω`), middle verbs (`σηκώνομαι`, `πλένομαι`, `ντύνομαι`, `κοιμάμαι`, `κάθομαι`), frequency adverbs, accusative objects with names (`Βλέπω τον Γιώργο`).
- **Lessons:**
  1. Morning: `ξυπνάω`, `σηκώνομαι`, `πλένομαι`, `ντύνομαι`, `πρωί`, `ξυπνητήρι` -> `Ξυπνάω στις επτά.`, `Σηκώνομαι νωρίς.`
  2. Meals: `πρωινό`, `μεσημεριανό`, `βραδινό`, `τρώω`, `πίνω`, `μαγειρεύω` -> `Τρώω πρωινό στο σπίτι.`
  3. Work day: `δουλειά`, `ξεκινάω`, `τελειώνω`, `μεσημέρι`, `απόγευμα`, `γυρίζω`, `σπίτι` -> `Τελειώνω στις πέντε και γυρίζω σπίτι.`
  4. Evening: `βράδυ`, `νύχτα`, `τηλεόραση`, `βλέπω`, `ακούω`, `κοιμάμαι`, `ύπνος` -> `Το βράδυ βλέπω τηλεόραση.`
  5. Frequency: `πάντα`, `συχνά`, `συνήθως`, `σπάνια`, `ποτέ`, `κάθε`, `μερικοί`, `φορά` -> `Δεν πίνω ποτέ καφέ το βράδυ.`, `Μερικές φορές τρώω έξω.`
  6. Order: `πρώτα`, `μετά`, `πριν`, `μέχρι`, `ήδη` -> `Πρώτα πλένομαι και μετά τρώω πρωινό.`
- **Introduces:** ξυπνάω, σηκώνομαι, πλένομαι, ντύνομαι, κοιμάμαι, τρώω, πίνω, ξεκινάω, τελειώνω, γυρίζω, περπατάω, παίρνω, βλέπω, ακούω, κάθομαι, βουρτσίζω, καθαρίζω, μαγειρεύω, ξεκουράζομαι, αρχίζω, ετοιμάζω, νυστάζω, πρωί, μεσημέρι, απόγευμα, βράδυ, νύχτα, μέρα, εβδομάδα, πρωινό, μεσημεριανό, βραδινό, ντους, σπίτι, δόντι, ρολόι, ύπνος, τηλεόραση, ξυπνητήρι, πράγμα, κάθε, πάντα, συχνά, μερικοί, φορά, ποτέ, συνήθως, σπάνια, μετά, πριν, πρώτα, μέχρι, ήδη

### Module 7: Στην πόλη (`el-a1-poli`)

- **Requires:** `el-a1-mera-mou`
- **Can-do:** Ask for and understand directions, find places, use public transport.
- **Grammar:** `υπάρχει` (there is/are), `πάω` and `έρχομαι` (all persons), `πρέπει να` + verb, place adverbs and `από/σε` (`κοντά στο`, `απέναντι από το`), imperatives as chunks (`Πηγαίνετε ευθεία`, `Στρίψτε δεξιά`), ordinals `πρώτος/δεύτερος`.
- **Lessons:**
  1. Places: `πόλη`, `κέντρο`, `δρόμος`, `πλατεία`, `πάρκο`, `μουσείο`, `τράπεζα`, `φαρμακείο` -> `Υπάρχει ένα φαρμακείο εδώ κοντά;`
  2. Where: `δεξιά`, `αριστερά`, `ευθεία`, `κοντά`, `μακριά`, `δίπλα`, `απέναντι` -> `Το μουσείο είναι δίπλα στην τράπεζα.`
  3. Going: `πάω`, `έρχομαι`, `φτάνω`, `περνάω`, `στρίβω`, `συνεχίζω` -> `Πηγαίνετε ευθεία και στρίψτε δεξιά.`
  4. Transport: `στάση`, `λεωφορείο`, `μετρό`, `ταξί`, `τρένο`, `σταθμός`, `αεροδρόμιο`, `αυτοκίνητο`, `πόδι` -> `Πού είναι η στάση του λεωφορείου;`
  5. Distance: `μέτρο`, `χιλιόμετρο`, `λεπτό`, `περίπου`, `πρώτος`, `δεύτερος`, `στροφή` -> `Είναι πέντε λεπτά με τα πόδια.`, `Η δεύτερη στροφή δεξιά.`
  6. Asking: `ρωτάω`, `βρίσκω`, `δείχνω`, `χάρτης`, `πρέπει`, `ανοιχτός`, `κλειστός`, `τουαλέτα`, `περίπτερο` -> `Συγγνώμη, πού είναι το ταχυδρομείο; Πρέπει να πάτε ευθεία.`
- **Introduces:** πόλη, χωριό, κέντρο, δρόμος, γωνία, φανάρι, πλατεία, στάση, λεωφορείο, μετρό, ταξί, τρένο, σταθμός, αεροδρόμιο, τράπεζα, φαρμακείο, αρτοποιείο, ταχυδρομείο, μουσείο, εκκλησία, πάρκο, παραλία, θέατρο, βιβλιοπωλείο, περίπτερο, τουαλέτα, αστυνομία, χάρτης, στροφή, μέτρο, χιλιόμετρο, πόδι, αυτοκίνητο, ευθεία, δεξιά, αριστερά, κοντά, μακριά, δίπλα, απέναντι, μπροστά, πίσω, πάνω, κάτω, μέσα, έξω, ανάμεσα, εκεί, πρώτος, δεύτερος, πάω, έρχομαι, υπάρχω, στρίβω, συνεχίζω, βρίσκω, περιμένω, φτάνω, περνάω, δείχνω, πρέπει, ανοιχτός, κλειστός

### Module 8: Στο τραπέζι (`el-a1-trapezi`)

- **Requires:** `el-a1-poli`
- **Can-do:** Book a table, order a meal, say what you like and dislike.
- **Grammar:** `μου αρέσει / μου αρέσουν` (and `σου`), `θα πάρω` as a chunk for ordering, no partitive (`λίγο`, `ένα μπουκάλι`), `πεινάω/διψάω`, `προτιμάω`.
- **Lessons:**
  1. Booking: `κράτηση`, `τραπέζι`, `ελεύθερος`, `άτομο`, `κλείνω` -> `Θέλω να κλείσω ένα τραπέζι για δύο άτομα.`
  2. Table things: `μενού`, `πιάτο`, `ποτήρι`, `μαχαίρι`, `πιρούνι`, `κουτάλι`, `μπουκάλι` -> `Έχετε το μενού;`
  3. Food: `σαλάτα`, `σούπα`, `ψάρι`, `κρέας`, `κοτόπουλο`, `χοιρινό`, `πατάτα`, `ρύζι`, `μακαρόνια`, `πίτσα`, `ομελέτα` -> `Θα πάρω μια σαλάτα και ένα ψάρι.`
  4. Greek dishes and fruit: `μουσακάς`, `σουβλάκι`, `τζατζίκι`, `φέτα`, `γιαούρτι`, `μέλι`, `μήλο`, `μπανάνα`, `ντομάτα`, `αγγούρι`, `κρεμμύδι`, `ελιά`, `λάδι`, `αλάτι`, `πιπέρι`, `επιδόρπιο` -> `Το τζατζίκι είναι νόστιμο.`
  5. Taste: `νόστιμος`, `φρέσκος`, `γλυκός`, `αλμυρός`, `καυτός`, `ψητός`, `τηγανητός`, `βραστός`, `χορτοφάγος` -> `Είμαι χορτοφάγος.`, `Το κοτόπουλο είναι ψητό.`
  6. Likes: `αρέσω`, `προτιμάω`, `πεινάω`, `διψάω`, `φέρνω`, `παραγγέλνω`, `φαγητό`, `ποτό`, `μερίδα` -> `Μου αρέσει το ψάρι, αλλά δεν μου αρέσουν οι ελιές.`
- **Introduces:** θα, μενού, τραπέζι, κράτηση, πιάτο, ποτήρι, μαχαίρι, πιρούνι, κουτάλι, μπουκάλι, σαλάτα, σούπα, ψάρι, κρέας, κοτόπουλο, χοιρινό, πατάτα, ρύζι, μακαρόνια, πίτσα, ομελέτα, αυγό, λαχανικό, φρούτο, μήλο, μπανάνα, ντομάτα, αγγούρι, κρεμμύδι, ελιά, λάδι, αλάτι, πιπέρι, επιδόρπιο, μουσακάς, σουβλάκι, τζατζίκι, φέτα, γιαούρτι, μέλι, φαγητό, ποτό, μερίδα, άτομο, αρέσω, παραγγέλνω, κλείνω, πεινάω, διψάω, φέρνω, προτιμάω, νόστιμος, φρέσκος, γλυκός, αλμυρός, καυτός, ψητός, τηγανητός, βραστός, χορτοφάγος, ελεύθερος

### Module 9: Ελεύθερος χρόνος (`el-a1-eleftheros-xronos`)

- **Requires:** `el-a1-trapezi`
- **Can-do:** Talk about hobbies, make and answer invitations, arrange a meeting.
- **Grammar:** full `θέλω` and `μπορώ` + `να` (`Θέλεις να έρθεις;`, `Μπορείς να έρθεις;`), `παίζω` + object, question words (all so far), `ίσως`, `δυστυχώς`, `εντάξει`.
- **Lessons:**
  1. Hobbies: `χόμπι`, `μουσική`, `ζωγραφική`, `χορός`, `κολύμπι`, `ποδόσφαιρο`, `μπάσκετ` -> `Το χόμπι μου είναι η μουσική.`
  2. Doing: `παίζω`, `τραγουδάω`, `χορεύω`, `κολυμπάω`, `τρέχω`, `ζωγραφίζω`, `ταξιδεύω`, `διασκεδάζω`, `γελάω` -> `Παίζω κιθάρα και πιάνο.`
  3. Events: `ταινία`, `συναυλία`, `πάρτι`, `εκδρομή`, `βόλτα`, `παιχνίδι`, `τραγούδι`, `ποδήλατο`, `βουνό`, `θάλασσα`, `παρέα` -> `Το σαββατοκύριακο κάνουμε εκδρομή στη θάλασσα.`
  4. Inviting: `θέλεις να`, `απόψε`, `σαββατοκύριακο`, `βγαίνω`, `ραντεβού`, `πρόσκληση`, `κανονίζω` -> `Θέλεις να βγούμε απόψε;`
  5. Answering: `ναι, με χαρά`, `χαρά`, `φυσικά`, `σίγουρα`, `εντάξει`, `τέλεια`, `λυπάμαι`, `δυστυχώς`, `απασχολημένος`, `ίσως` -> `Λυπάμαι, δυστυχώς είμαι απασχολημένη.`
  6. Plan: all question words in one dialogue -> `Πότε; Στις οκτώ. Πού; Στην πλατεία. Εντάξει, τα λέμε.`
- **Introduces:** παίζω, τραγουδάω, χορεύω, κολυμπάω, τρέχω, ζωγραφίζω, ταξιδεύω, βγαίνω, γελάω, κανονίζω, λυπάμαι, διασκεδάζω, ποδόσφαιρο, μπάσκετ, κιθάρα, πιάνο, τραγούδι, ταινία, παιχνίδι, πάρτι, συναυλία, εκδρομή, βόλτα, ποδήλατο, βουνό, θάλασσα, σαββατοκύριακο, απόψε, ραντεβού, πρόσκληση, χόμπι, μουσική, ζωγραφική, χορός, κολύμπι, παρέα, ίσως, δυστυχώς, φυσικά, χαρά, τέλεια, σίγουρα, απασχολημένος, εντάξει

### Module 10: Ψώνια (`el-a1-psonia`)

- **Requires:** `el-a1-eleftheros-xronos`
- **Can-do:** Buy clothes and food, ask for sizes, colors and quantities, compare prices.
- **Grammar:** `αυτός/εκείνος` (this/that), color agreement (`κόκκινος/κόκκινη/κόκκινο`; `μπλε`, `γκρι`, `ροζ`, `μωβ` invariable), quantities (`ένα κιλό`, `μισό κιλό`, `ένα πακέτο`), `όλος`.
- **Lessons:**
  1. Clothes: `ρούχο`, `παντελόνι`, `πουκάμισο`, `μπλούζα`, `φούστα`, `φόρεμα`, `πουλόβερ`, `μπουφάν`, `παλτό` -> `Θέλω αυτό το παντελόνι.`
  2. Accessories: `παπούτσι`, `κάλτσα`, `καπέλο`, `τσάντα`, `ζώνη`, `γυαλί`, `σορτς`, `μαγιό` -> `Τα παπούτσια είναι μαύρα.`
  3. Colors and size: `άσπρος`, `μαύρος`, `κόκκινος`, `μπλε`, `πράσινος`, `κίτρινος`, `γκρι`, `ροζ`, `μωβ`, `μέγεθος`, `νούμερο`, `μεσαίος`, `στενός`, `φαρδύς`, `μακρύς` -> `Έχετε αυτό σε μεγάλο μέγεθος;`
  4. The shop: `δοκιμάζω`, `δοκιμαστήριο`, `ταμείο`, `κατάστημα`, `φοράω`, `ταιριάζω`, `αγοράζω`, `ψωνίζω`, `ψώνια` -> `Μπορώ να το δοκιμάσω;`
  5. Price: `τιμή`, `φθηνός`, `ακριβός`, `προσφορά`, `έκπτωση`, `κοστίζω`, `πουλάω`, `ρέστα`, `απόδειξη`, `σακούλα` -> `Πόσο κοστίζει αυτό το μπουφάν;`
  6. Food shopping: `λαϊκή`, `αγορά`, `κιλό`, `γραμμάριο`, `λίτρο`, `πακέτο`, `κουτί`, `σταφύλι`, `φράουλα`, `καρπούζι`, `καρότο`, `όλος` -> `Θέλω ένα κιλό σταφύλια και μισό κιλό φράουλες.`
- **Introduces:** εκείνος, άσπρος, μαύρος, κόκκινος, μπλε, πράσινος, κίτρινος, γκρι, ροζ, μωβ, ρούχο, παντελόνι, πουκάμισο, μπλούζα, φούστα, φόρεμα, πουλόβερ, μπουφάν, παλτό, παπούτσι, κάλτσα, καπέλο, τσάντα, ζώνη, γυαλί, σορτς, μαγιό, μέγεθος, νούμερο, μεσαίος, στενός, φαρδύς, μακρύς, ακριβός, φθηνός, προσφορά, έκπτωση, τιμή, δοκιμάζω, ψωνίζω, αγοράζω, κοστίζω, πουλάω, ταιριάζω, φοράω, δοκιμαστήριο, απόδειξη, ταμείο, κατάστημα, αγορά, λαϊκή, κιλό, γραμμάριο, λίτρο, πακέτο, κουτί, σταφύλι, φράουλα, καρπούζι, καρότο, όλος, ρέστα, σακούλα, ψώνια

### Module 11: Στο ταξίδι (`el-a1-taxidi`)

- **Requires:** `el-a1-psonia`
- **Can-do:** Buy a ticket, book a room, talk about the weather, give dates.
- **Grammar:** `φεύγω/επιστρέφω`, months and seasons, dates (`την πρώτη Μαΐου`, `στις δέκα Μαΐου` with the genitive month as a chunk), weather (`Κάνει ζέστη`, `Βρέχει`, `Χιονίζει`).
- **Lessons:**
  1. Tickets: `εισιτήριο`, `απλός`, `επιστροφή`, `δρομολόγιο`, `πλατφόρμα`, `αναχώρηση`, `άφιξη` -> `Ένα απλό εισιτήριο για Πάτρα, παρακαλώ.`
  2. Vehicles and papers: `αεροπλάνο`, `πλοίο`, `πούλμαν`, `πτήση`, `βαλίτσα`, `αποσκευή`, `διαβατήριο`, `ταυτότητα` -> `Το πλοίο φεύγει στις οκτώ.`
  3. Hotel: `ξενοδοχείο`, `δωμάτιο`, `μονόκλινο`, `δίκλινο`, `κλειδί`, `ασανσέρ`, `πισίνα`, `θέα`, `διακοπές` -> `Έχετε ένα δίκλινο δωμάτιο για τρεις νύχτες;`
  4. Weather: `καιρός`, `ζέστη`, `βρέχω`, `χιονίζω`, `ήλιος`, `βροχή`, `χιόνι`, `αέρας`, `σύννεφο`, `θερμοκρασία`, `βαθμός` -> `Σήμερα κάνει πολλή ζέστη.`
  5. Months and seasons: `ιανουάριος`... `δεκέμβριος`, `καλοκαίρι`, `χειμώνας`, `άνοιξη`, `φθινόπωρο`, `μήνας`, `έτος` -> `Το καλοκαίρι πάω στην Κρήτη.`
  6. Trip: `φεύγω`, `επιστρέφω`, `αλλάζω`, `χρειάζομαι`, `νησί`, `φωτογραφία`, `καθαρός`, `ήσυχος`, `χιλιάδα` -> `Φεύγω στις δέκα Αυγούστου και επιστρέφω στις είκοσι.`
- **Introduces:** ζέστη, βρέχω, χιονίζω, ήλιος, βροχή, χιόνι, αέρας, σύννεφο, θερμοκρασία, βαθμός, καιρός, καλοκαίρι, χειμώνας, άνοιξη, φθινόπωρο, ιανουάριος, φεβρουάριος, μάρτιος, απρίλιος, μάιος, ιούνιος, ιούλιος, αύγουστος, σεπτέμβριος, οκτώβριος, νοέμβριος, δεκέμβριος, μήνας, έτος, χιλιάδα, εισιτήριο, ταξίδι, βαλίτσα, αποσκευή, διαβατήριο, ταυτότητα, πτήση, αεροπλάνο, πλοίο, πούλμαν, πλατφόρμα, δρομολόγιο, αναχώρηση, άφιξη, απλός, επιστροφή, ξενοδοχείο, δωμάτιο, μονόκλινο, δίκλινο, κλειδί, διακοπές, ασανσέρ, πισίνα, καθαρός, ήσυχος, θέα, νησί, φωτογραφία, φεύγω, επιστρέφω, αλλάζω, χρειάζομαι

## A2

### Module 12: Το περασμένο Σαββατοκύριακο (`el-a2-savvatokyriako`)

- **Requires:** `el-a1-taxidi`
- **Can-do:** Say what you did yesterday and last weekend.
- **Grammar:** aorist active (regular `-σα`: `δούλεψα`, `μίλησα`; irregular as chunks: `έκανα`, `πήγα`, `είδα`, `έφαγα`, `ήπια`, `ήρθα`), `ήμουν` as a chunk, past time words, double negation (`δεν ... κανέναν`, `δεν ... πουθενά`).
- **Lessons:**
  1. When: `χθες`, `προχθές`, `περασμένος`, `πέρυσι`, `τότε`, `πριν` -> `Χθες ήμουν στο σπίτι.`
  2. Regular aorist: `δούλεψα`, `μίλησα`, `αγόρασα`, `πλήρωσα`, `τηλεφώνησα` -> `Χθες τηλεφώνησα στη μαμά μου.`
  3. Irregular aorist: `έκανα`, `πήγα`, `είδα`, `έφαγα`, `ήπια`, `ήρθα` -> `Το σάββατο πήγα στην εκδρομή.`
  4. People and things: `γνωρίζω`, `συναντάω`, `στέλνω`, `δίνω`, `ξεχνάω`, `θυμάμαι`, `μήνυμα`, `γράμμα`, `εφημερίδα` -> `Συνάντησα έναν φίλο στο κέντρο.`
  5. Evaluation: `ευχαριστημένος`, `βαρετός`, `ενδιαφέρων`, `κουραστικός`, `ταβέρνα`, `καφετέρια` -> `Η ταινία ήταν πολύ ενδιαφέρουσα.`
  6. Negatives and sequence: `κανένας`, `κάποιος`, `πουθενά`, `ύστερα`, `τελικά`, `αμέσως` -> `Δεν πήγα πουθενά και δεν είδα κανέναν.`
- **Introduces:** χθες, προχθές, περασμένος, πέρυσι, τότε, ύστερα, τελικά, αμέσως, ολόκληρος, κανένας, κάποιος, πουθενά, μπάνιο, επίσκεψη, μήνυμα, γράμμα, εφημερίδα, γνωρίζω, συναντάω, τηλεφωνάω, στέλνω, δίνω, ξεχνάω, θυμάμαι, κερδίζω, χάνω, ξοδεύω, επισκέπτομαι, ψάχνω, σταματάω, βαρετός, ενδιαφέρων, φωτογραφίζω, ευχαριστημένος, κουραστικός, ταβέρνα, καφετέρια, συγγενής, γείτονας, βγάζω, ανεβαίνω, κατεβαίνω

### Module 13: Η ιστορία μου (`el-a2-istoria-mou`)

- **Requires:** `el-a2-savvatokyriako`
- **Can-do:** Tell where you went and the key events of your life.
- **Grammar:** aorist passive/middle (`γεννήθηκα`, `παντρεύτηκα`, `μετακόμισα`), `έχω` + participle as a chunk family (`Έχω πάει στην Κρήτη`, `Δεν έχω δει`), `όταν`, `από τότε`.
- **Lessons:**
  1. Birth and school: `γεννιέμαι`, `μεγαλώνω`, `δημοτικό`, `γυμνάσιο`, `λύκειο` -> `Γεννήθηκα στη Λευκωσία.`
  2. Study and work: `πτυχίο`, `δίπλωμα`, `μετακομίζω`, `αλλάζω`, `εξωτερικό` -> `Σπούδασα στην Αθήνα και μετακόμισα στο εξωτερικό.`
  3. Relationships: `παντρεύομαι`, `γάμος`, `ερωτεύομαι`, `χωρίζω`, `ζευγάρι`, `πεθαίνω` -> `Παντρεύτηκα πριν δέκα χρόνια.`
  4. Experience chunk: `έχω πάει`, `έχω δει`, `δεν έχω πάει ποτέ`, `εμπειρία` -> `Έχεις πάει ποτέ στη Ρόδο;`
  5. Order and recent: `όταν`, `κάποτε`, `πρόσφατα`, `αργότερα`, `αρχή`, `τέλος`, `πρώην`, `σχεδόν` -> `Όταν τελείωσα το σχολείο, πήγα στην Αθήνα.`
  6. My story: `ιστορία`, `χρονιά`, `πατρίδα`, `απόφαση`, `αποφασίζω`, `γειτονιά`, `ευτυχώς` -> a five-sentence life story.
- **Introduces:** γεννιέμαι, παντρεύομαι, μετακομίζω, μεγαλώνω, γίνομαι, ερωτεύομαι, χωρίζω, πεθαίνω, ανοίγω, αποφασίζω, ζωή, γάμος, γέννηση, πτυχίο, δίπλωμα, ιστορία, χρονιά, πατρίδα, εξωτερικό, γειτονιά, δημοτικό, γυμνάσιο, λύκειο, απόφαση, εμπειρία, ζευγάρι, παιδικός, τελευταίος, όταν, κάποτε, πρόσφατα, ευτυχώς, ξένος, παλιός, ανάμνηση, αρχή, τέλος, αργότερα, πρώην, σχεδόν

### Module 14: Όταν ήμουν παιδί (`el-a2-paidi`)

- **Requires:** `el-a2-istoria-mou`
- **Can-do:** Describe the past and past habits.
- **Grammar:** imperfect (`ήμουν`, `είχα`, `έπαιζα`, `ζούσα`, `πήγαινα`), `συνήθιζα να`, `κάθε`, `πάντα` in the past.
- **Lessons:**
  1. Childhood things: `κούκλα`, `μπάλα`, `παραμύθι`, `καραμέλα`, `ζαχαροπλαστείο`, `παιχνίδι` -> `Είχα μια μεγάλη μπάλα.`
  2. Place: `αυλή`, `κήπος`, `δέντρο`, `λουλούδι`, `ζώο`, `πρόβατο`, `κότα`, `πουλί`, `άλογο`, `ποντίκι` -> `Στο χωριό είχαμε πολλά ζώα.`
  3. Habits: `συνηθίζω`, `συνήθεια`, `κάθε καλοκαίρι`, `παίζω`, `τρέχω`, `σκαρφαλώνω`, `κρύβομαι` -> `Κάθε μέρα έπαιζα στην αυλή.`
  4. People: `συμμαθητής`, `συμμαθήτρια`, `ντροπαλός`, `ζωηρός`, `αυστηρός`, `υπάκουος`, `αγαπημένος` -> `Ήμουν πολύ ντροπαλός.` (speaker)
  5. Feelings then: `αγαπάω`, `φοβάμαι`, `κλαίω`, `λείπω`, `φόβος`, `λύπη`, `ευτυχία`, `χαμόγελο`, `φωνάζω` -> `Φοβόμουν το σκοτάδι.`, `Μου έλειπε η γιαγιά.`
  6. Then and now: `εποχή`, `ονειρεύομαι` is B1; `μαλώνω`, `μοιάζω`, `τότε`/`τώρα`, `όνειρο`, `ευτυχισμένος` -> `Τότε ζούσα στην Κύπρο, τώρα μένω στην Αθήνα.`
- **Introduces:** κούκλα, μπάλα, παραμύθι, αυλή, κήπος, δέντρο, λουλούδι, ζώο, πρόβατο, κότα, πουλί, άλογο, ποντίκι, συμμαθητής, συμμαθήτρια, καραμέλα, ζαχαροπλαστείο, συνήθεια, εποχή, όνειρο, φόβος, λύπη, ευτυχία, χαμόγελο, ντροπαλός, ζωηρός, αυστηρός, υπάκουος, ευτυχισμένος, αγαπημένος, συνηθίζω, αγαπάω, φοβάμαι, κλαίω, λείπω, μαλώνω, κρύβομαι, σκαρφαλώνω, φωνάζω, μοιάζω

### Module 15: Τι έγινε; (`el-a2-ti-egine`)

- **Requires:** `el-a2-paidi`
- **Can-do:** Tell a short story with background and events.
- **Grammar:** aorist for events versus imperfect for background, `ενώ`, `ξαφνικά`, `όταν` + past, `ευτυχώς/δυστυχώς`.
- **Lessons:**
  1. Accident: `ατύχημα`, `τρακάρω`, `πέφτω`, `σπάζω`, `τρομάζω`, `ξαφνικά` -> `Ξαφνικά ένα αυτοκίνητο τράκαρε.`
  2. Theft and loss: `κλέβω`, `κλέφτης`, `πορτοφόλι`, `πόρτα`, `ανακαλύπτω`, `λάθος` -> `Ο κλέφτης μπήκε από την πόρτα.`
  3. Help: `καλώ`, `ζητάω`, `βοήθεια`, `ευτυχώς`, `τυχερός`, `αστυνομία`, `σηκώνω`, `χτυπάω` -> `Κάλεσα την αστυνομία.`
  4. Weather and scene: `θύελλα`, `φωτιά`, `σκοτάδι`, `φως`, `θόρυβος`, `κόσμος`, `ενώ` -> `Ενώ έβρεχε, ο κόσμος έτρεχε.`
  5. Reaction: `ξαφνιάζομαι`, `επιτέλους`, `στο τέλος`, `γρήγορα`, `σιγά`, `έτσι`, `πλησιάζω`, `ακολουθώ`, `πετάω` -> `Έτσι βρήκα το πορτοφόλι μου.`
  6. Tell it: `συμβαίνω`, `εξηγώ`, `ενώ`, `όταν`, `τι έγινε` -> a five-sentence story (`Ενώ περπατούσα στο κέντρο, ...`).
- **Introduces:** ξαφνικά, ενώ, επιτέλους, τυχερός, ατύχημα, τροχαίο, κλέβω, κλέφτης, πορτοφόλι, πέφτω, σπάζω, τρομάζω, καλώ, φωτιά, θύελλα, μπαίνω, σηκώνω, ξαφνιάζομαι, ανακαλύπτω, συμβαίνω, λάθος, σκοτάδι, πόρτα, χτυπάω, τρακάρω, φως, κόσμος, θόρυβος, εξηγώ, ζητάω, βοήθεια, έτσι, γρήγορα, σιγά, πλησιάζω, ακολουθώ, πετάω, κανείς

### Module 16: Στον γιατρό (`el-a2-giatros`)

- **Requires:** `el-a2-ti-egine`
- **Can-do:** Say what hurts, understand simple advice, buy medicine.
- **Grammar:** `πονάει / πονάνε` with clitics (`Με πονάει το κεφάλι`, `Πονάει το στομάχι μου`), body parts, `πρέπει να` + advice, `καλύτερα` as a chunk (`Νιώθω καλύτερα`).
- **Lessons:**
  1. Body: `κεφάλι`, `μάτι`, `αυτί`, `μύτη`, `στόμα`, `λαιμός`, `χέρι`, `δάχτυλο`, `γόνατο`, `πλάτη`, `στομάχι`, `καρδιά`, `κοιλιά` -> `Πονάει το κεφάλι μου.`
  2. Illness: `πόνος`, `πυρετός`, `βήχας`, `κρυολόγημα`, `γρίπη`, `αλλεργία`, `αρρώστια`, `άρρωστος` -> `Έχω πυρετό και βήχα.`
  3. At the doctor: `γιατρός`, `ασθενής`, `εξέταση`, `πίεση`, `σοβαρός`, `νιώθω`, `ζαλίζομαι` -> `Πόσο καιρό νιώθεις έτσι;`
  4. Medicine: `φάρμακο`, `χάπι`, `αντιβιοτικό`, `συνταγή`, `φαρμακείο`, `ασθενοφόρο` -> `Πρέπει να πάρετε ένα χάπι τρεις φορές τη μέρα.`
  5. Advice: `πρέπει`, `ξεκουράζομαι`, `υγρό`, `υγεία`, `προσέχω`, `σύντομα`, `καλύτερα` -> `Πρέπει να ξεκουραστείτε και να πίνετε νερό.`
  6. Changes: `αρρωσταίνω`, `κρυώνω`, `ζεσταίνομαι`, `βήχω`, `γίνομαι καλά`, `καλύτερα` -> `Σήμερα νιώθω καλύτερα.`
- **Introduces:** κεφάλι, μάτι, αυτί, μύτη, στόμα, λαιμός, χέρι, δάχτυλο, γόνατο, πλάτη, στομάχι, καρδιά, κοιλιά, πρόσωπο, μαλλιά, σώμα, πονάω, πόνος, πυρετός, βήχας, κρυολόγημα, γρίπη, αλλεργία, αρρώστια, άρρωστος, ασθενής, φάρμακο, χάπι, αντιβιοτικό, συνταγή, ασθενοφόρο, εξέταση, πίεση, υγεία, νιώθω, αρρωσταίνω, κρυώνω, ζεσταίνομαι, βήχω, ζαλίζομαι, σοβαρός, υγρό, καλύτερα, σύντομα, προσέχω

### Module 17: Το καινούριο σπίτι (`el-a2-kainourio-spiti`)

- **Requires:** `el-a2-giatros`
- **Can-do:** Describe a home, rent a flat, move in.
- **Grammar:** weak object pronouns (`τον`, `την`, `το`, `τα`: `Το βλέπω`, `Τον ξέρω`), place prepositions with `σε/από`, ordinals for floors (`τρίτος όροφος`).
- **Lessons:**
  1. Rooms: `διαμέρισμα`, `υπνοδωμάτιο`, `σαλόνι`, `κουζίνα`, `μπαλκόνι`, `ταράτσα`, `όροφος`, `ισόγειο`, `σκάλα` -> `Το διαμέρισμα είναι στον τρίτο όροφο.`
  2. Furniture: `έπιπλο`, `καναπές`, `καρέκλα`, `κρεβάτι`, `ντουλάπα`, `ντουλάπι`, `ράφι`, `τραπέζι` -> `Η ντουλάπα είναι δίπλα στο κρεβάτι.`
  3. Appliances: `ψυγείο`, `φούρνος`, `πλυντήριο`, `λάμπα`, `χαλί`, `κουρτίνα`, `καθρέφτης`, `παράθυρο`, `τοίχος`, `πάτωμα` -> `Το πλυντήριο είναι καινούριο.`
  4. Object pronouns: `τον`, `την`, `το`, `τα` with `βλέπω`, `βρίσκω`, `θέλω`, `έχω` -> `Το βλέπω.`, `Την αγόρασα χθες.`
  5. Renting: `νοικιάζω`, `ενοίκιο`, `ιδιοκτήτης`, `συμβόλαιο`, `ρεύμα`, `θέρμανση`, `κλιματιστικό`, `τετραγωνικό` -> `Το ενοίκιο είναι ογδόντα ευρώ.`
  6. Moving in: `βάζω`, `τακτοποιώ`, `ανάβω`, `σβήνω`, `κρεμάω`, `πλένω`, `μαζεύω`, `βρίσκομαι`, `ευρύχωρος`, `φωτεινός`, `επιπλωμένος`, `συμφωνώ`, `μοιράζομαι`, `σκουπίδι` -> `Συμφωνώ, θα το νοικιάσω.`
- **Introduces:** διαμέρισμα, υπνοδωμάτιο, σαλόνι, κουζίνα, μπαλκόνι, ταράτσα, όροφος, ισόγειο, σκάλα, παράθυρο, τοίχος, πάτωμα, έπιπλο, καναπές, καρέκλα, κρεβάτι, ντουλάπα, ντουλάπι, ράφι, ψυγείο, φούρνος, πλυντήριο, λάμπα, χαλί, κουρτίνα, καθρέφτης, ενοίκιο, ιδιοκτήτης, συμβόλαιο, ρεύμα, θέρμανση, κλιματιστικό, τετραγωνικό, σκουπίδι, ευρύχωρος, φωτεινός, επιπλωμένος, τρίτος, νοικιάζω, βάζω, τακτοποιώ, ανάβω, σβήνω, κρεμάω, πλένω, συμφωνώ, μοιράζομαι, μαζεύω, βρίσκομαι

### Module 18: Δώρα και γιορτές (`el-a2-dora-giortes`)

- **Requires:** `el-a2-kainourio-spiti`
- **Can-do:** Talk about celebrations, give and thank for gifts, exchange wishes.
- **Grammar:** indirect object clitics (`μου δίνει`, `σου στέλνω`, `του/της αρέσει`), `αρέσω` with all persons, the genitive with `του/της/των` as a system starts (`το δώρο του Νίκου`), dates.
- **Lessons:**
  1. Occasions: `γενέθλια`, `γιορτή`, `χριστούγεννα`, `πάσχα`, `πρωτοχρονιά`, `αργία`, `ημερομηνία` -> `Τα γενέθλιά μου είναι στις δέκα Μαΐου.`
  2. Gifts: `δώρο`, `κόσμημα`, `άρωμα`, `σοκολατάκι`, `χαρτί`, `τυλίγω`, `έκπληξη`, `ιδέα` -> `Αγόρασα ένα δώρο για τη μαμά.`
  3. Wishes: `ευχή`, `εύχομαι`, `χρόνια πολλά`, `συγχαρητήρια`, `καλά χριστούγεννα`, `καλή χρονιά` -> `Σου εύχομαι χρόνια πολλά!`
  4. Party: `τούρτα`, `κερί`, `μπαλόνι`, `σαμπάνια`, `πρόποση`, `καλεσμένος`, `προσκαλώ`, `γιορτάζω` -> `Προσκάλεσα όλους τους φίλους μου.`
  5. Indirect objects: `δίνω`, `στέλνω`, `φέρνω`, `μου`, `σου`, `του`, `της`, `μας`, `σας`, `τους` -> `Της έφερα λουλούδια.`, `Τους αρέσει το δώρο;`
  6. Thanks: `υπέροχος`, `ιδιαίτερος`, `μοναδικός`, `ευχάριστος`, `αλήθεια`, `δέχομαι`, `κρατάω`, `φτιάχνω`, `κόβω`, `φιλάω`, `αγκαλιά`, `αγκαλιάζω`, `ανιψιός`, `ανιψιά`, `εκδήλωση`, `κομμάτι` -> `Σε ευχαριστώ πολύ, είναι υπέροχο δώρο!`
- **Introduces:** γενέθλια, γιορτή, χριστούγεννα, πάσχα, πρωτοχρονιά, αργία, δώρο, τούρτα, κερί, μπαλόνι, ευχή, συγχαρητήρια, ιδέα, έκπληξη, χαρτί, κόσμημα, άρωμα, σοκολατάκι, ημερομηνία, αλήθεια, εύχομαι, τυλίγω, γιορτάζω, προσκαλώ, δέχομαι, κρατάω, φτιάχνω, κόβω, φιλάω, αγκαλιάζω, αγκαλιά, υπέροχος, ιδιαίτερος, καλεσμένος, ευχάριστος, μοναδικός, σαμπάνια, πρόποση, ανιψιός, ανιψιά, εκδήλωση, κομμάτι

### Module 19: Σχέδια (`el-a2-sxedia`)

- **Requires:** `el-a2-dora-giortes`
- **Can-do:** Talk about plans, intentions and conditions.
- **Grammar:** future with `θα` + subjunctive stem (`θα πάω`, `θα μείνω`, `θα έχω`), `αν` + present/aorist subjunctive (`Αν βρέξει, θα μείνω σπίτι`), `σε` for time (`σε δύο μέρες`), `να` after `θέλω`, `ελπίζω`, `σκοπεύω`.
- **Lessons:**
  1. Next: `επόμενος`, `μεθαύριο`, `μέλλον`, `του χρόνου`, `σύντομα`, `ξανά` -> `Αύριο θα πάω στη δουλειά.`
  2. Intentions: `σκέφτομαι`, `σκοπεύω`, `ελπίζω`, `φαντάζομαι`, `προσπαθώ`, `ανυπομονώ` -> `Σκοπεύω να ταξιδέψω.`
  3. Planning: `σχέδιο`, `πρόγραμμα`, `ημερολόγιο`, `ωράριο`, `λίστα`, `συνάντηση`, `προγραμματίζω`, `ετοιμάζομαι` -> `Έχω συνάντηση την τρίτη στις δέκα.`
  4. Conditions: `αν`, `μάλλον`, `πιθανός`, `δυνατός`, `ιδανικός`, `αλλιώς`, `εκτός`, `τουλάχιστον` -> `Αν δεν βρέξει, θα κάνουμε βόλτα.`
  5. Money and time: `χρήματα`, `άδεια`, `διάλειμμα`, `υπόσχομαι`, `επιλέγω`, `προτείνω`, `υπολογίζω` -> `Αν πάρω άδεια, θα ταξιδέψω στη Ρόδο.`
  6. Goals: `στόχος`, `ευκαιρία`, `επιτυχία`, `εγγράφομαι`, `ολοκληρώνω`, `τουρίστας`, `σκέψη`, `τέλειος` -> `Του χρόνου θα εγγραφώ στο πανεπιστήμιο.`
- **Introduces:** σχέδιο, σκέφτομαι, σκοπεύω, ελπίζω, ετοιμάζομαι, προγραμματίζω, αν, μάλλον, ξανά, επόμενος, μεθαύριο, μέλλον, πρόγραμμα, άδεια, διάλειμμα, χρήματα, υπόσχομαι, φαντάζομαι, πιθανός, δυνατός, προσπαθώ, ανυπομονώ, ευκαιρία, στόχος, επιτυχία, εγγράφομαι, τουρίστας, υπολογίζω, προτείνω, επιλέγω, σκέψη, συνάντηση, ημερολόγιο, ωράριο, λίστα, ιδανικός, τέλειος, αλλιώς, εκτός, τουλάχιστον, ολοκληρώνω

### Module 20: Καλύτερα ή χειρότερα (`el-a2-kalytera-xeirotera`)

- **Requires:** `el-a2-sxedia`
- **Can-do:** Compare places, people and things.
- **Grammar:** comparative with `πιο ... από` and irregular `καλύτερος/χειρότερος/μεγαλύτερος/μικρότερος`, superlative `ο πιο ...` / `ο καλύτερος`, `πανέμορφος`, `τόσο ... όσο`, `ίδιος`, relative `που` as a chunk.
- **Lessons:**
  1. More and less: `πιο`, `περισσότερος`, `λιγότερος`, `από` -> `Η Θεσσαλονίκη είναι πιο μικρή από την Αθήνα.`
  2. Good and bad: `καλύτερος`, `χειρότερος`, `κακός`, `μεγαλύτερος`, `μικρότερος` -> `Αυτό το ξενοδοχείο είναι καλύτερο.`
  3. Adjectives: `γρήγορος`, `αργός`, `δύσκολος`, `εύκολος`, `σημαντικός`, `φτωχός`, `πλούσιος`, `βαρύς`, `ελαφρύς`, `αδύναμος` -> `Το τρένο είναι πιο γρήγορο.`
  4. Places: `βρώμικος`, `γεμάτος`, `άδειος`, `πολυσύχναστος`, `ασφαλής`, `επικίνδυνος`, `ποιότητα`, `απόσταση`, `ομορφιά` -> `Το χωριό είναι πιο ήσυχο.`
  5. Equal and different: `τόσος`, `όσος`, `ίδιος`, `διαφορετικός`, `παρόμοιος`, `διαφορά`, `εξίσου`, `σχετικά`, `κάπως`, `αρκετός` -> `Το μαγαζί είναι τόσο ακριβό όσο το άλλο.`
  6. Superlative: `ο πιο`, `πανέμορφος`, `πανάκριβος`, `συγκρίνω`, `αξίζω`, `που` -> `Αυτή είναι η πιο όμορφη παραλία που έχω δει.`
- **Introduces:** πιο, περισσότερος, λιγότερος, καλύτερος, χειρότερος, μεγαλύτερος, μικρότερος, όσος, τόσος, ίδιος, διαφορετικός, παρόμοιος, κακός, γρήγορος, αργός, δύσκολος, εύκολος, σημαντικός, φτωχός, πλούσιος, βαρύς, ελαφρύς, αδύναμος, βρώμικος, γεμάτος, άδειος, πολυσύχναστος, ασφαλής, επικίνδυνος, ποιότητα, απόσταση, ομορφιά, συγκρίνω, αξίζω, εξίσου, σχετικά, αρκετός, πανάκριβος, πανέμορφος, διαφορά, κάπως, που

### Module 21: Με ευγένεια (`el-a2-me-efgeneia`)

- **Requires:** `el-a2-kalytera-xeirotera`
- **Can-do:** Make polite requests, give advice, handle a phone call.
- **Grammar:** conditional as chunks and system (`θα ήθελα`, `θα μπορούσα`, `θα έπρεπε`), imperatives informal (`έλα`, `πες`, `κάνε`) and formal (`ελάτε`, `πείτε`, `περιμένετε`), negative imperative with `μην`.
- **Lessons:**
  1. Polite asking: `θα ήθελα`, `θα μπορούσα`, `σε παρακαλώ`, `μήπως`, `ευγένεια`, `ευχαρίστηση` -> `Θα ήθελα έναν καφέ, παρακαλώ.`
  2. Imperatives: `έλα`, `πες`, `κάνε`, `δώσε`, `περιμένετε`, `ελάτε`, `μην`, `στιγμή`, `υπομονή` -> `Περιμένετε μια στιγμή, παρακαλώ.`
  3. Rules: `απαγορεύω`, `επιτρέπω`, `καπνίζω`, `αφήνω`, `ενοχλώ`, `οδηγία`, `τρόπος` -> `Μην καπνίζετε εδώ.`
  4. Phone: `εμπρός`, `γραμμή`, `διεύθυνση`, `ηλεκτρονικός`, `σημειώνω`, `επαναλαμβάνω`, `πληροφορία` -> `Εμπρός; Θα ήθελα να μιλήσω με τον κύριο Νίκο.`
  5. Advice: `συμβουλή`, `προτείνω`, `πρόβλημα`, `διαθέσιμος`, `υπεύθυνος`, `χρήσιμος`, `ενημερώνω`, `ενδιαφέρομαι` -> `Θα έπρεπε να ρωτήσετε τον υπεύθυνο.`
  6. Changes: `ακυρώνω`, `επιβεβαιώνω`, `διακόπτω`, `συγχωρώ`, `ασφαλώς`, `απλώς`, `καθόλου`, `πραγματικά`, `εννοώ` -> `Συγγνώμη που σας διακόπτω, θα ήθελα να ακυρώσω το ραντεβού.`
- **Introduces:** εμπρός, γραμμή, επαναλαμβάνω, συμβουλή, μήπως, συγχωρώ, μην, απαγορεύω, επιτρέπω, καπνίζω, αφήνω, χαμηλός, διεύθυνση, ηλεκτρονικός, σημειώνω, πρόβλημα, ευχαρίστηση, ασφαλώς, απλώς, ενδιαφέρομαι, ενημερώνω, πληροφορία, διακόπτω, ακυρώνω, επιβεβαιώνω, υπομονή, στιγμή, ενοχλώ, οδηγία, ευγένεια, τρόπος, διαθέσιμος, υπεύθυνος, χρήσιμος, καθόλου, πραγματικά, εννοώ

## B1

### Module 22: Απρόοπτα στο ταξίδι (`el-b1-aproopta`)

- **Requires:** `el-a2-me-efgeneia`
- **Can-do:** Handle cancellations, strikes and lost luggage; tell what had already happened.
- **Grammar:** pluperfect `είχα` + participle (`Είχα ήδη φύγει`, `Το τρένο είχε φύγει`), `μόλις`, `αφού`, `πια`, `ούτε ... ούτε`.
- **Lessons:**
  1. Delays: `καθυστέρηση`, `ακύρωση`, `απεργία`, `αναβάλλω`, `κακοκαιρία`, `καταιγίδα`, `καθυστερώ` -> `Η πτήση καθυστέρησε δύο ώρες.`
  2. At the airport: `επιβάτης`, `πλήρωμα`, `πιλότος`, `επιβίβαση`, `πύλη`, `έλεγχος`, `τελωνείο`, `ανταπόκριση` -> `Έχασα την ανταπόκριση.`
  3. Lost luggage: `ζημιά`, `χαμένος`, `δηλώνω`, `συμπληρώνω`, `έντυπο`, `εντοπίζω`, `μεταφέρω` -> `Οι αποσκευές μου είχαν χαθεί.`
  4. Complaints: `διαμαρτύρομαι`, `παράπονο`, `αποζημίωση`, `αίτηση`, `υπηρεσία`, `ευθύνη`, `εκπρόσωπος`, `ασφάλεια` -> `Θα ήθελα να υποβάλω παράπονο.`
  5. Sequence: `μόλις`, `αφού`, `πια`, `ούτε`, `ήδη`, `λόγω`, `εξαιτίας`, `οπότε`, `επομένως` -> `Μόλις φτάσαμε, ο σταθμός είχε κλείσει.`
  6. Coping: `πιάνω`, `προλαβαίνω`, `αναγκάζομαι`, `αντικαθιστώ`, `αναζητώ` -> `Αναγκάστηκα να μείνω μια νύχτα στο αεροδρόμιο.`
- **Introduces:** καθυστέρηση, ακύρωση, απεργία, αποζημίωση, επιβάτης, πλήρωμα, πιλότος, επιβίβαση, πύλη, έλεγχος, τελωνείο, ζημιά, χαμένος, δηλώνω, συμπληρώνω, έντυπο, αίτηση, πιάνω, προλαβαίνω, καθυστερώ, αναγκάζομαι, κακοκαιρία, καταιγίδα, ανταπόκριση, αναβάλλω, μόλις, αφού, πια, ούτε, λόγω, οπότε, εξαιτίας, επομένως, μεταφέρω, αντικαθιστώ, εντοπίζω, εκπρόσωπος, διαμαρτύρομαι, παράπονο, υπηρεσία, ευθύνη, ασφάλεια, αναζητώ

### Module 23: Μου το δανείζεις; (`el-b1-daneizeis`)

- **Requires:** `el-b1-aproopta`
- **Can-do:** Ask for and do favors; lend, borrow and return things.
- **Grammar:** combined clitics (`μου το δίνεις`, `σου το φέρνω`, `δώσε μου το`), `καταφέρνω`, `νοιάζομαι`, `δικός μου`.
- **Lessons:**
  1. Favors: `χάρη`, `ανάγκη`, `υποχρέωση`, `ευγνώμων`, `φροντίζω`, `ποτίζω`, `φυλάω` -> `Μπορείς να μου κάνεις μια χάρη;`
  2. Lending: `δανείζω`, `δανείζομαι`, `χρησιμοποιώ`, `επιστρέφω`, `ομπρέλα`, `σακάκι`, `φορτιστής`, `κράνος` -> `Μου δανείζεις την ομπρέλα σου;`
  3. Combined clitics: `μου το`, `σου το`, `του το`, `μας τα` with `δίνω`, `φέρνω`, `στέλνω` -> `Σου το φέρνω αύριο.`, `Δώσε μου το.`
  4. Fixing: `βλάβη`, `επισκευάζω`, `διορθώνω`, `ηλεκτρολόγος`, `υδραυλικός`, `εργαλείο`, `μηχανή`, `υπολογιστής` -> `Ο υπολογιστής μου έχει βλάβη, μου τον διορθώνεις;`
  5. Practical: `κλειδώνω`, `φορτίζω`, `παρκάρω`, `κουβαλάω`, `παραδίδω`, `παραλαμβάνω`, `δέμα`, `κατοικίδιο`, `φυτό` -> `Μπορείς να μου κουβαλήσεις τη βαλίτσα;`
  6. Coping: `καταφέρνω`, `νοιάζομαι`, `βαριέμαι`, `κερνάω`, `σκουπίζω`, `δικός` -> `Τα κατάφερα μόνος μου.`, `Σε κερνάω εγώ.`
- **Introduces:** δανείζω, δανείζομαι, χρησιμοποιώ, κλειδώνω, φορτίζω, παρκάρω, φροντίζω, ποτίζω, φυλάω, κουβαλάω, βαριέμαι, καταφέρνω, νοιάζομαι, παραδίδω, παραλαμβάνω, διορθώνω, σκουπίζω, κερνάω, επισκευάζω, χάρη, ανάγκη, υποχρέωση, ευγνώμων, δικός, ομπρέλα, σακάκι, φορτιστής, μηχανή, εργαλείο, κράνος, υπολογιστής, κατοικίδιο, φυτό, δέμα, ηλεκτρολόγος, υδραυλικός, βλάβη

### Module 24: Ψάχνω δουλειά (`el-b1-psaxno-douleia`)

- **Requires:** `el-b1-daneizeis`
- **Can-do:** Look for a job, talk about a CV, get through an interview.
- **Grammar:** gerund `-οντας` (`δουλεύοντας`, `ψάχνοντας`), `πρόκειται να`, `είμαι έτοιμος να`, `συνεχίζω να`.
- **Lessons:**
  1. Ads: `αγγελία`, `θέση`, `προσόν`, `δεξιότητα`, `ικανότητα`, `προϋπηρεσία`, `απασχόληση`, `πλήρης` -> `Ψάχνουμε υπάλληλο με εμπειρία.`
  2. CV: `βιογραφικό`, `υποβάλλω`, `στέλνω`, `πτυχίο`, `εκπαίδευση`, `εργάζομαι`, `υποψήφιος` -> `Έστειλα το βιογραφικό μου.`
  3. Interview: `συνέντευξη`, `εργοδότης`, `ομάδα`, `ευέλικτος`, `ικανός`, `πρόθυμος`, `οργανωμένος`, `δημιουργικός` -> `Είμαι πρόθυμος να δουλεύω Σαββατοκύριακα.`
  4. Pay and terms: `μισθός`, `αμοιβή`, `αύξηση`, `προαγωγή`, `πρόσληψη`, `προσλαμβάνω`, `απολύω`, `παραιτούμαι` -> `Με προσέλαβαν την περασμένη εβδομάδα.`
  5. Gerund and soon: `πρόκειται να`, `έτοιμος`, `ασχολούμαι`, `συνεργάζομαι`, `διαχειρίζομαι`, `οργανώνω` -> `Πρόκειται να ξεκινήσω νέα δουλειά.`
  6. Career: `καριέρα`, `επάγγελμα`, `επαγγελματίας`, `τομέας`, `επιχείρηση`, `προϊστάμενος`, `αφεντικό`, `ανεργία`, `άνεργος`, `καλύπτω` -> `Δουλεύοντας εδώ, έμαθα πολλά.`
- **Introduces:** βιογραφικό, συνέντευξη, αγγελία, θέση, προσόν, δεξιότητα, ικανότητα, μισθός, απασχόληση, προϋπηρεσία, υποψήφιος, εργοδότης, εργαζόμενος, ομάδα, προϊστάμενος, αφεντικό, επιχείρηση, τομέας, επαγγελματίας, επάγγελμα, καριέρα, προαγωγή, αύξηση, ανεργία, άνεργος, εκπαίδευση, αμοιβή, πρόσληψη, ευέλικτος, ικανός, πρόθυμος, οργανωμένος, δημιουργικός, έτοιμος, πλήρης, προσλαμβάνω, απολύω, παραιτούμαι, υποβάλλω, καλύπτω, ασχολούμαι, συνεργάζομαι, εργάζομαι, διαχειρίζομαι, οργανώνω, πρόκειται

### Module 25: Κατά τη γνώμη μου (`el-b1-gnomi`)

- **Requires:** `el-b1-psaxno-douleia`
- **Can-do:** Give and ask for opinions, agree, disagree, hedge.
- **Grammar:** `νομίζω/πιστεύω ότι` + indicative, `δεν νομίζω ότι` + indicative or `να` (`Δεν νομίζω να έρθει`), `μπορεί να`, `ίσως να`, `κατά τη γνώμη μου`, `από τη μία ... από την άλλη`.
- **Lessons:**
  1. Opinion: `γνώμη`, `άποψη`, `πιστεύω`, `νομίζω`, `θεωρώ`, `ότι`, `κατά`, `φαίνομαι` -> `Νομίζω ότι έχεις δίκιο.`
  2. Agree and disagree: `συμφωνώ`, `διαφωνώ`, `δίκιο`, `άδικο`, `σωστός`, `λάθος`, `ψέμα`, `πράγματι`, `προφανώς` -> `Διαφωνώ, δεν είναι αλήθεια.`
  3. Certainty: `σίγουρος`, `αμφιβάλλω`, `υποθέτω`, `αδύνατος`, `απίθανος`, `μπορεί να`, `μάλλον` -> `Δεν νομίζω να έρθει σήμερα.`
  4. Arguing: `επιχείρημα`, `λόγος`, `αιτία`, `υποστηρίζω`, `αναφέρω`, `παράδειγμα`, `δηλαδή`, `εξάλλου`, `όμως` -> `Ο λόγος είναι ότι δεν έχουμε χρόνο.`
  5. Sides: `πλευρά`, `υπέρ`, `θετικός`, `αρνητικός`, `πλεονέκτημα`, `μειονέκτημα`, `θέμα`, `ζήτημα`, `από τη μία` -> `Από τη μία έχει πλεονεκτήματα, από την άλλη μειονεκτήματα.`
  6. Hedging: `γενικά`, `κυρίως`, `ιδίως`, `συζητάω`, `αφορώ` -> `Γενικά συμφωνώ, αλλά όχι σε όλα.`
- **Introduces:** πιστεύω, νομίζω, θεωρώ, γνώμη, άποψη, διαφωνώ, σίγουρος, ότι, όμως, εξάλλου, δηλαδή, παράδειγμα, πράγματι, σωστός, δίκιο, άδικο, ψέμα, θέμα, επιχείρημα, λόγος, αιτία, απίθανος, αδύνατος, προφανώς, φαίνομαι, αφορώ, πλευρά, υπέρ, κατά, θετικός, αρνητικός, πλεονέκτημα, μειονέκτημα, ζήτημα, γενικά, κυρίως, ιδίως, συζητάω, υποστηρίζω, αμφιβάλλω, υποθέτω, αναφέρω

### Module 26: Συναισθήματα (`el-b1-synaisthimata`)

- **Requires:** `el-b1-gnomi`
- **Can-do:** Talk about feelings and relationships, wish, worry, make up.
- **Grammar:** `να` + subjunctive after wishes and emotions (`Θέλω να έρθεις`, `Χαίρομαι που ήρθες`, `Φοβάμαι μήπως`, `Μακάρι να`), `έχω` + participle in the subjunctive (`να έχεις πάει`).
- **Lessons:**
  1. Feelings: `χαίρομαι`, `στεναχωριέμαι`, `θυμώνω`, `αγχώνομαι`, `ανησυχώ`, `ντρέπομαι`, `αισθάνομαι` -> `Ανησυχώ για σένα.`
  2. States: `απογοητευμένος`, `θυμωμένος`, `αγχωμένος`, `ανήσυχος`, `περήφανος`, `ερωτευμένος`, `δυστυχισμένος`, `ήρεμος` -> `Είμαι πολύ αγχωμένη.`
  3. Nouns: `μοναξιά`, `άγχος`, `θυμός`, `αγάπη`, `ζήλια`, `ντροπή`, `έρωτας`, `συναίσθημα`, `διάθεση` -> `Νιώθω μεγάλη μοναξιά.`
  4. Relationships: `φιλία`, `σχέση`, `εμπιστοσύνη`, `σεβασμός`, `ειλικρίνεια`, `ειλικρινής`, `εμπιστεύομαι`, `μισώ`, `ζηλεύω` -> `Δεν σε εμπιστεύομαι πια.`
  5. Wishes: `μακάρι`, `να` + subjunctive, `ελπίδα`, `θέλω να`, `περιμένω να` -> `Μακάρι να περάσεις καλά.`, `Θέλω να μου πεις την αλήθεια.`
  6. Making up: `συμφιλιώνομαι`, `δικαιολογία`, `φταίω`, `ξεπερνάω`, `αντέχω`, `υποφέρω`, `εκνευρίζομαι`, `παραπονιέμαι`, `ηρεμώ`, `δάκρυ`, `φιλί` -> `Δεν φταις εσύ, με συγχωρείς;`
- **Introduces:** χαίρομαι, στεναχωριέμαι, θυμώνω, αγχώνομαι, ανησυχώ, ντρέπομαι, ζηλεύω, μισώ, συμφιλιώνομαι, εμπιστεύομαι, αισθάνομαι, ηρεμώ, εκνευρίζομαι, παραπονιέμαι, φταίω, ξεπερνάω, υποφέρω, αντέχω, απογοητευμένος, θυμωμένος, αγχωμένος, ανήσυχος, περήφανος, ερωτευμένος, δυστυχισμένος, ήρεμος, ειλικρινής, μοναξιά, άγχος, θυμός, αγάπη, ζήλια, ντροπή, έρωτας, φιλία, σχέση, εμπιστοσύνη, ειλικρίνεια, συναίσθημα, διάθεση, δάκρυ, φιλί, δικαιολογία, μακάρι, ελπίδα, σεβασμός

### Module 27: Βιβλία και ταινίες (`el-b1-vivlia-tainies`)

- **Requires:** `el-b1-synaisthimata`
- **Can-do:** Describe and recommend books, films and series.
- **Grammar:** relative pronouns `που`, `ο οποίος/η οποία/το οποίο`, `όποιος`, `οτιδήποτε`, `αυτός που`, `αυτό που`.
- **Lessons:**
  1. Genres: `μυθιστόρημα`, `ποίημα`, `διήγημα`, `κωμωδία`, `δράμα`, `θρίλερ`, `περιπέτεια`, `σειρά` -> `Διαβάζω ένα μυθιστόρημα που μου αρέσει.`
  2. People: `συγγραφέας`, `σκηνοθέτης`, `ηθοποιός`, `ήρωας`, `χαρακτήρας`, `θεατής`, `αναγνώστης`, `ρόλος` -> `Ο ηθοποιός που παίζει τον ήρωα είναι διάσημος.`
  3. Parts: `υπόθεση`, `σκηνή`, `σελίδα`, `κεφάλαιο`, `τίτλος`, `ανάγνωση`, `υπότιτλος`, `περιοδικό`, `έργο` -> `Το κεφάλαιο για το οποίο μιλάς είναι το πρώτο.`
  4. Opinions: `συναρπαστικός`, `συγκινητικός`, `αστείος`, `τρομακτικός`, `πρωτότυπος`, `πετυχημένος`, `φανταστικός`, `ρομαντικός` -> `Η ταινία ήταν τόσο συγκινητική που έκλαψα.`
  5. Recommending: `συστήνω`, `περιγράφω`, `αφηγούμαι`, `παρακολουθώ`, `κριτική`, `βραβείο`, `κοινό`, `παράσταση` -> `Σου συστήνω τη σειρά που βλέπω.`
  6. Whoever: `όποιος`, `οποίος`, `οτιδήποτε`, `γνωστός`, `διάσημος`, `αληθινός` -> `Όποιος τη δει θα την αγαπήσει.`
- **Introduces:** οποίος, όποιος, οτιδήποτε, σειρά, σκηνοθέτης, ηθοποιός, συγγραφέας, ήρωας, υπόθεση, ρόλος, κωμωδία, δράμα, θρίλερ, περιπέτεια, μυθιστόρημα, ποίημα, διήγημα, κριτική, βραβείο, χαρακτήρας, σκηνή, υπότιτλος, κοινό, παράσταση, έργο, σελίδα, κεφάλαιο, τίτλος, περιοδικό, ανάγνωση, θεατής, αναγνώστης, συστήνω, περιγράφω, αφηγούμαι, παρακολουθώ, συγκινώ, συγκινητικός, αστείος, τρομακτικός, συναρπαστικός, πρωτότυπος, πετυχημένος, γνωστός, διάσημος, αληθινός, φανταστικός, ρομαντικός

### Module 28: Το περιβάλλον (`el-b1-perivallon`)

- **Requires:** `el-b1-vivlia-tainies`
- **Can-do:** Talk about recycling, rules and the environment.
- **Grammar:** impersonal and passive (`λέγεται ότι`, `απαγορεύεται`, `ανακυκλώνεται`, `πετιέται`), passive aorist (`ανακυκλώθηκε`), agent with `από`, `πρέπει να` + passive.
- **Lessons:**
  1. Recycling: `ανακύκλωση`, `ανακυκλώνω`, `κάδος`, `πλαστικό`, `αλουμίνιο`, `μπαταρία` -> `Το γυαλί ανακυκλώνεται.`
  2. Pollution: `ρύπανση`, `μόλυνση`, `μολύνω`, `τοξικός`, `πετρέλαιο`, `βενζίνη`, `καύσιμο`, `εκπομπή` -> `Η θάλασσα μολύνεται από τα σκουπίδια.`
  3. Energy: `ενέργεια`, `ηλιακός`, `ανανεώσιμος`, `ηλεκτρικός`, `κατανάλωση`, `καταναλώνω`, `εξοικονομώ`, `σπαταλάω` -> `Πρέπει να εξοικονομούμε ενέργεια.`
  4. Climate: `κλίμα`, `αλλαγή`, `υπερθέρμανση`, `πλανήτης`, `γη`, `πυρκαγιά`, `πλημμύρα`, `ξηρασία` -> `Οι πυρκαγιές προκαλούνται από τη ζέστη.`
  5. Rules: `κανόνας`, `νόμος`, `πρόστιμο`, `υποχρεωτικός`, `δημόσιος`, `συγκοινωνία`, `ποδηλατόδρομος`, `πεζόδρομος` -> `Η ανακύκλωση είναι υποχρεωτική.`
  6. Nature and future: `φύση`, `δάσος`, `ποτάμι`, `λίμνη`, `προστασία`, `προστατεύω`, `μειώνω`, `αυξάνω`, `περιορίζω`, `λύση`, `συμβάλλω`, `γενιά`, `βιώσιμος`, `οικολογικός`, `βιολογικός` -> `Όλοι πρέπει να συμβάλουμε.`
- **Introduces:** περιβάλλον, ανακύκλωση, ανακυκλώνω, κάδος, πλαστικό, αλουμίνιο, μπαταρία, ρύπανση, μόλυνση, μολύνω, ενέργεια, ηλιακός, ανανεώσιμος, καύσιμο, βενζίνη, πετρέλαιο, εκπομπή, κλίμα, αλλαγή, υπερθέρμανση, πλανήτης, γη, φύση, δάσος, πυρκαγιά, πλημμύρα, ξηρασία, ποτάμι, λίμνη, προστασία, προστατεύω, κανόνας, νόμος, πρόστιμο, υποχρεωτικός, καταναλώνω, κατανάλωση, εξοικονομώ, σπαταλάω, μειώνω, αυξάνω, περιορίζω, δημόσιος, συγκοινωνία, ποδηλατόδρομος, πεζόδρομος, ηλεκτρικός, λύση, συμβάλλω, γενιά, βιώσιμος, οικολογικός, βιολογικός, τοξικός, προκαλώ

### Module 29: Αν μπορούσα... (`el-b1-an-mporousa`)

- **Requires:** `el-b1-perivallon`
- **Can-do:** Imagine, dream and express regrets.
- **Grammar:** `αν` + imperfect with `θα` + imperfect (`Αν είχα χρόνο, θα ταξίδευα`), `αν` + pluperfect with `θα είχα` + participle (`Αν είχα ξυπνήσει νωρίς, θα είχα προλάβει`), `σαν να`, `μακάρι να` + past.
- **Lessons:**
  1. Dreams: `ονειρεύομαι`, `τύχη`, `λαχείο`, `εκατομμύριο`, `πολυτέλεια`, `πολυτελής`, `άνετος` -> `Αν κέρδιζα το λαχείο, θα ταξίδευα.`
  2. Wishes: `μακάρι`, `ηρεμία`, `ανεξαρτησία`, `ελευθερία`, `δύναμη`, `φήμη` -> `Μακάρι να είχα περισσότερο χρόνο.`
  3. Regret: `μετανιώνω`, `κρίμα`, `ευκαιρία`, `λάθος`, `αποφεύγω`, `συνέπεια`, `αποτέλεσμα` -> `Μετανιώνω που δεν σπούδασα.`
  4. Advice from your place: `θέση`, `περίπτωση`, `προϋπόθεση`, `εφόσον`, `επιλογή`, `πειράζω`, `χαλάω` -> `Στη θέση σου δεν θα το έκανα.`
  5. Courage: `ρίσκο`, `ρισκάρω`, `τολμάω`, `προσπάθεια`, `γενναίος`, `δειλός`, `σκληρός`, `αδιάφορος` -> `Αν ρίσκαρα περισσότερο, θα είχα κερδίσει.`
  6. As if: `σαν`, `σαν να`, `αξία`, `νόημα`, `σκοπός`, `ψυχή`, `μυαλό` -> `Μιλάει σαν να ήξερε τα πάντα.`
- **Introduces:** μετανιώνω, ονειρεύομαι, τύχη, λαχείο, εκατομμύριο, σαν, περίπτωση, εφόσον, προϋπόθεση, ηρεμία, πολυτέλεια, πολυτελής, ανεξαρτησία, ελευθερία, δύναμη, φήμη, ρίσκο, ρισκάρω, τολμάω, προσπάθεια, αποτέλεσμα, συνέπεια, αποφεύγω, πειράζω, κρίμα, χαλάω, άνετος, αδιάφορος, σκληρός, γενναίος, δειλός, αξία, νόημα, σκοπός, ψυχή, μυαλό, επιλογή

### Module 30: Οι ειδήσεις (`el-b1-eidiseis`)

- **Requires:** `el-b1-an-mporousa`
- **Can-do:** Report what others said and asked, follow the news.
- **Grammar:** reported speech (`Είπε ότι θα έρθει`, `Ρώτησε αν ήμουν εκεί`, `Ρώτησε τι ώρα φεύγει`), backshift of tense and person, `σύμφωνα με`.
- **Lessons:**
  1. News: `είδηση`, `δελτίο`, `ενημέρωση`, `δημοσιογράφος`, `ρεπορτάζ`, `ανακοίνωση`, `ανακοινώνω` -> `Το δελτίο είπε ότι θα βρέξει.`
  2. Politics: `κυβέρνηση`, `πρόεδρος`, `υπουργός`, `εκλογές`, `ψηφίζω`, `κόμμα`, `πολιτική`, `πολίτης`, `διαδήλωση` -> `Ο υπουργός δήλωσε ότι δεν θα παραιτηθεί.`
  3. Saying: `ισχυρίζομαι`, `πληροφορώ`, `σύμφωνα`, `προειδοποιώ`, `διαψεύδω`, `παραδέχομαι`, `αρνούμαι`, `μεταδίδω` -> `Σύμφωνα με την αστυνομία, δεν υπήρχαν θύματα.`
  4. Asking: `αναρωτιέμαι`, `ρωτάω αν`, `ρωτάω τι`, `μεταξύ`, `ειδικός`, `έρευνα` -> `Ο δημοσιογράφος ρώτησε αν θα υπάρξουν εκλογές.`
  5. Economy and events: `οικονομία`, `κρίση`, `πληθωρισμός`, `σεισμός`, `θύμα`, `τραυματίας`, `κάτοικος` -> `Ο σεισμός έγινε χθες το βράδυ.`
  6. World: `επιστήμη`, `επιστήμονας`, `ανακάλυψη`, `τεχνολογία`, `διεθνής`, `τοπικός`, `εθνικός` -> `Οι επιστήμονες ανακοίνωσαν ότι βρήκαν νέο φάρμακο.`
- **Introduces:** είδηση, δελτίο, ενημέρωση, δημοσιογράφος, ρεπορτάζ, κυβέρνηση, πρόεδρος, υπουργός, εκλογές, ψηφίζω, κόμμα, πολιτική, πολίτης, διαδήλωση, ανακοινώνω, ισχυρίζομαι, πληροφορώ, σύμφωνα, αναρωτιέμαι, προειδοποιώ, διαψεύδω, ανακοίνωση, οικονομία, κρίση, πληθωρισμός, σεισμός, θύμα, τραυματίας, έρευνα, επιστήμη, επιστήμονας, ανακάλυψη, τεχνολογία, διεθνής, τοπικός, εθνικός, κάτοικος, μεταξύ, ειδικός, παραδέχομαι, αρνούμαι, μεταδίδω

### Module 31: Ζωή στην Ελλάδα (`el-b1-zoi-stin-ellada`)

- **Requires:** `el-b1-eidiseis`
- **Can-do:** Weigh the pros and cons of life abroad and argue a point.
- **Grammar:** conjunctions with the subjunctive versus the indicative: `για να`, `χωρίς να`, `πριν να`, `μέχρι να` + subjunctive; `παρόλο που`, `ενώ`, `επειδή`, `αφού`, `ώστε`, `ώσπου`, `έστω`, `αν και` + indicative; `ωστόσο`, `αντίθετα`.
- **Lessons:**
  1. Culture: `κοινωνία`, `κουλτούρα`, `πολιτισμός`, `παράδοση`, `ντόπιος`, `φιλόξενος`, `φιλοξενία`, `νοσταλγία` -> `Οι ντόπιοι είναι πολύ φιλόξενοι.`
  2. Moving: `μετανάστης`, `μετανάστευση`, `μεταναστεύω`, `ξενιτιά`, `ενσωμάτωση`, `προσαρμόζομαι`, `παραμονή`, `υπηκοότητα`, `δικαίωμα` -> `Προσαρμόστηκα γρήγορα χωρίς να μιλάω καλά ελληνικά.`
  3. Costs: `κόστος`, `φόρος`, `ασφάλιση`, `ανταγωνισμός`, `γραφειοκρατία`, `επίσημος`, `προσωρινός`, `μόνιμος` -> `Η γραφειοκρατία είναι δύσκολη, ωστόσο αξίζει.`
  4. Weighing: `ζυγίζω`, `εξαρτώμαι`, `ανάλογα`, `ισορροπία`, `δυσκολία`, `αντιμετωπίζω` -> `Εξαρτάται από το πού μένεις.`
  5. Connecting: `παρόλο`, `ώστε`, `ώσπου`, `έστω`, `αντίθετος`, `ωστόσο`, `γενικός`, `συνολικός` -> `Παρόλο που ζω εδώ δέκα χρόνια, μου λείπει η πατρίδα μου.`
  6. Conclusion: `συμπέρασμα`, `για να`, `χωρίς να`, `μέχρι να` -> `Για να αποφασίσεις, πρέπει να ζυγίσεις τα πλεονεκτήματα και τα μειονεκτήματα.`
- **Introduces:** κοινωνία, κουλτούρα, πολιτισμός, παράδοση, ενσωμάτωση, προσαρμόζομαι, μετανάστης, μετανάστευση, μεταναστεύω, ξενιτιά, ντόπιος, φιλόξενος, φιλοξενία, γραφειοκρατία, κόστος, φόρος, ασφάλιση, ανταγωνισμός, νοσταλγία, προσωρινός, μόνιμος, εξαρτώμαι, ανάλογα, ζυγίζω, επίσημος, παραμονή, υπηκοότητα, δικαίωμα, παρόλο, ώστε, ώσπου, έστω, ωστόσο, αντίθετος, γενικός, συνολικός, συμπέρασμα, ισορροπία, αντιμετωπίζω, δυσκολία

## Optional modules

Not planned yet. Only the 31 main modules are specified here; optional side modules (as in `curriculum.md`) will be added once the main chain is authored.

## Self-checks

- **No lemma repeats across modules.** A script split every `Introduces` line, NFC-normalised the lemmas and looked for duplicates across all 31 modules: none found. Total 1456 lemmas (about 37-64 per module; the lower counts are in the A2 and B1 modules).
- **Spot-checks (modules 1, 2, 4, 12, 25).** Read against each module's grammar line and the lemmas available at that point: M1 uses only fixed requests with the café nouns and `θέλω/μπορώ/έχω/πληρώνω/κάνω`; M2 uses `είμαι` forms, `σε` contractions and PROPN names with no genitive; M4 uses possessive clitics only as chunks; M12 and M25 lean on the present-tense verbs and `να` taught from M1. These are read-throughs, not a mechanical surface-form check.
- **Tonos and spelling.** Lemmas follow the lexicon convention: monotonic, final `ς` written, lowercase, NFC, enclitic accent shift only in surface forms, never in lemmas. I have not machine-verified spelling against a Greek dictionary; a human or lexicon pass is still needed.
- **Not verified:** that every word used in a lesson's example sentence is a lemma from that module or an ancestor (checked by hand for the spot-check modules only). The loader will report violations when the course JSON is built.

## Implementation notes

- `;` as question mark: `server/content.ts` accepts it in `endMarks` for `el`, and `shared/grader.ts` treats it as the end mark (a Latin `?` is accepted too), never as a comma.
- Final sigma: the grader compares `ς` and `σ` as equal, so a typed `σ` passes as an accent slip; the course text always writes final `ς`.
- Tokenizer: Greek letters are `\p{L}`, so words tokenise correctly, but `ό,τι` splits at the comma and is not used; `τι` plus a clause is used instead. Apostrophes join tokens, so elided forms (`θα 'ρθω`) are avoided.
- Lemma mapping: `στο/στη/στην/στον/στα/στις/στους` map to `σε`; weak pronouns `τον/την/το/τα/του/της/τους` clash with article readings and use `#pron` sense keys, as do `με` and `σε`.
- Accent slips: a missing or wrong tonos passes as orange. Monosyllables with a distinguishing accent (`πού/που`, `πώς/πως`, `ή/η`) make the accent the only difference; this is acceptable only because context fixes each.
- Homophones: the TTS cannot distinguish `ι/η/υ/ει/οι`, so dictation of ambiguous words relies on context; see the Homophones section.
- Voices: `VOICES.el` (marin, cedar) is in `server/content.ts`. Audio quality for Greek has not been listened to.
