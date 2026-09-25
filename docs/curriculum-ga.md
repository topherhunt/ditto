# Irish curriculum plan

The Irish instance of [curriculum.md](curriculum.md): the 11 A1 main modules, about 1,030 units, for English speakers. There are no A2 or optional modules yet. Each module's `introduces` list in its JSON is the lemma plan.

The content was written by a non-native author and checked with the Gramadóir grammar checker (see Checking below). It has not had a native speaker's review; that is the most valuable next step.

## Register and voices

- Standard Irish (An Caighdeán Oifigiúil) spelling and grammar, with analytic verb forms (`tá mé`, `níl mé`, not `táim`, `nílim`).
- Audio: ABAIR's Munster voices Neasa and Colm. Keep vocabulary neutral across dialects where a choice exists.
- Times and phrases whose spoken form a digit would lose (`a haon déag`, `ar a seacht a chlog`) get no digit variant. Other numbers follow the usual rule (`deich n-euro` -> `10 euro`).

## Lemma conventions

- **Mutated forms** (lenited, eclipsed, `t-`, `h-`, `n-` prefixed) take the lemma of the base word (`mháthair`, `bhfoireann`, `t-iasc`, `hiníon` -> `máthair`, `foireann`, `iasc`, `iníon`). Each surface form has its own lexicon entry and gloss that names the mutation and its trigger.
- **Hyphenated and elided tokens** are one token: `an-bhlasta`, `t-uisce`, `m'athair`, `d'aois`, `b'fhéidir`. `an-` and `ró-` compounds take the adjective's lemma (`rómhilis` -> `milis`).
- **Verbs:** the imperative singular (`téigh`, `déan`, `imir`). Every tense, person and verbal noun shares it (`chuaigh`, `téim`, `dul` -> `téigh`). `tá`, `bhí`, `bím`, `raibh` and `beidh` are `bí`. The copula is `is`.
- **Prepositional pronouns** take the preposition (`agam`, `agaibh` -> `ag`; `liom`, `libh` -> `le`; `uaim` -> `ó`). Compound prepositions with the article (`sa`, `san`, `sna` -> `i`; `don` -> `do`) do too.
- **Plurals** take the singular (`bróga` -> `bróg`, `cairde` -> `cara`, `sléibhte` -> `sliabh`).
- **Proper nouns** (`PROPN`: people, places) are never introduced. Key `mbaile` is taken by `Baile Átha Cliath`, so "town" after `ó` needs another phrasing.
- **Senses** separate the particle `a`: `a#voc` (vocative), `a#to` (before a verbal noun), `a#num` (before a number), `a#oc` (`a chlog`), `a#his`, `a#her`, `a#their`, `a#rel` (relative). Others: `an#q` (question particle; bare `an` is the article), `ar#cop` (`ar mhaith leat`; bare `ar` is the preposition), `do#to` (preposition; bare `do` is "your"), `is#and` (bare `is` is the copula), `dó#two`, `sé#six`.

## Grammar decisions

These are points where Gramadóir or usage is contested, and the course picks the uncontroversial form:

- A predicative adjective is never lenited (`tá an fheoil te`, `tá mo dheirfiúr beag`). Gramadóir flags these, which is a false positive.
- A feminine noun lenites an indefinite genitive after it (`gloine bhainne`, `foireann pheile`). This is correct but unexpected for learners, so the course avoids the construction.
- People are counted with the personal numbers on their own (`Beirt.`, `Tá ceathrar againn sa chlann`), plus `beirt mhac`, rather than personal number + noun.
- After a preposition + `an`: masculine nouns in `s` take no `t-` (`sa siopa`, `ag an séipéal`). Feminine ones do (`ar an tsráid`, `sa tseachtain`). Other consonants are eclipsed (`ar an mbus`, `ag an mbanc`), except `d` and `t` (`ag an deireadh seachtaine`).
- The past (`bhí`, `chuaigh`) and the future (`beidh`, `tógfaidh mé é`) appear only as chunks in the last module. Their systems are A2.

## Modules

Each main module requires the one before it.

| # | Course id | Title | Can-do | Grammar |
|---|---|---|---|---|
| 1 | `ga-a1-failte` | Fáilte | Greet, give your name and where you're from, say how much Irish you have | `tá`/`níl`, `is mise`, `is as ... mé`, `i` eclipses places, `tá Gaeilge agam`, the vocative, `mo`/`do` lenite |
| 2 | `ga-a1-caife` | Sa Chaife | Order food and drink, say you're hungry or thirsty, what you like | `ba mhaith liom`, `tá ocras orm` and `ar` + pronoun, `an` lenites feminine nouns and gives `t-`, `is maith liom`, `sa` lenites |
| 3 | `ga-a1-uimhreacha` | Uimhreacha agus Am | Count, prices, age, the time, days of the week | numbers with `a`, lenition and eclipsis after 1 to 10, `ar an` eclipses, `bliain`, `a chlog`, `Dé Luain` |
| 4 | `ga-a1-clann` | An Chlann | Describe your family and what people look like | `mo` becomes `m'`, `a` his/her/their, `ár`/`bhur` eclipse, personal numbers, adjectives after feminine nouns |
| 5 | `ga-a1-obair` | Obair agus Staidéar | Say what you do, where you work and what you study | `is` vs `tá`, `ag` + verbal noun, `i` eclipses, the present tense |
| 6 | `ga-a1-gnathla` | Gnáthlá | Describe your daily routine | present tense (`-im`, `-ann`), habitual `bím`, `ar an` eclipses, verbs with prepositions |
| 7 | `ga-a1-cathair` | Sa Chathair | Ask the way, follow directions, ask for help | imperatives, `cá bhfuil`, `tá ... ann`, `in aice le`, `an féidir leat` |
| 8 | `ga-a1-bia` | Bia agus Bialann | Name food, order a meal, say what you eat and don't | `ní` + verb, `ná` after a negative, `ró-` and `an-`, `don`, commands |
| 9 | `ga-a1-saoram` | Saor-am | Talk about hobbies, sport and music, invite someone | verbal nouns as nouns, `imrím` vs `seinnim`, `ar mhaith leat`, `ba bhreá liom` |
| 10 | `ga-a1-siopadoireacht` | Siopadóireacht | Buy clothes and food, colours, sizes, pay | `tá ... uaim`, `tá ... orm` (wearing), colour lenition, plural adjectives, `níos` + comparative |
| 11 | `ga-a1-taisteal` | Taisteal agus Aimsir | Weather, seasons, a train ticket, a holiday | weather with `tá sé`, `sa`/`san` + season, `cathain a`, the past and future as chunks |

## Checking

Every sentence goes through [Gramadóir](https://cadhan.com/gramadoir/) (Kevin Scannell's Irish grammar checker, GPL) before it ships. Gramadóir catches wrong or missing mutations reliably, but it misses word choice, idiom and naturalness. Its false positives are reviewed by hand, and the predicative-adjective flags above are the most common.
