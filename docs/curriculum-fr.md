# French curriculum plan

The French instance of [curriculum.md](curriculum.md), A1, A2 and B1 main modules (31 in all): standard metropolitan French (`tu`, `vous` and everyday `on`; settings in France and the wider Francophone world, prices in euros) for learners whose support language is English (`en`), Latin American Spanish (`es-419`), Italian (`it`) or Dutch (`nl`). Optional modules are not planned yet. Each module lists its course id, its requirements, its grammar focus, its six lessons, and the lemmas it `introduces`. A module may use its own lemmas plus every lemma introduced by the modules it requires, transitively. For main modules, that means every earlier main module. Units per lesson, unit stages, distractor shape and the other language-neutral rules live in [curriculum.md](curriculum.md) and are not repeated here; [curriculum-es.md](curriculum-es.md) is the closest sibling and this plan mirrors its module themes and order.

The lemma lists are the core-vocabulary plan and decide ordering. A module author may add up to about 10 extra lemmas when natural sentences need them, but only lemmas that no module in this plan lists. Every lemma a module lists must be used in at least one of its units (the loader rejects an unused one). The loader checks only lemmas: the plan-level rules below about elided words, hyphenated numerals and enclitic pronouns are the author's job.

## Variety and vocabulary

- **Pronouns of address:** `tu` for one person you know well, a child or a peer; `vous` for one person you don't know or must be polite to (shop, restaurant, work, strangers) and for every plural "you". Both are taught from the start (`vous` in module 1, `tu` in module 2) and the lessons keep the choice visible by scene. Never contrast them in a distractor.
- **`on`:** in everyday French `on` is "we" (`On va au cinéma?`) with a third-person singular verb. It is introduced in module 4 together with `nous`, `ils` and `elles`, and until module 4 no unit uses `on` (classroom chunks before that use `ça`: `Comment ça se dit?`). `on` means "we" only in A1, apart from `On y va`; the generic "people" reading (`En France, on mange tard`) is A2. `nous` is the formal/written "we" and appears less often than `on`.
- **Register:** standard, neutral, current spoken French. No slang, `argot`, `verlan` or texting register (`truc`, `bouquin`, `boulot`, `fringues`, `bagnole`, `mec`, `nana`, `ouais`, `t'as`, `j'sais pas`, `chais pas`, `y a`, `kiffer`, `bosser`, `sympa` shortened to `sympa`, `resto`, `prof`, `ordi`, `télé`, `appart` are all out). Write the full word: `professeur`, `restaurant`, `télévision`, `ordinateur`. `copain/copine` are out too; use `ami` and `petit ami/petite amie` or `compagnon/compagne`. `Tu fais quoi?` and other `quoi` at the end of a question are out; `quoi` is not an A1 lemma.
- **Negation:** always written in full, `ne ... pas` (`Je ne comprends pas`, `Il n'est pas là`). Never the dropped-`ne` spoken form (`Je comprends pas`). `ne` and `pas` come together in module 2; `jamais` in module 6 (`Je ne mange jamais de viande`); `ne ... plus`, `ne ... rien` and `ne ... personne` are A2 (`de rien` in module 1 is a fixed chunk, and `non plus` in module 9).
- **Questions:** three forms, in this order of preference. (1) Rising intonation with `?`: `Tu parles français?`, `Vous avez un frère?`. (2) `est-ce que`: `Est-ce que tu habites à Lyon?`, `Où est-ce que tu travailles?`, `Qu'est-ce que vous faites dans la vie?`. (3) Inversion, only in the fixed chunks listed in a module's Grammar line, always with `vous` or a fixed subject and never with a noun subject: `Comment allez-vous?`, `Comment vous appelez-vous?`, `Quelle heure est-il?`, `Quel âge avez-vous?`, `Avez-vous...?`, `Voulez-vous...?`, `Parlez-vous...?`, `Quel temps fait-il?`, `Comment est-elle?`, `D'où venez-vous?`, `Que voulez-vous?`, `Comment vas-tu?`. Stylistic inversion with a noun (`Où travaille votre père?`) and `-t-il` with a noun are A2 or later. `Où est la gare?` and `Comment ça va?` need no inversion and are fine everywhere.
- **Elision and liaison in spelling:** elision is always written (`j'ai`, `l'eau`, `d'accord`, `qu'est-ce`, `n'est`, `s'il vous plaît`, `c'est`, `m'appelle`, `t'appelles`, `s'appelle`, `jusqu'à`); never a form without the apostrophe. `s'il vous plaît` always with its circumflex (`plaît`). `si` before `il` is `s'il` and before `elle` stays `si elle`. Liaison is not written but affects the audio and the homophone rules below. `h` aspiré words (`le héros`, `les haricots`, `le huit`) do not elide: `le haricot`, `les haricots` (no liaison), `le huit`, `en huit`.
- **Apostrophes:** write a straight `'`; the app normalizes the typographic forms to it (`shared/tokenize.ts`). Quotation marks (`«»`) and dialogue dashes are not used.
- **Hyphens:** kept where French spelling has them: `peut-être`, `est-ce`, `qu'est-ce`, `c'est-à-dire` (not used), `là-bas`, `rendez-vous`, `week-end`, `petit-déjeuner`, `après-midi`, `grand-père`, `grand-mère`, `aller-retour`, `t-shirt`, enclitic pronouns after imperatives and in inversion (`donnez-moi`, `excusez-moi`, `asseyez-vous`, `allez-vous`, `a-t-il`), and numerals from 17 to 99 (`dix-sept`, `vingt-deux`, `quatre-vingt-dix-sept`). Traditional spelling is the main text; the 1990 reform spellings (`weekend`, `vingt-et-un`, `deux-cents`) may be given as `variants`.
- **Ligatures and accents:** `œ` is written as one letter (`sœur`, `œil`, `œuf`, `cœur`); a learner typing `oe` is not accepted by the grader today (see Open code questions), so a unit with `œ` lists the `oe` spelling in `variants` until that is fixed. Accents are `é è ê ë à â ç î ï ô ù û ü ÿ`; content always uses them, including on capitals (`À la gare`, `École`, `État`). The grader strips diacritics for comparison, so a missing accent (`ca va` for `ça va`, `cafe` for `café`, `a` for `à`) is an accent slip, shown in orange, not an error. The lexicon still keeps accent pairs apart.
- **Punctuation:** no space before `?`, `!`, `:` or `;` in `text`, titles or glosses: `Ça va?`, `Bonjour!`, not `Ça va ?` (French typography wants a space, but the app is simpler and audio and grading do not depend on it: `shared/grader.ts` compares marks with all whitespace removed, so `Ça va ?` and `Ça va?` both pass). Sentences end in `.`, `!` or `?`; the grader treats `.` and `!` as interchangeable, and only a wrong end mark (`.` on a question, `?` on a statement) counts as an error. Commas: `commas` lists extra gaps and should be liberal (after a vocative or interjection, before `mais`, after an introductory phrase). Colons and semicolons are avoided in `text`.
- **Settings:** France and the Francophone world. Real cities are proper nouns (Paris, Lyon, Marseille, Toulouse, Bordeaux, Lille, Nantes, Strasbourg, Montréal, Québec, Bruxelles, Genève, Dakar, Abidjan); countries and regions are proper nouns too (la France, la Belgique, la Suisse, le Canada, le Sénégal). Money is euros: `deux euros cinquante` in `text`, never a `€` sign, and no `centime` (an A2 word); prices in module 1 are whole euros or `euros` + a number of cents said in full (`trois euros cinquante`). No real business names, no real brands.
- **Where French varies,** content uses the standard forms every French speaker understands. Numbers are `soixante-dix`, `quatre-vingts`, `quatre-vingt-dix`; never Belgian/Swiss `septante`, `octante`/`huitante`, `nonante`. Meals are `petit-déjeuner`, `déjeuner` (lunch), `dîner` (dinner); never the Belgian/Swiss/Quebec `déjeuner` = breakfast, `dîner` = lunch, `souper` = dinner. Everyday words follow metropolitan usage: `portable` (mobile), `voiture`, `week-end`, `magasin`, `courses`, `ordinateur`, `chaussures`, `pull`, `veste`, `jean`, `bus`, `métro`, `gare`, `billet`, `valise`, `chambre`, `douche`. Never the Quebec `char`, `magasiner`, `fin de semaine`, `cellulaire`, `chandail`, `souper`, `bienvenue` as "you're welcome" (`de rien`/`je vous en prie` is used instead), and no Belgian `septante`, `GSM`, `nonante`, `une fois` as "please". `Bienvenue` is only "welcome".
- **Past tenses:** none in A1. The passé composé (`j'ai mangé`, `je suis allé`) starts in module 12 together with `il y a` for "ago", the imparfait in module 14, the futur simple in 19, the conditional beyond `je voudrais` in 21, the plus-que-parfait in 22, the subjunctive in 25, the passive in 28, unreal `si` in 29 and backshifted reported speech in 30. In A1, participles appear only as adjectives that the plan lists (`ouvert`, `fermé`, `marié`, `divorcé`, `occupé`, `fatigué`, `perdu`, `séparé`, `préféré`, `épicé`, `désolé`, `enchanté`, `retraité`, `aîné`) and in the fixed chunk `service compris`. There is no `venir de` (recent past) either. Reasons: French has two auxiliaries with agreement and a large irregular participle list, the A1 modules already carry the present of the core verbs, and the sibling plans (Spanish, Italian) also start the past in A2. The future is the near future with `aller` + infinitive (module 11, with `Je vais prendre...` as an ordering chunk in module 8); the conditional appears only as `je voudrais` (module 1) and `je vais prendre`. No subjunctive (it starts in module 25); imperatives are `vous` chunks (`Continuez`, `Tournez`, `Excusez-moi`, `Asseyez-vous`, `Donnez-moi`, `Parlez lentement`) and, from module 9, a few `tu` ones (`Viens!`, `Regarde`).
- **Numbers:** written as words in `text`, with digit variants (`vingt euros` -> `20 euros`, `à trois heures` -> `à 3 heures`, `vingt-deux` -> `22`). Decimals use a comma (`2,50`); the tokenizer reads `2,50` as two words, so give such amounts only as variants.

## Support languages

Every localized field carries exactly `en`, `es-419`, `it` and `nl`, in that order (`SUPPORT_LOCALES.fr`). A learner whose UI is another language falls back to `en`.

- **Translations** are natural English (American), Latin American Spanish, Italian and Dutch, not word-for-word: `Je voudrais un café, s'il vous plaît.` -> `I'd like a coffee, please.` / `Quisiera un café, por favor.` / `Vorrei un caffè, per favore.` / `Ik wil graag een koffie.`. Translations never carry a space before `?`/`!` and Spanish translations always carry `¿` and `¡` correctly. Translate `tu` as `you` / `tú` / `tu` / `jij` (`je`), and `vous` as `you` / `usted` (singular formal) or `ustedes` (plural; never `vosotros`) / `Lei` (singular formal) or `voi` (plural) / `u` (singular formal) or `jullie` (plural); for the waiter or shop assistant addressing one customer use `usted`, `Lei`, `u`. `on` = `we` / `nosotros` / `noi` / `we`. A dropped or ambiguous subject does not occur in French, but `il`/`elle` must match the scene.
- **Distractors** follow [curriculum.md](curriculum.md) in each language separately. No distractor may differ from the answer only in a distinction French doesn't make audibly or a support language collapses: never contrast `tu`/`vous` (English `you` covers both, and Italian `Lei` is also "she"); never contrast singular and plural where French has the same sound (`il parle`/`ils parlent`, `elle mange`/`elles mangent`, `un ami`/`une amie`, `joli`/`jolie`, `marié`/`mariée`, `un enfant`/`des enfants` with a silent `s` only); never contrast masculine and feminine agreement that is silent (`Il est fatigué`/`Elle est fatiguée` is audible only through `il`/`elle`, so the contrast lives in the pronoun and not in the adjective); never contrast homophone words (`ces`/`ses`, `ce`/`se`, `sans`/`cent`, `a`/`à`, `ou`/`où`, `son`/`sont`, `mais`/`mes`, `vers`/`vert`, `mer`/`mère`). A sentence's options all end in `.`, `!` or `?`, and a word's, phrase's or chunk's never do.
- **Glosses** are short: the meaning, then the gender for nouns (`café (m)`, `eau (f)`, `enfant (m or f)`, `sœur (f)`), then irregularities (`aller: vais, vas, va, allons, allez, vont`; `j'ai = je + ai: I have`), then what trips up a speaker of that support language, flagged `watch out:` (en), `ojo:` (es-419), `attenzione:` (it) or `let op:` (nl). Nouns carry the same `(m)`/`(f)` marker in all four glosses (Dutch too, although it has common gender); adjectives are not gender-marked in any gloss. Give the watch-out only in the support language it concerns (Dutch false friends go in the `nl` gloss). Elided and hyphenated tokens gloss their parts (`qu'est-ce = que + est-ce: what`, `excusez-moi = excusez + moi: excuse me`).
- **grammarFocus** labels are in each support language and may quote French (`être vs. avoir: Je suis fatigué / J'ai faim` / `être o avere: Je suis fatigué / J'ai faim` / `ser o tener: ...` / `zijn of hebben: ...`).
- **`speaker`:** when a French form gives the speaker's gender away (`Je suis fatiguée`, `Je suis française`, `Je suis infirmière`, `Enchantée`) the unit sets `speaker` to `F` or `M`, exactly as Italian does for `sono stanca`. It is also the way to make silent agreement fair: `Je suis marié`/`mariée` are told apart by voice, not by ear alone.

**Watch-outs.** Flag these in the gloss or grammarFocus of the module that first uses them.

- **English false friends** (`watch out:`): `actuellement` = currently (actually = `en fait`); `librairie` = bookstore (library = `bibliothèque`); `sensible` = sensitive (sensible = `raisonnable`); `assister à` = attend (assist = `aider`); `ignorer` = not know, overlook; `demander` = ask (demand = `exiger`); `blesser` = hurt, injure (bless = `bénir`); `rester` = stay (rest = `se reposer`); `préservatif` = condom (preservative = `conservateur`); `coin` = corner (coin = `pièce`); `location` = rental (location = `endroit`, `lieu`); `journée` = the whole day, `jour` = day as a unit; `an` = year as a count, `année` = year as duration; `pain` = bread (pain = `douleur`, `mal`); `chair` = flesh; `crayon` = pencil (crayon = `pastel`); `entrée` = starter, first course (entrée = `plat principal`, `plat`); `déception` = disappointment; `éventuellement` = possibly; `chance` = luck; `car` = because, or a coach; `fabrique` = factory; `figure` = face; `lecture` = reading; `monnaie` = change; `pièce` = room, coin, piece; `raisin` = grape (raisin = `raisin sec`); `sale` = dirty; `four` = oven; `main` = hand; `bras` = arm; `place` = seat, square, place; `sympathique` = nice, likeable; `formidable` = great; `grand` = tall and big; `chips` = crisps; `large` = wide; `attendre` = wait (attend = `assister à`); `passer un examen` = take an exam (pass = `réussir`); `rentrer` = go home; `voyage` = trip; `dessert` = dessert, but `désert` = desert; `pull` = sweater, `chemise` = shirt, `veste` = jacket, `robe` = dress; `déjeuner` = lunch (breakfast = `petit-déjeuner`); `marron` = brown (chestnut); `cave` = cellar; `soldes` = sales; `actuel` = current; `important` = important.
- **Spanish false friends** (`ojo:`): `large` = ancho (largo = `long`); `long` = largo; `embrasser` = besar, dar un beso (abrazar = `serrer dans ses bras`, `faire un câlin`); `quitter` = dejar, irse de (quitar = `enlever`); `salle` = sala, salón grande (salón = `salon`, `séjour`); `sale` = sucio (sal = `sel`); `carte` = tarjeta, menú, mapa, carta; `journée` = el día entero; `rester` = quedarse (restar = `soustraire`); `demander` = pedir, preguntar; `tirer` = jalar, tirar y disparar; `pièce` = habitación, moneda, pieza; `coin` = rincón, esquina; `bureau` = oficina y escritorio; `cuisine` = cocina y comida; `histoire` = historia y cuento; `journal` = periódico (jornal = `salaire journalier`); `rue` = calle; `pain` = pan; `lit` = cama; `une fois` = una vez; `déjeuner` = almorzar (desayuno = `petit-déjeuner`); `dîner` = cenar; `cher` = caro y querido; `sympathique` = agradable, simpático (`sympa` is out of A1); `chaud` = caliente; `beaucoup` = mucho; `assez` = bastante; `très` = muy; `trop` = demasiado; `prêt` = listo (prestar = `prêter`); `chambre` = habitación, dormitorio; `plage` = playa; `magasin` = tienda; `mairie` = ayuntamiento; `étage` = piso; `quel` = qué, cuál; `fils` = hijo; `garçon` = chico, mesero. Also `ils` and `les` are not stressed like Spanish `ellos`/`los`.
- **Italian false friends** (`attenzione:`): `sale` = sporco (sale = `sel`); `brave` = bravo in the sense of gentile, coraggioso (bravo = `doué`, `fort en`); `magasin` = negozio (magazzino = `entrepôt`); `mais` = ma (mai = `jamais`), and `mai` (the month) = maggio; `car` = perché nello scritto, o pullman; `fin` = fine, or sottile; `tante` = zia (tante = `beaucoup de`); `pièce` = stanza, moneta, pezzo; `journée` = giornata intera; `déjeuner` = pranzo (colazione = `petit-déjeuner`); `dîner` = cenare; `goûter` = assaggiare, e la merenda; `chambre` = camera da letto; `salle` = sala; `rester` = restare, but the meaning is `stare`; `demander` = chiedere; `chance` = fortuna; `cher` = caro; `place` = posto, piazza; `coin` = angolo; `bureau` = ufficio, scrivania; `lit` = letto (`lis` is not a word); `fille` = figlia e ragazza; `garçon` = ragazzo, cameriere; `chaud` = caldo; `pêche` = pesca (frutto e attività); `rue` = strada; `lecture` = lettura; `librairie` = libreria; `sympathique` = simpatico; `fermé` = chiuso; `courses` = spesa, corse; `prendre` = prendere e mangiare/bere; `passer` = passare e trascorrere; `mettre` = mettere (not in A1); `beau` = bello; `long` = lungo; `large` = largo; `chose` = cosa; `chef` = capo e cuoco.
- **Dutch false friends** (`let op:`): `sale` = vuil (zaal = `salle`); `magasin` = winkel (magazijn = `entrepôt`); `location` = huur, verhuur (locatie = `endroit`, `lieu`); `sensible` = gevoelig; `actuellement` = op dit moment (actueel = `actuel`, `actuellement` is not `actueel`); `figure` = gezicht (figuur = `silhouette`); `veste` = jasje (vest = `gilet`, `cardigan`); `pull` = trui; `chemise` = overhemd; `robe` = jurk; `fort` = sterk; `gros` = dik; `car` = want, of touringcar; `en` = in, van het (NL `en` = `et`); `de` = van (NL `de` = `le`, `la`, `les`); `dans` = in (NL `dans` = `danse`); `pas` = niet (`ne ... pas`) of stap; `mal` = pijn, slecht (NL `mal` = `fou`); `an` = jaar; `an` and `en` sound the same in French; `avoir` = hebben (heb geen `avoir` = `zijn`); `salon` = woonkamer (salon = `salon de coiffure`); `bureau` = kantoor, bureau; `carte` = kaart, menu; `étage` = verdieping; `pièce` = kamer, munt, stuk; `fin` = einde, dun; `mois` = maand (NL `mois` does not exist; `mais` = `maïs`); `lecture` = lezing, lezen; `note` = cijfer, aantekening (noot = `noix`); `poser` = leggen, plaatsen; `pain` = brood (pijn = `mal`, `douleur`); `sac` = tas; `chef` = baas, chef; `blesser` = verwonden; `place` = plaats, plein, zitplaats; `voyage` = reis; `tante` = tante (same), `oncle` = oom; `fils` = zoon; `sympathique` = aardig, sympathiek; `assister à` = bijwonen; `rester` = blijven; `demander` = vragen; `ignorer` = niet weten; `librairie` = boekhandel (bibliotheek = `bibliothèque`); `entrée` = voorgerecht, ingang; `dessert` = toetje (woestijn = `désert`); `tasse` = kopje; `vin` = wijn; `bière` = bier; `cent` = honderd (NL `cent` = `centime`); `mille` = duizend; `douze` = twaalf; `quinze` = vijftien; `huit` = acht; `soixante-dix` = zeventig (not `zestig-tien`); numbers 21 to 99 are read tens first in French (`vingt-deux` = `twee-en-twintig`, reversed order).
- **tu vs. vous** (all four): both mean `you` / `tú`, `usted`, `ustedes` / `tu`, `Lei`, `voi` / `jij`, `u`, `jullie`. `vous` also agrees plural (`vous êtes`, `vous parlez`), and the polite singular is written `vous` with a plural verb but singular adjectives (`Vous êtes fatigué`, said to one man). Spanish `usted` takes a third-person verb; French `vous` takes the second-person plural, an important trap for Spanish speakers.
- **Gender and articles:** every noun is masculine or feminine and the article shows it (`le/un`, `la/une`), with `l'` hiding gender before a vowel (`l'eau (f)`, `l'homme (m)`); `les`, `des` are plural for both. The partitive `du`, `de la`, `de l'` (`du lait`, `de la crème`, `de l'eau`) is for an unspecified amount and `des` for plural; after a negation and after an amount they shrink to `de`/`d'` (`Je n'ai pas de monnaie`, `beaucoup de sucre`, `un verre d'eau`). Contractions `à + le = au`, `à + les = aux`, `de + le = du`, `de + les = des`; `à la`, `de la`, `à l'`, `de l'` stay apart. English has no gender; Italian gender often matches but not always (`le lait` = m, `il latte` = m; `la mer` = f, `il mare` = m; `le sel` = m, `il sale` = m; `l'amour` = m, but `la fin`/`la fine`): the Italian gloss flags only real mismatches. Spanish mismatches: `le lait` = la leche (f), `le sang`, `le lait`, `le miel`.
- **être vs. avoir:** `être` for identity, origin, profession, time, place and state (`Je suis de Lyon`, `Elle est fatiguée`); `avoir` for age, hunger, thirst, cold, heat, fear, sleepiness and hurry (`J'ai vingt ans`, `J'ai faim`, `J'ai soif`, `J'ai froid`, `J'ai chaud`, `J'ai sommeil`). English and Dutch use `be` (`I'm 20`, `ik ben 20`), Spanish and Italian use `tener`/`avere`, so only en and nl need the watch-out for age and hunger.
- **`il y a`:** `Il y a une pharmacie près d'ici` = there is/are (English, Dutch `er is`, Spanish `hay`, Italian `c'è`); it is not `ago` in A1 (`il y a deux ans` is A2). It is three tokens (`il`, `y`, `a`) and the same for singular and plural.
- **`c'est` vs. `il est`:** `c'est` + article/possessive/name/stressed pronoun (`C'est un café`, `C'est mon frère`, `C'est moi`); `il/elle est` + adjective or profession without article (`Il est grand`, `Elle est médecin`); `c'est` + adjective for things in general (`C'est bon`, `C'est cher`). Spanish/Italian have one `es`/`è` for both.
- **`aller` + infinitive** is the everyday future (`Je vais voyager`), not a continuous action; Spanish `ir a` and Italian `andare a` match, English `be going to`, Dutch `gaan`.
- **Reflexive verbs:** `Je m'appelle`, `Je me lève`, `Il s'habille`: the pronoun is always required, and `s'appeler` is not `appeler` (call someone). Spanish and Italian reflexives usually match (`me llamo`, `mi chiamo`), Dutch does not always (`Ik heet`, `ik sta op`), English rarely (`my name is`, `I get up`).
- **The clock:** `Il est trois heures et demie` = 3:30 (Dutch speakers: not `half drie`; the French says "three and a half"); `midi et demi`, `minuit et demi`; `et quart`, `moins le quart`, `moins dix`; `une heure` (singular) and `deux heures`; `pile` = sharp; `du matin`, `de l'après-midi`, `du soir`; `h` in digits (`3 h 30`) is a variant, not the text. Timetables and travel (module 11) use the 24-hour clock (`quinze heures trente`).
- **Numbers:** `soixante-dix` = 60 + 10, `quatre-vingts` = 4 × 20, `quatre-vingt-dix` = 4 × 20 + 10; `et` only in 21, 31, 41, 51, 61, 71 (`vingt et un`, `soixante et onze`, but `quatre-vingt-un` and `quatre-vingt-onze`); no hyphen around `et` in the traditional spelling; a hyphen between tens and units otherwise. `quatre-vingts` and `deux cents` keep their `s` before a noun (`quatre-vingts euros`, `deux cents euros`) and lose it before another numeral (`quatre-vingt-deux`, `deux cent trois`); `mille` never takes one. These `s` are silent, so the grammar rather than the audio decides them (an author checks each). `cent` before a vowel liaises (`cent euros` /sɑ̃tøʁo/).
- **Silent letters, liaison and homophones (dictation!):** see the homophone section below.
- **Nasal vowels** (`on`, `an/en`, `in/ain/ein`, `un`) and the French `r`, `u`/`ou` and `eu`/`oeu` are the pronunciation traps for all four groups; glosses mention pronunciation only when a spelling depends on it (`an` and `en` sound the same, `on` and `ont`).
- **Double negation:** `Je ne comprends pas`, `Je ne mange jamais de viande`. French needs `ne` in front; English and Dutch drop one negative, Spanish and Italian match.
- **Weather and time with `faire`:** `Il fait chaud` (it's hot), `Il fait beau`, `Il fait froid`, `Ça fait dix euros` (it costs ten euros), `Je fais du quarante` (I'm a size 40). `faire` also means "do" (`Qu'est-ce que vous faites?`) and "make"; a Spanish/Italian speaker may look for `hacer`/`fare`, which matches; Dutch `doen`/`maken`.
- **`aimer`:** the person is the subject (`J'aime le poisson`), not the thing (unlike Spanish `gustar`, Italian `piacere`). `J'aime` with a person means love; `J'aime bien` softens it. For Spanish and Italian the watch-out is that `gustar`/`piacere` is inverted and `aimer` is not; English `like`, Dutch `houden van`/`lekker vinden`.
- **Inverted marks:** Spanish translations carry `¿` and `¡`; French text never does.

## Homophones and silent letters (a dictation-app policy)

The app plays audio and the learner types what they hear, so any spelling difference French does not pronounce is decided by grammar and context, not by ear. This section is the rule for authors; the grader treats accent-only differences as accent slips (`a` for `à`, `ou` for `où`, `la` for `là`, `sur` for `sûr` pass in orange), but every other spelling difference is an error.

- **Grammar decides.** A unit is written so that exactly one spelling fits its context: `Il a un frère.` (only `a` is a verb form, `à` a preposition), `Où est la gare?` vs `Vous voulez du thé ou du café?`, `C'est un café` (never `Ces`). An author reads each unit with a homophone in it and rejects it when a homophone partner would also fit.
- **No bare homophone words.** A word-stage unit (or a phrase that fits both spellings) is not written for a word whose non-accent homophone is in the same module chain: `cent`/`sans`, `mer`/`mère`, `ces`/`ses`/`c'est`, `ce`/`se`, `son`/`sont`, `mes`/`mais`/`mai`, `est`/`et`, `vers`/`vert`/`verre`, `sept`/`cette`, `cours`/`court`, `lait`/`laid`/`les`, `prêt`/`près`, `dix`/`dis`, `nom`/`non`, `peu`/`peut`/`peux`, `deux`/`d'eux`, `eau`/`au`, `an`/`en`, `on`/`ont`, `vin`/`vingt`, `fois`/`foie`. Such a word is first met in a phrase or chunk that fixes it (`sans sucre`, `cent euros`, `la mer et la plage`, `mon père et ma mère`). A stage may be skipped for a lesson; the loader does not require all four.
- **Silent plural and gender need an audible cue.** `Il parle` and `Ils parlent`, `elle mange` and `elles mangent`, `joli`/`jolie`, `marié`/`mariée`, `bleu`/`bleus` sound alike. A unit that depends on the difference has an audible cue in the same sentence or sets `speaker`: a determiner that differs in sound (`mon/ma/mes`, `un/une/des`, `ce/cette/ces` are audible; `le/les` only weakly, so not alone), a numeral, a liaison (`Ils ont`, `Elles aiment`, `Ils habitent`, `des amis`, `les enfants`), or a verb whose plural is audible (`sont/est`, `ont/a`, `vont/va`, `font/fait`, `veulent/veut`, `peuvent/peut`, `prennent/prend`, `viennent/vient`, `boivent/boit`, `doivent/doit`, `comprennent/comprend`, `apprennent/apprend`). Regular `-er` verbs in the third-person plural (`parlent`, `habitent`, `mangent`) are used with a plural subject noun that has such a determiner (`Mes parents habitent à Nantes.`) or a vowel-initial verb after `ils/elles`; a bare `Ils parlent français` is not written, because it sounds exactly like `Il parle français`.
- **Silent verb endings** (`parle/parles/parlent`, `mange/manges/mangent`, `-er/-é/-ez` in `parler/parlé/parlez`) are decided by the subject and auxiliary in the sentence: `tu parles` (subject `tu`), `je vais parler` (after `aller`, `vouloir`, `pouvoir` an infinitive), `vous parlez` (subject `vous`). Participles as adjectives (`fermé/fermée`) follow the noun.
- **`variants`** are only for the same audio with the same meaning: `week-end`/`weekend`, `soeur`/`sœur`, `vingt-et-un`/`vingt et un`, digits. Never `il`/`ils` or `ces`/`ses`, which change the meaning.
- **Distractors** never contrast a distinction the learner cannot hear (see Support languages).
- **Audio.** The audio is a synthetic voice reading `text`; liaison, elision and `h` aspiré are where it may slip (`les amis` /lezami/, `vingt ans`, `cent euros`, `ils ont`). Every module gets the normal audio review; a misread clip is fixed in `content/audio-fixes.json`, not by respelling the text.

Homophone sets that arise in the A1 chain (module of each member in brackets) that authors should watch: `a/à` (1), `ou/où` (1/2), `la/là` (1/7), `sur/sûr` (1/2), `est/et` (1), `sans/cent` (1), `vin/vingt` (1), `lait/laid/les` (1/4), `dix/dis` (1/2), `deux/d'eux` (1/8), `eau/au` (1/2), `nom/non` (2/1), `an/en` (3/2), `on/ont` (4/4), `son/sont` (2/4), `mes/mais` (2/2), `peu/peut/peux` (2/1), `ce/se` (10/2), `ces/ses` (10/2), `sept/cette` (3/10), `cours/court` (5/4), `prêt/près` (6/7), `mer/mère` (11/4), `vers/vert/verre` (7/4/1), `fois/foie`, `mai/mais/mes` (11/2), `pied/pie`, `l'eau/l'os`. A2 and B1 add `sale/salle`, `haut/eau/au`, `mur/mûr`, `pris/prix`, `dit/dis`, `fait/fais/fait`, `dû/du`, `ferme/fermes`, `soit/soie`, `sois/soi`, `vu/vue`, `cent/sang`, `tant/temps/tend`, `quand/quant/camp`. This list is a prompt, not exhaustive: the check is done by reading every unit.

## Lemma conventions

The tokenizer (`shared/tokenize.ts`) decides what a "word" is, and the lexicon is keyed by that. A word is a maximal run of letters, digits and marks that may contain apostrophes and hyphens between letters: `[']letters(['-]letters)*[']`. So `j'ai`, `l'eau`, `qu'est-ce`, `s'il`, `aujourd'hui`, `peut-être`, `vingt-deux`, `allez-vous`, `a-t-il`, `là-bas`, `week-end` and `grand-mère` are each ONE token, with one lexicon entry and one lemma. Lexicon keys are the lowercase surface (`J'ai` -> `j'ai`), NFC-normalized, with a straight apostrophe. The loader requires an entry for every token of every unit and that the entry's lemma is introduced (proper nouns excepted); it does not look inside a token.

- **Elided words** (`j' l' d' qu' n' m' t' s' c'`) never stand alone. The whole token takes the lemma of the word after the apostrophe, its host: `j'ai` -> `avoir`, `l'eau` -> `eau`, `d'accord` -> `accord`, `c'est` -> `être`, `qu'il` -> `il`, `qu'est-ce` -> `être`, `n'est` -> `être`, `m'appelle` -> `appeler`, `s'il` -> `il`, `jusqu'à` -> `à`. The elided word (`je`, `le`, `de`, `que`, `ne`, `me`, `te`, `se`, `ce`) is not tracked by the loader, so the plan rule is: an elided form is used only once the word it elides is available, that is `j'` needs `je` (module 1), `l'` needs `le` (1), `d'` needs `de` (1), `qu'` needs `que` (1), `c'` needs a demonstrative use of `est` (fine from module 1), `n'` needs `ne` (2), `m'`, `t'`, `s'` need `me`, `te`, `se` (2). Never write `j' ai` or `l' eau` with a space: the tokenizer would read `j'` and `eau` as two words.
- **Hyphenated tokens.** Enclitic pronouns (`donnez-moi`, `excusez-moi`, `asseyez-vous`, `allez-vous`, `avez-vous`, `a-t-il`, `est-il`) make one token whose lemma is the verb: `donnez-moi` -> `donner`, `avez-vous` -> `avoir`, `a-t-il` -> `avoir`. Use one only once the attached pronoun is itself available as a lemma (`moi` and `vous` are in module 1). `est-ce` and `qu'est-ce` -> `être`; `est-ce que` is the two tokens `est-ce`, `que`. Fixed compound words are their own lemma: `peut-être`, `aujourd'hui`, `week-end`, `rendez-vous`, `petit-déjeuner`, `après-midi`, `aller-retour`, `là-bas`, `t-shirt`, `grand-père`, `grand-mère`, `quelqu'un` (A2). A learner who types a hyphenated word with a space (`peut être`, `vingt deux`) is not accepted by the grader today (see Open code questions).
- **Numbers.** Each round numeral is its own lemma. A compound numeral is one token (`vingt-deux`, `trente-cinq`, `quatre-vingt-dix-sept`) and takes the lemma of its family: `vingt-*` -> `vingt`, `trente-*` -> `trente`, `quarante-*` -> `quarante`, `cinquante-*` -> `cinquante`, `soixante-*` up to 69 -> `soixante`, `soixante-douze` to `soixante-dix-neuf` -> `soixante-dix`, `quatre-vingts` and `quatre-vingt-un` to `quatre-vingt-neuf` -> `quatre-vingt`, `quatre-vingt-dix` to `quatre-vingt-dix-neuf` -> `quatre-vingt-dix`, `dix-sept`, `dix-huit`, `dix-neuf` -> `dix`. `soixante et onze`, `vingt et un` and their kind are three tokens and three lemmas (`soixante`, `et`, `onze`). A compound is written only once every part is available: `vingt-trois` needs `vingt` (1) and `trois` (1); `vingt-six` needs `six` (3). `cent`/`cents` -> `cent`; `mille` is invariable. `un`/`une` -> `un`. `deux cents euros` is three tokens. Ordinals: `premier`/`première` -> `premier`, `deuxième`, `troisième`; `second`/`seconde` are not used. `demi`/`demie` -> `demi`.
- **Nouns:** the singular (`cafés` -> `café`, `animaux` -> `animal`, `yeux` -> `œil`). A noun for people with a regular feminine form uses the masculine (`amie` -> `ami`, `étudiante` -> `étudiant`, `voisine` -> `voisin`, `directrice` -> `directeur`, `infirmière` -> `infirmier`, `serveuse` -> `serveur`); epicene nouns keep their form (`collègue`, `enfant`, `élève`, `touriste`, `architecte`, `secrétaire`, `journaliste`); pairs that are different words stay apart (`père`/`mère`, `papa`/`maman`, `homme`/`femme`, `frère`/`sœur`, `fils`/`fille`, `oncle`/`tante`, `neveu`/`nièce`, `mari`/`femme`, `garçon`/`fille`, `grand-père`/`grand-mère`). A noun used in its sense only in the plural keeps the plural as its lemma (`vacances`, `lunettes`, `cheveux`, `toilettes`, `soldes`, `frites`, `pâtes`, `espèces`, `gens`, `études`, `devoirs`, `horaires` only as `horaire`). `grands-parents` -> `grand-parent`. The gloss gives the gender: `café (m)`, `eau (f)`.
- **Adjectives:** the masculine singular (`petite`, `petits` -> `petit`; `grande` -> `grand`; `blanche` -> `blanc`; `gentille` -> `gentil`; `chère` -> `cher`; `bonne` -> `bon`). Liaison forms share the lemma: `bel`, `belle`, `beaux` -> `beau`; `nouvel`, `nouvelle` -> `nouveau`; `vieil`, `vieille` -> `vieux`; `cet`, `cette`, `ces` -> `ce`. Invariable colors (`orange`, `marron`) are their own lemmas. `-ment` adverbs are their own lemmas (`lentement`, `normalement`, `seulement`). Comparatives and `très` + adjective are chunks: `mieux` and `meilleur` are A2. A participle used as an adjective takes the adjective lemma only when the plan lists that adjective; otherwise it takes the verb's lemma (`service compris` -> `comprendre`).
- **Verbs:** the infinitive. Every form shares one lemma, irregular ones included (`suis`, `es`, `est`, `sommes`, `êtes`, `sont` -> `être`; `ai`, `as`, `a`, `avons`, `avez`, `ont` -> `avoir`; `vais`, `vas`, `va`, `allons`, `allez`, `vont` -> `aller`; `fais`, `fait`, `faisons`, `faites`, `font` -> `faire`; `voudrais`, `veux`, `veut` -> `vouloir`; `peux`, `peut`, `peuvent` -> `pouvoir`; `il faut` -> `falloir`; `il pleut` -> `pleuvoir`). Imperatives (`continuez`, `prenez`) and infinitives share the lemma.
- **Reflexive and pronominal verbs** share the plain verb's lemma (`je m'appelle` -> `appeler`; `je me lève` -> `lever`; `il s'habille` -> `habiller`; `asseyez-vous` -> `asseoir`). The gloss gives the pronominal meaning (`s'appeler = be called`, `se lever = get up`). The pronouns `me`, `te`, `se`, `nous`, `vous` are their own lemmas, one lemma each for every use (subject, object, reflexive, reciprocal); a token `m'` is never separate (see Elided words).
- **Articles and contractions:** every definite form is `le` (`le la l' les`, with `l'eau` taking the lemma `eau`, host rule above); every indefinite singular form is `un` (`un`, `une`), and the numeral `un` shares it; `des` is one lemma (indefinite plural, partitive plural, and the contraction of `de` + `les`); `du` is one lemma (partitive and the contraction of `de` + `le`); `au` and `aux` are one lemma `au`. `de la` is two tokens, `de` and `la` (article, lemma `le`); `de l'` + noun is `de` and a hosted token (`de l'eau`); `à la` is `à` + `la`. The object pronouns `le`, `la`, `les` share a surface with the article, so the pronoun uses the keys `le#pron`, `la#pron`, `les#pron` (lemma `la`); the bare keys are the article (lemma `le`). Elided object `l'` before a verb takes the verb's lemma (`Je l'aime`).
- **Pronouns:** subject pronouns `je tu il elle on nous vous ils` are one lemma each; `elles` -> `ils`; elided `j'` is hosted. Stressed pronouns `moi toi lui eux` are their own lemmas; `elle`, `nous`, `vous` used stressed keep their subject lemmas, and stressed `elles` keeps `ils`. `y` and `en` (preposition and pronoun) are one lemma each; `ça` is its own lemma; neuter `ceci`/`cela` are not used. `qui`, `que`, `quel`, `où`, `comment`, `combien`, `pourquoi`, `quand` are one lemma each; `quelle`, `quels`, `quelles` -> `quel`.
- **Possessives and demonstratives:** the masculine singular (`ma`, `mes` -> `mon`; `ta`, `tes` -> `ton`; `sa`, `ses` -> `son`; `nos` -> `notre`; `vos` -> `votre`; `leurs` -> `leur`; `ces`, `cette`, `cet` -> `ce`). `tout`, `toute`, `tous`, `toutes` -> `tout`; `quelques` -> `quelque`; `autres` -> `autre`; `chaque`, `plusieurs`, `même` are distinct. Possessive `son` and the verb `sont` are different lemmas; `mon` and `m'ont` are different tokens.
- **Accent pairs are different surfaces and different lemmas:** `a`/`à`, `ou`/`où`, `la`/`là`, `sur`/`sûr`, `du`/`dû`, `mur`/`mûr`, `cote`/`côte`, `pêche`/`peche` is not a word. `mais` is always `mais` (but); the corn is `maïs`. Capitals keep their accents, and the loader lowercases (`À` -> `à`).
- **Homographs and sense keys:** a lexicon key is the lowercase surface, plus `#sense` when a surface needs two entries. Unlike the sibling plans, the bare key goes to the reading a learner meets most in the module chain, which for the common function verbs is the verb form: `est` = `être` (bare), `est#east` (never used in A1); `suis` = `être` (bare), `suis#suivre`; `as` = `avoir` (bare), `as#card`; `a` = `avoir` (bare; `à` is a different key); `vais`, `va` = `aller`; `sont` = `être`. Where readings belong to different lemmas and the non-verb reading is the ordinary one, the non-verb reading takes the bare key and each verb reading `#` + its infinitive: `porte` door and `porte#porter`; `fils` son and `fils#fil` threads (never used in A1); `livre` book and `livre#livrer`; `chat` cat; `mousse`; `couvert` cutlery and `couvert#couvrir`; `voyage` trip and `voyage#voyager`; `carte` is one entry covering card, menu and map; `travail` and `travaille#travailler` differ in spelling and need no tag; `cuisine` kitchen and `cuisine#cuisiner` (verb); `douche` and `douche#doucher`; `dîner` and `déjeuner` as verb (bare) and noun (`dîner#noun`, `déjeuner#noun`, `petit-déjeuner` needs none). When one lemma has two glosses, the second takes a short tag: `plat` flat (module 1) and `plat#noun` dish (module 8); `place` seat (module 1) and `place#square`; `temps` time and `temps#weather`; `neige` snow and `neige#neiger`; `pas` not (`ne ... pas`) and `pas#noun` step; `plus` more and `plus#neg` (`ne ... plus`, A2); `tout` as adjective, pronoun and adverb share the bare key with a gloss that lists all three; `mais` conjunction; `si` if/yes; `premier` first; `simple` and `double` in module 11 are adjectives; `simple` as in `aller simple` needs no tag. A module that uses a second reading adds that key to its lexicon; no module re-lists the lemma.
- **Participles** (A2 and B1) share the verb's lemma, irregular ones included (`mangé`, `fait`, `pris`, `vu`, `été`, `né`, `ouvert` -> the infinitive's lemma), except where the plan lists an adjective lemma: `blessé`, `meublé`, `déçu`, `fâché`, `ému`, `soulagé`, `stressé`, `interdit`. Feminine and plural forms share the participle's lemma (`prise`, `mortes`). A participle whose surface is also a noun or another verb form takes a sense key: `été#être` (participle) against `été` summer (A1, bare key), `fait#noun` (a fact, introduced as a noun in module 25) against the bare `fait` (`faire`), `vue#voir` against `vue` view, `sortie` and `venue` are never used as nouns. Gérondif forms (`en travaillant`) are `en` plus the verb's lemma; `-ant` never has its own lemma unless listed.
- **New sense keys in A2 and B1:** `est#east` (module 13; the bare `est` stays `être`), `plus#neg` for `ne ... plus` (bare `plus` is more), `personne#pron` (`ne ... personne`; bare `personne` is the noun person if ever used), `visite#visiter` (the noun `visite` in module 12 takes the bare key), `rêve#rêver` (noun `rêve` bare), `propre#own` (module 23; bare `propre` is clean), `poste#job` (module 24; same lemma as A1 `poste` post office, not re-listed), `en#pron` and `y` (pronoun uses share the preposition's lemma). The A1 verbs `ferme` and `pratique` (bare keys) keep those keys: the module 14 noun is `ferme#noun` and the module 20 adjective is `pratique#adj`.
- **Pronoun families:** `dont` is one lemma; `lequel`, `laquelle`, `lesquels`, `lesquelles`, `auquel`, `auxquels`, `duquel`, `desquelles` and the rest share `lequel`; `celui`, `celle`, `ceux`, `celles` -> `celui`; `moi-même`, `toi-même`, `lui-même` and the like -> `même`; `le mien`, `la tienne`, `les siens` -> `mien`, `tien`, `sien`, `nôtre`, `vôtre` (own lemmas, listed in module 23); `quel` forms share `quel` (A1).
- **Subjunctive, conditional, future, imparfait** forms share the verb's lemma (`soit`, `aille`, `fasse`, `serais`, `irai`, `étais`, `avais`). `si` before `il` is `s'il` (lemma `il`, host rule), before `elle` `si elle` (lemma `si`). `-ment` adverbs are their own lemmas and are listed.
- **Agreement spellings and audible cues:** past-participle agreement (`allée`, `arrivés`, `installées`) is written only where something audible fixes it: the audible feminine or plural participles (`prise`, `mise`, `morte`, `faite`, `ouverte`, `écrite`, `dite`, `vue` in `qu'est-ce que tu as vu`), the speaker (`speaker` = `F`), or `il/elle`, `est/sont` in the sentence. Silent agreement is never the only difference between two options of a meaning check. The future `-ai` and the conditional `-ais` (`j'irai`, `j'irais`) are never contrasted in a distractor.
- **Numbers, days, months:** days (`lundi` ... `dimanche`) and months (`janvier` ... `décembre`) are lowercase and are lemmas; seasons too (`printemps`, `été`, `automne`, `hiver`). **Nationalities and languages** are lowercase (`français`, `anglais`, `espagnol`), unlike Dutch and English, and one lemma serves both the language and the nationality (`Je parle français`, `Il est français`, `Elle est française`, `une femme française`); the feminine and plural forms share the masculine lemma. Country names are proper nouns and keep their article as a separate token (`la France`, `la Belgique`, `le Canada`, `les États-Unis`): `en` before feminine countries (`en France`), `au`/`aux` before masculine and plural ones (`au Canada`, `aux États-Unis`), `à` before cities (`à Lyon`), `de`/`d'` from (`de Paris`, `d'Espagne`, `du Canada`, `des États-Unis`). `États-Unis` is a single PROPN token (hyphen).
- **Proper nouns** (`PROPN`: people, cities, countries, regions, holidays such as `Noël`, `Pâques`, `le quatorze juillet`) are never introduced and may appear anywhere, but they still need a lexicon entry (`pos: PROPN`, lemma = itself), like every token. Lowercase-normalized: `aix-en-provence`.
- **Every lemma is a single token** with no spaces. Multi-word expressions (`s'il vous plaît`, `tout de suite`, `bien sûr`, `à côté de`, `il y a`, `tout droit`, `un peu`, `de rien`, `parce que`) are made of their words' lemmas, and the gloss of each part explains the expression. `parce que` is the two tokens `parce`, `que` (lemma `parce`); `d'accord` is one token, lemma `accord`.
- **Diacritics** are part of the spelling (`café`, `déjà`, `œil`, `naïf`, `ça`); the grader treats a missing accent as an accent slip, not an error (`œ` written as `oe` is not treated that way, see Open code questions).

Worked lexicon keys (the `gloss` object carries `en`, `es-419`, `it`, `nl`; only `en` shown):

```json
"j'ai":        { "lemma": "avoir",  "pos": "VERB", "gloss": { "en": "j'ai = je + ai: I have; watch out: age uses avoir (J'ai vingt ans = I am twenty)" } },
"c'est":       { "lemma": "être",   "pos": "AUX",  "gloss": { "en": "c'est = ce + est: it is, this is, that is" } },
"qu'est-ce":   { "lemma": "être",   "pos": "AUX",  "gloss": { "en": "qu'est-ce = que + est-ce: what (qu'est-ce que = what is it that)" } },
"l'eau":       { "lemma": "eau",    "pos": "NOUN", "gloss": { "en": "l'eau = le + eau: the water (f)" } },
"vingt-deux":  { "lemma": "vingt",  "pos": "NUM",  "gloss": { "en": "twenty-two (vingt + deux)" } },
"s'il":        { "lemma": "il",     "pos": "PRON", "gloss": { "en": "s'il = si + il: if he, if it; s'il vous plaît = please" } },
"est#east":    { "lemma": "est",    "pos": "NOUN", "gloss": { "en": "east" } }
```

## A1

### 1. Au café -- `fr-a1-cafe`

- **Order:** 1.
- **Requires:** nothing.
- **Grammar:** `je voudrais` + noun (a form of `vouloir`, taught as a chunk) and `je peux` + infinitive as a chunk (`Je peux payer par carte?`); `vous désirez?` and `Vous avez...?` as chunks; `le/la/l'/les` and `un/une`; the partitive `du`, `de la`, `de l'` as chunks (`du lait`, `de la crème`, `de l'eau`) and `de` after an amount (`un verre de vin`, `un jus d'orange`); `c'est` + noun and `Combien ça coûte?` / `C'est combien?`; `s'il vous plaît`; `sans` and `avec`; `sur place` / `à emporter`; `Donnez-moi...` / `Excusez-moi` as fixed chunks. `en` is not available yet (it arrives in module 2), so no unit uses it as a preposition or pronoun.
- **Lessons:**
  1. Un café, s'il vous plaît
  2. C'est combien?
  3. Quelque chose à boire
  4. Chaud ou froid?
  5. Sur place ou à emporter?
  6. Carte ou espèces?
- **Introduces:** bonjour, merci, oui, non, pardon, excuser, moi, rien, il, vous, plaire, je, vouloir, avoir, pouvoir, prendre, payer, donner, apporter, emporter, désirer, être, coûter, ça, le, un, du, de, et, ou, avec, sans, pour, à, sur, par, ici, aussi, encore, beaucoup, seulement, autre, tout, quelque, chose, combien, que, voilà, bon, deux, trois, quatre, cinq, dix, vingt, cinquante, cent, euro, addition, carte, espèces, place, café, thé, lait, sucre, eau, jus, orange, pain, croissant, gâteau, sandwich, biscuit, fromage, jambon, boisson, bière, vin, verre, bouteille, tasse, chocolat, crème, chaud, froid, grand, petit, noir, gazeux, plat

### 2. Salut! -- `fr-a1-salut`

- **Order:** 2.
- **Requires:** `fr-a1-cafe`.
- **Grammar:** `être` in the singular and `vous êtes` (`je suis`, `tu es`, `il/elle est`) for name, origin and nationality; `aller` as a chunk for how you are (`Ça va?`, `Comment allez-vous?`, `Comment vas-tu?`, `Je vais bien`); `s'appeler` in the singular (`je m'appelle`, `tu t'appelles`, `il/elle s'appelle`) with `Comment vous appelez-vous?` as a chunk; `ne ... pas`; `être de` + place and `d'où`; nationality agreement (`français/française`, `canadien/canadienne`, `belge`, `suisse`), lowercase; `tu` vs. `vous`; `à`/`en`/`au` before places (`en France`, `à Lyon`, `au Canada`); classroom chunks (`Je ne comprends pas`, `Vous pouvez répéter?`, `Comment ça s'écrit?`, `Comment ça se dit?`, `Qu'est-ce que ça veut dire?`, `Parlez lentement, s'il vous plaît`).
- **Lessons:**
  1. Salut!
  2. Comment tu t'appelles?
  3. Tu es d'où?
  4. Bonjour, madame Martin
  5. Je ne comprends pas
  6. Voici mon ami
- **Introduces:** salut, au, revoir, bientôt, demain, bonsoir, matin, soir, jour, nuit, journée, soirée, enchanté, bienvenue, appeler, nom, prénom, tu, toi, elle, mon, ton, son, votre, voici, qui, où, comment, quel, aller, bien, mal, très, peu, ne, pas, mais, sûr, accord, désolé, ami, monsieur, madame, pays, ville, habiter, parler, comprendre, répéter, écrire, dire, lentement, mot, fois, me, te, se, présenter, en, français, anglais, espagnol, italien, allemand, néerlandais, belge, suisse, canadien, américain, britannique

### 3. Nombres et heures -- `fr-a1-nombres`

- **Order:** 3.
- **Requires:** `fr-a1-salut`.
- **Grammar:** `avoir` in the singular (`j'ai`, `tu as`, `il/elle a`); age with `avoir` (`J'ai trente ans`, `Quel âge as-tu?`; English and Dutch use `be`); numbers to 100 (`seize`, `dix-sept`, `vingt et un`, `vingt-deux`, `soixante-dix`, `quatre-vingts`, `quatre-vingt-dix-sept`); phone numbers read in pairs (`zéro six, douze, trente-quatre...`); `Quelle heure est-il?`, `Il est trois heures`, `et quart`, `et demie`, `moins le quart`, `moins dix`, `midi`, `minuit`, `pile`, `du matin/de l'après-midi/du soir`; `à` + time; days without an article (`lundi`) or with it for habit (`le lundi`); `Vous avez l'heure?`; `Il est ouvert de neuf heures à midi`.
- **Lessons:**
  1. De zéro à vingt
  2. Tu as quel âge?
  3. Ton numéro de téléphone
  4. Quelle heure est-il?
  5. Le magasin est ouvert
  6. Les jours de la semaine
- **Introduces:** zéro, six, sept, huit, neuf, onze, douze, treize, quatorze, quinze, seize, trente, quarante, soixante, soixante-dix, quatre-vingt, quatre-vingt-dix, an, année, heure, demi, quart, moins, minute, semaine, aujourd'hui, midi, minuit, après-midi, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche, week-end, numéro, nombre, chiffre, compter, téléphone, portable, ouvrir, fermer, ouvert, fermé, magasin, maintenant, tôt, tard, depuis, âge, pile, rendez-vous, horaire

### 4. La famille -- `fr-a1-famille`

- **Order:** 4.
- **Requires:** `fr-a1-nombres`.
- **Grammar:** plural nouns and articles (`des`, `les`, silent `-s`, plural marked by the determiner); adjective agreement in gender and number, with the rule that an inaudible agreement needs an audible cue or `speaker`; possessives `mon/ma/mes`, `ton/ta/tes`, `son/sa/ses`, `notre/nos`, `votre/vos`, `leur/leurs` (`mon amie`, with `mon` before a vowel); full `être` and `avoir`; `on` and `nous`, `ils` and `elles`; `c'est` vs. `il/elle est` (`C'est mon père`, `Il est grand`); `avoir` + physical features (`Elle a les yeux verts`, `J'ai les cheveux courts`); `Combien de frères et sœurs as-tu?`.
- **Lessons:**
  1. Ma famille
  2. Frères et sœurs
  3. Comment est-elle?
  4. Grand ou petit?
  5. Les grands-parents
  6. Une grande famille
- **Introduces:** famille, père, mère, papa, maman, parent, fils, fille, frère, sœur, grand-père, grand-mère, grand-parent, oncle, tante, cousin, neveu, nièce, mari, femme, compagnon, couple, enfant, bébé, garçon, homme, personne, gens, chien, chat, animal, maison, connaître, on, nous, ils, notre, leur, des, marié, célibataire, divorcé, court, long, jeune, vieux, beau, joli, laid, gentil, sympathique, drôle, sérieux, timide, intelligent, mince, cheveux, œil, barbe, lunettes, bleu, vert, marron, blond, brun, roux, seul, ensemble, nombreux, aîné, cadet

### 5. Travail et études -- `fr-a1-travail`

- **Order:** 5.
- **Requires:** `fr-a1-famille`.
- **Grammar:** the present of regular `-er` verbs, all persons (`travaille, travailles, travaille, travaillons, travaillez, travaillent`), with the silent endings rule; `faire` (`Qu'est-ce que vous faites dans la vie?`, `Je fais des études de langues`); `être` + profession with no article (`Je suis infirmière`, `Elle est médecin`) vs. `c'est un/une` (`C'est un bon médecin`); `travailler` + `dans`/`chez`/`à`/`comme`; `parler` + language with no article; duration with `depuis` + present (`J'étudie le français depuis un an`); `avoir besoin de`; `Où est-ce que tu travailles?` as the form of the question.
- **Lessons:**
  1. Qu'est-ce que vous faites dans la vie?
  2. Où est-ce que tu travailles?
  3. J'étudie le français
  4. Les langues
  5. Un nouveau travail
  6. Mes collègues
- **Introduces:** travailler, étudier, apprendre, enseigner, pratiquer, besoin, faire, travail, métier, profession, études, étudiant, professeur, médecin, infirmier, ingénieur, avocat, serveur, cuisinier, caissier, architecte, informaticien, retraité, vendeur, secrétaire, journaliste, chauffeur, mécanicien, collègue, chef, bureau, école, université, hôpital, entreprise, usine, banque, langue, cours, examen, difficile, facile, intéressant, ennuyeux, content, nouveau, occupé, chinois, japonais, portugais, arabe, comme, ordinateur, temps, plein, partiel, dans, chez, vie

### 6. Ma journée -- `fr-a1-journee`

- **Order:** 6.
- **Requires:** `fr-a1-travail`.
- **Grammar:** `aller` in full (`vais, vas, va, allons, allez, vont`) with `à` + place and `au`/`à la`/`à l'` (`Je vais au travail`, `Je rentre à la maison`), and `du` for `de` + `le` (`Il sort du bureau`); the present of `-ir` and other frequent verbs (`finir`, `partir`, `sortir`, `dormir`, `prendre`, `voir`, `lire`); reflexive verbs with `me te se nous vous` (`Je me lève`, `Nous nous couchons tard`, `Il s'habille`); frequency adverbs (`toujours`, `souvent`, `parfois`, `jamais` with `ne`); `le matin`, `l'après-midi`, `le soir`; `avant`/`après` + noun; `d'habitude`, `normalement`.
- **Lessons:**
  1. Le matin
  2. Je me lève tôt
  3. L'heure du déjeuner
  4. L'après-midi
  5. Le soir
  6. Toujours, parfois, jamais
- **Introduces:** lever, réveiller, doucher, laver, habiller, brosser, dent, douche, réveil, lit, petit-déjeuner, déjeuner, dîner, repas, manger, cuisiner, ménage, dormir, coucher, lire, voir, télévision, livre, journal, sortir, partir, rentrer, rester, commencer, finir, prêt, premier, ensuite, puis, alors, avant, après, toujours, souvent, parfois, jamais, chaque, habitude, normalement, général, fatigué, tranquille, reposer, marcher, vélo, exercice, matinée

### 7. En ville -- `fr-a1-ville`

- **Order:** 7.
- **Requires:** `fr-a1-journee`.
- **Grammar:** `il y a` for what exists (`Il y a une pharmacie près d'ici?`) vs. `être` for where a known thing is (`Où est le musée?`); `aller` and `venir` in full (`viens`, `venez`, `viennent`); `devoir` + infinitive and `il faut` + infinitive; `vous` commands as chunks (`Continuez tout droit`, `Tournez à gauche`, `Prenez la deuxième rue`, `Traversez la place`); place prepositions (`à côté de`, `en face de`, `entre`, `derrière`, `devant`, `près de`, `loin de`, `vers`, `sous`, `dans`, `sur`, `chez`), with `du`/`des` (`près du parc`, `loin des gares`); ordinals (`la deuxième rue`); `savoir` (`Vous savez où est...?`) vs. `connaître`; the mille.
- **Lessons:**
  1. Où est la gare?
  2. Il y a une pharmacie près d'ici?
  3. À gauche et à droite
  4. En bus ou à pied?
  5. Où est-ce que je descends?
  6. Le centre
- **Introduces:** y, venir, savoir, chercher, trouver, arriver, entrer, passer, suivre, tourner, continuer, traverser, descendre, monter, attendre, conduire, garer, devoir, falloir, droit, gauche, droite, près, loin, côté, face, entre, sous, derrière, devant, vers, là, là-bas, coin, feu, carrefour, rue, avenue, route, centre, gare, arrêt, bus, métro, train, taxi, pied, voiture, chemin, pharmacie, supermarché, boulangerie, poste, musée, église, parc, bibliothèque, toilettes, endroit, deuxième, troisième, mille, kilomètre, mètre, perdu, plan, ligne, adresse

### 8. Au restaurant -- `fr-a1-restaurant`

- **Order:** 8.
- **Requires:** `fr-a1-ville`.
- **Grammar:** `aimer`, `adorer`, `préférer` (`J'aime le poisson`, `Tu aimes ça?`, `Je préfère le riz`), with the article for general likes; `avoir faim` and `avoir soif` (English and Dutch use `be`); `boire` (`bois`, `buvez`, `boivent`); the partitive after `prendre`/`vouloir` (`Je prends du poulet`) and `pas de` after a negation (`Je ne prends pas de viande`); ordering (`Pour moi, le poulet`, `Je vais prendre...` as a chunk, `Qu'est-ce que vous me conseillez?`); `L'addition, s'il vous plaît` and `séparément`/`additions séparées`; `lui` and `eux` after prepositions (`pour lui`, `avec eux`).
- **Lessons:**
  1. Une table pour deux
  2. La carte
  3. En entrée et en plat
  4. Tu aimes ça?
  5. J'ai faim
  6. Le dessert et l'addition
- **Introduces:** aimer, adorer, préférer, commander, réserver, conseiller, goûter, boire, asseoir, lui, eux, restaurant, table, menu, entrée, dessert, soupe, salade, viande, poulet, poisson, riz, haricot, pomme, terre, tomate, légume, fruit, pâtes, pizza, frites, sel, poivre, huile, sauce, délicieux, épicé, végétarien, mauvais, faim, soif, assez, pourboire, séparé, suite, carafe, glace, tarte, appétit, terrasse, service

### 9. Loisirs -- `fr-a1-loisirs`

- **Order:** 9.
- **Requires:** `fr-a1-restaurant`.
- **Grammar:** `vouloir` and `pouvoir` in full (`veux`, `veut`, `voulons`, `voulez`, `veulent`; `peux`, `peut`, `pouvons`, `pouvez`, `peuvent`); `jouer à` + sport (`jouer au football`) and `jouer de` + instrument (`jouer du piano`, `jouer de la guitare`); `être en train de` + infinitive for what is happening right now (`Je suis en train de regarder un film`), never for habits; invitations (`Tu veux venir?`, `On va au cinéma?`, `Tu es libre samedi?`, `Ça te dit?`) and answers (`Avec plaisir!`, `Bien sûr!`, `Désolé, je ne peux pas`, `Dommage!`); `pourquoi?` vs. `parce que`; `quand`; `avec moi`, `avec toi`, `moi non plus`; `tu` imperatives (`Viens!`).
- **Lessons:**
  1. Qu'est-ce que tu aimes faire?
  2. Tu joues au football?
  3. La musique
  4. Tu veux venir?
  5. Dommage, je ne peux pas
  6. Je suis en train de regarder un film
- **Introduces:** libre, jouer, écouter, danser, chanter, nager, courir, promener, voyager, inviter, regarder, retrouver, sport, football, tennis, match, jeu, musique, guitare, piano, chanson, film, concert, théâtre, cinéma, fête, piscine, salle, spectacle, loisir, parce, pourquoi, quand, plaisir, plus, idée, dommage, peut-être, génial, envie, préféré, vrai

### 10. Faire les courses -- `fr-a1-courses`

- **Order:** 10.
- **Requires:** `fr-a1-loisirs`.
- **Grammar:** demonstratives `ce`, `cet`, `cette`, `ces` (one lemma `ce`; audio `ce/cet/cette/ces` vs. `se`, `ses`, `sept`); color agreement (`une chemise rouge`, `des chaussures rouges`; `bleu/bleue` silent, `blanc/blanche` audible; `orange` and `marron` invariable); quantities (`un kilo de`, `cinq cents grammes de`, `une douzaine d'œufs`, `un litre de`); hundreds for prices (`trois cents euros`); object pronouns `le`, `la`, `les` as chunks (`Je le prends`, `Je la prends`, `Je peux l'essayer?`); `essayer`, `aller` for fit (`Ça vous va bien`, `Ça me va`); `faire` for size and price (`Je fais du quarante`, `Ça fait dix euros`); `trop` + adjective (`C'est trop cher`); `Je regarde seulement, merci`.
- **Lessons:**
  1. Au marché
  2. Cinq cents grammes de fraises
  3. De quelle couleur?
  4. Quelle taille?
  5. Je peux l'essayer?
  6. À la caisse
- **Introduces:** acheter, vendre, dépenser, essayer, montrer, aider, changer, la, ce, couleur, blanc, rouge, jaune, gris, rose, violet, taille, pointure, vêtement, chemise, t-shirt, pantalon, jean, jupe, robe, veste, pull, manteau, chaussure, sac, cabine, essayage, marché, caisse, ticket, soldes, réduction, prix, cher, serré, confortable, kilo, gramme, litre, douzaine, paquet, œuf, banane, fraise, raisin, frais, argent, monnaie, trop, bancaire, panier

### 11. En voyage -- `fr-a1-voyage`

- **Order:** 11.
- **Requires:** `fr-a1-courses`.
- **Grammar:** `aller` + infinitive for plans (`Je vais voyager en Italie`); dates (`le trois mai`, `le premier janvier`; only `premier` for the 1st) and months, lowercase; weather (`Il fait chaud`, `Il fait froid`, `Il fait beau`, `Il fait mauvais`, `Il pleut`, `Il neige`, `Il y a du soleil`, `Il y a du vent`, `Quel temps fait-il?`, `Le ciel est nuageux`... written as `Il y a des nuages` only if `nuage` is added; otherwise `C'est nuageux`); `prochain` and `dernier` (`le mois prochain`); `partir` and `arriver` with times (`Le train part à quinze heures trente`, 24-hour clock); `durer` (`Ça dure combien de temps?`); `pendant` and `dans` + duration (`pendant trois jours`, `dans deux heures`); `en` + month/season (`en mai`, `en été`, `au printemps`).
- **Lessons:**
  1. Un billet pour Lyon
  2. Le train a du retard
  3. À l'hôtel
  4. Quel temps fait-il?
  5. Les saisons
  6. En vacances
- **Introduces:** voyage, vacances, touriste, visiter, durer, billet, aller-retour, simple, double, avion, aéroport, vol, quai, valise, passeport, hôtel, chambre, clé, ascenseur, étage, complet, plage, mer, montagne, lac, soleil, pluie, pleuvoir, neige, neiger, vent, nuageux, degré, météo, retard, réservation, date, saison, printemps, été, automne, hiver, mois, janvier, février, mars, avril, mai, juin, juillet, août, septembre, octobre, novembre, décembre, prochain, dernier, suivant, pendant

## A2

Modules 12 to 21 mirror the Spanish A2 themes and order. Tenses arrive in a fixed order and no unit runs ahead of it: the passé composé in 12 (`avoir`) and 13 (`être`, reflexives), the imparfait in 14, both together in 15, the futur simple from 19, the conditional only as politeness in 21 (and `je voudrais` since module 1), no subjunctive before 25. `quand` about the future takes the futur simple (`Quand j'arriverai, je t'appellerai`). Each module lists about 20 to 40 lemmas, sized like the Spanish A2 lists; the extra-lemma rule above applies (up to about 10 unlisted lemmas that no module lists).

### 12. Le week-end dernier -- `fr-a2-week-end`

- **Order:** 12.
- **Requires:** `fr-a1-voyage`.
- **Grammar:** the passé composé with `avoir` (`j'ai mangé`, `tu as fini`, `il a vendu`: `-er`, `-ir` and `-re` verbs) and the irregular participles of verbs already known (`eu`, `été#être`, `fait`, `pris`, `vu`, `lu`, `bu`, `dit`, `écrit`, `pu`, `voulu`, `su`, `dû`, `mis`, `appris`, `compris`, `connu`, `ouvert`), each one a plan item; negation around the auxiliary (`Je n'ai pas mangé`, `Je n'ai rien fait`, `Je n'ai vu personne`, `Je n'ai jamais...`, `Je n'ai plus faim`, `pas encore`), and `ne ... plus/rien/personne` in the present; `il y a` + time for "ago" (`Il y a une semaine`); time markers `hier`, `hier soir`, `samedi dernier`, `ce matin`, `déjà`; questions with the auxiliary (`Tu as déjà mangé?`, `Qu'est-ce que tu as fait?`); `avoir` participles never agree here (agreement starts in module 13 with `être` and in module 17 with a preceding object); the passé simple is never used, and neither is `venir de` (module 15).
- **Lessons:**
  1. Qu'est-ce que tu as fait hier?
  2. On a mangé dehors
  3. Il y a une semaine
  4. Tu as déjà mangé?
  5. J'ai perdu mes clés
  6. Mon week-end
- **Introduces:** hier, déjà, dehors, perdre, oublier, nettoyer, envoyer, mettre, raconter, demander, répondre, décider, choisir, penser, entendre, ranger, rater, terminer, téléphoner, message, photo, porte, quelqu'un, ni, promenade, visite, retourner

### 13. Mon histoire -- `fr-a2-histoire`

- **Order:** 13.
- **Requires:** `fr-a2-week-end`.
- **Grammar:** the passé composé with `être` for `aller, venir, arriver, partir, sortir, entrer, rester, naître, mourir, monter, descendre, rentrer, retourner, tomber, devenir` (`Je suis né à Nantes`, `Elle est partie hier`, `Nous sommes arrivés à midi`) and for reflexive verbs (`Je me suis levé`, `On s'est installés à Toulouse`, `Ils se sont mariés`), with `avoir` for `déménager`, `grandir`, `réussir`, `obtenir`, `rencontrer`, `quitter`; the participle agrees with the subject, and that agreement is written and tested only where an audible cue exists (see Agreement and audible cues); life experience (`Tu as déjà visité le Québec?`, `Je ne suis jamais allé au Canada`); years said in full (`en deux mille dix`, `en mille neuf cent quatre-vingt-dix`), `à l'âge de`, `pendant` + duration; the cardinal points.
- **Lessons:**
  1. Je suis né à Nantes
  2. Je suis allé à l'école à Lyon
  3. Je me suis installé à Toulouse
  4. On s'est mariés
  5. Tu as déjà visité le Québec?
  6. Ma vie
- **Introduces:** naître, mourir, grandir, installer, déménager, marier, épouser, rencontrer, obtenir, réussir, quitter, tomber, devenir, histoire, mariage, diplôme, lycée, naissance, village, capitale, étranger, nord, sud, est, ouest, triste, plusieurs

### 14. Quand j'étais petit -- `fr-a2-enfance`

- **Order:** 14.
- **Requires:** `fr-a2-histoire`.
- **Grammar:** the imparfait (stem of `nous` + `-ais, -ais, -ait, -ions, -iez, -aient`; `étais`, `avais`, `allais`, `faisais`, `mangeais`, `commençais`, `il pleuvait`, `il y avait`) for description and past habits; `quand j'étais petit`, `à l'époque`, `autrefois`, `tous les étés`, `souvent`, `d'habitude`; `avoir peur`; `se souvenir de` vs. `se rappeler` and `rappeler`; the silent endings `-ait`/`-aient` are decided by the subject (`ils avaient`, `elles étaient` are audible through the liaison, `il jouait`/`ils jouaient` are not, so a plural needs an audible cue); `j'avais` vs. `j'ai eu`.
- **Lessons:**
  1. Quand j'étais petit
  2. On jouait dans la rue
  3. Tous les étés
  4. À l'école
  5. J'avais peur
  6. Je me souviens de ma grand-mère
- **Introduces:** enfance, autrefois, époque, souvenir, rappeler, croire, utiliser, campagne, ferme, jouet, poupée, ballon, arbre, jardin, peur, pleurer, rire, rêve, rêver, sage, dessiner, devoirs, récréation, bonbon

### 15. Qu'est-ce qui s'est passé? -- `fr-a2-incident`

- **Order:** 15.
- **Requires:** `fr-a2-enfance`.
- **Grammar:** passé composé for the events and imparfait for the background (`Il pleuvait quand je suis sorti`); `pendant que` + imparfait; `être en train de` in the imparfait (`J'étais en train de dormir`); `venir de` + infinitive, present and imparfait (`Je viens d'arriver`, `Elle venait de partir`); story markers (`au début`, `soudain`, `tout à coup`, `heureusement`, `finalement`, `à la fin`, `alors`, `ensuite`, `puis`); `se rendre compte que`; `voler` = steal and fly.
- **Lessons:**
  1. Pendant que je marchais...
  2. Soudain
  3. On m'a volé mon portefeuille
  4. Un accident
  5. Heureusement
  6. Une journée bizarre
- **Introduces:** soudain, coup, début, fin, heureusement, finalement, chance, moment, voler, casser, crier, heurter, effrayer, rendre, portefeuille, police, voleur, accident, blessé, bruit, bizarre, étrange, dangereux, aide, surprise, compte

### 16. Chez le médecin -- `fr-a2-sante`

- **Order:** 16.
- **Requires:** `fr-a2-incident`.
- **Grammar:** `avoir mal à` + body part with the contractions (`J'ai mal à la tête`, `J'ai mal au dos`, `mal aux pieds`, `mal à l'oreille`) and `faire mal` (`Ça me fait mal`, `Mon dos me fait mal`); the article, not the possessive, with body parts; `avoir de la fièvre`, `avoir un rhume`, `avoir la grippe`; `se sentir` + adjective or adverb (`Je me sens mal`), `aller mieux` (`Ça va mieux`); advice and rules with `il faut`, `il ne faut pas` and `devoir` in the present (`Vous devez vous reposer`); `depuis` + present (`J'ai mal depuis deux jours`); dosage chunks (`trois fois par jour`, `avant les repas`, `après le repas`); `Guérissez vite!` as a fixed chunk.
- **Lessons:**
  1. Je ne me sens pas bien
  2. J'ai mal à la tête
  3. Au cabinet
  4. J'ai de la fièvre
  5. À la pharmacie
  6. Ça va mieux
- **Introduces:** santé, malade, sentir, douleur, fièvre, toux, rhume, grippe, tête, visage, gorge, ventre, dos, bras, jambe, main, oreille, nez, bouche, corps, cœur, genou, médicament, comprimé, ordonnance, cabinet, docteur, respirer, allergique, température, grave, urgence, nécessaire, guérir, mieux, pharmacien, tousser, repos, sirop, vite

### 17. Le nouvel appartement -- `fr-a2-logement`

- **Order:** 17.
- **Requires:** `fr-a2-sante`.
- **Grammar:** direct object pronouns `le`, `la`, `les`, `l'` before the verb (`Je le mets ici`, `Je l'ai posé là`, `Je ne les trouve pas`), after an affirmative imperative (`Mets-le ici`, `Pose-la là`) and before an infinitive (`Je vais le poser`); the participle agrees with a preceding object (`la lampe que j'ai posée`, `Je les ai mis`), written and tested only where audible; `y` for a place (`J'y habite`, `On y va`) and `en` for a quantity (`J'en ai deux`, `Il y en a trois`, `Je n'en ai pas`); `où` as a relative (`le quartier où j'habite`); `il y a` vs. `être` for location; place adverbs `en haut`, `en bas`, `au milieu de`, `dessus`, `dessous`, `dedans`.
- **Lessons:**
  1. Je cherche un appartement
  2. Les pièces
  3. Le loyer
  4. Le déménagement
  5. Où est-ce que je le mets?
  6. Les voisins
- **Introduces:** poser, accrocher, louer, emménager, appartement, loyer, propriétaire, déménagement, cuisine, salon, bain, balcon, fenêtre, escalier, mur, placard, chaise, canapé, lampe, miroir, réfrigérateur, four, chauffage, meuble, voisin, quartier, pièce, dessus, dessous, dedans, haut, bas, milieu, meublé, lumière, bruyant, moderne, propre, sale

### 18. Cadeaux et fêtes -- `fr-a2-cadeaux`

- **Order:** 18.
- **Requires:** `fr-a2-logement`.
- **Grammar:** indirect object pronouns `me`, `te`, `lui`, `nous`, `vous`, `leur` before the verb (`Je lui ai offert un livre`, `Je leur téléphone`) and after an affirmative imperative (`Dis-lui`, `Donne-moi`, `Écris-leur`); verbs with `à` + person (`donner à`, `parler à`, `dire à`, `téléphoner à`, `demander à`, `répondre à`, `offrir à`); `plaire` with every person (`Ça lui plaît`, `Ça me plaît`; `aimer` is not inverted, `plaire` is); `offrir` (participle `offert`) and `remercier de/pour`; dates and birthdays (`Quelle est la date de ton anniversaire?`, `Mon anniversaire, c'est le quinze septembre`); wishes (`Joyeux anniversaire!`, `Bonne année!`, `Joyeux Noël!`, `Félicitations!`, `Bonne fête!`, `Bon appétit!`, `Bon voyage!`, `Santé!`); `Amusez-vous bien!`. `lui` is he and she, `son/sa/ses` are his and her: never contrast them in a distractor.
- **Lessons:**
  1. Joyeux anniversaire!
  2. Qu'est-ce que je lui offre?
  3. Elle adore les fleurs
  4. La fête
  5. Noël et le Nouvel An
  6. Merci pour le cadeau
- **Introduces:** offrir, célébrer, féliciter, félicitations, anniversaire, cadeau, invité, invitation, fleur, emballer, remercier, embrasser, câlin, bougie, trinquer, joyeux, heureux, spécial, utile, tradition, réveillon, souhaiter, amuser, ambiance, pâtisserie

### 19. Projets -- `fr-a2-projets`

- **Order:** 19.
- **Requires:** `fr-a2-cadeaux`.
- **Grammar:** the futur simple, regular and irregular (infinitive + `-ai, -as, -a, -ons, -ez, -ont`; `serai`, `aurai`, `irai`, `ferai`, `pourrai`, `viendrai`, `verrai`, `voudra`, `saurai`, `devrai`, `il faudra`, `il pleuvra`) for predictions and promises, against `aller` + infinitive for plans (module 11); real conditions with `si` + present and a present, future or imperative (`Si j'ai le temps, je voyagerai`, `S'il pleut, on reste à la maison`); `quand` + future (`Quand j'arriverai, je t'appellerai`: French uses the future where English and Dutch use the present); `dans` + duration; `espérer`, `prévoir`, `penser`, `compter` and `avoir l'intention de` + infinitive; `l'année prochaine`, `plus tard`, `un jour`. Future `-ai` and conditional or imparfait `-ais` differ only by `é`/`è`, so no distractor rests on that alone.
- **Lessons:**
  1. L'année prochaine
  2. Dans deux semaines
  3. Si j'ai le temps...
  4. Je pense étudier
  5. Peut-être
  6. Un grand projet
- **Introduces:** espérer, organiser, préparer, économiser, réaliser, profiter, prévoir, projet, objectif, avenir, intention, monde, possible, impossible, important, probablement, sûrement, si, futur

### 20. Mieux ou pire -- `fr-a2-comparer`

- **Order:** 20.
- **Requires:** `fr-a2-projets`.
- **Grammar:** comparatives with adjectives, adverbs, nouns and verbs (`plus grand que`, `moins cher que`, `aussi rapide que`, `plus de gens que`, `autant de bruit que`, `travailler plus que`); the superlative (`le plus grand`, `la plus belle ville de France`, `le moins cher`); irregular `bon` -> `meilleur`, `bien` -> `mieux`, `mauvais` -> `pire`; `de plus en plus`, `de moins en moins`, `trop de`, `assez de`; `même` (`la même chose`), `pareil`, `différent de`, `ressembler à`, `presque`, `sembler` + adjective; `ça vaut la peine`, `il vaut mieux` + infinitive.
- **Lessons:**
  1. Plus grand, plus petit
  2. Ville ou campagne?
  3. Le meilleur du monde
  4. Beaucoup trop cher!
  5. Pareil ou différent?
  6. Ça vaut la peine
- **Introduces:** autant, meilleur, pire, même, pareil, différent, différence, ressembler, sembler, presque, manière, exemple, normal, circulation, air, espace, rapide, lent, pratique, lourd, paresseux, juste, vide, valoir, peine, habitant

### 21. Pourriez-vous m'aider? -- `fr-a2-politesse`

- **Order:** 21.
- **Requires:** `fr-a2-comparer`.
- **Grammar:** the conditionnel for polite requests, wishes and advice (`Pourriez-vous...?`, `Est-ce que tu pourrais...?`, `J'aimerais...`, `Vous devriez...`, `Ça vous dérangerait de...?`; `je voudrais` is module 1); the imperative with `tu` (`Entre`, `Viens`, `Dis-moi`, `Assieds-toi`, `Vas-y`, with `-s` dropped from `-er` verbs) and `vous` (`Entrez`, `Dites-moi`, `Asseyez-vous`), with attached pronouns (`Dis-lui`, `Donnez-moi`), and negative (`Ne t'inquiète pas`, `N'oubliez pas`, `Ne quittez pas`); telephone chunks (`Allô`, `C'est de la part de qui?`, `Un instant, s'il vous plaît`, `Vous voulez laisser un message?`, `Vous vous êtes trompé de numéro`).
- **Lessons:**
  1. Pourriez-vous m'aider?
  2. J'aimerais...
  3. Au téléphone
  4. Entrez, asseyez-vous
  5. Un conseil
  6. Un problème
- **Introduces:** conseil, suggérer, problème, information, expliquer, déranger, inquiéter, attention, plainte, rembourser, réparer, permission, allô, instant, laisser, composer, tromper, éteindre, allumer, prier, appel, sonner, patienter, part

## B1

Modules 22 to 31 mirror the Spanish B1 themes and order. Ordering restrictions: no subjunctive before 25, no passive before 28, no `si` + imparfait or unreal `si` before 29, no backshifted reported speech before 30, and the subjunctive conjunctions (`pour que`, `avant que`, `bien que`, `sans que`, `à moins que`, `jusqu'à ce que`) come in 31. Before 25 the mood-neutral forms (`après avoir`, `avant de`, `pour` + infinitive) are used instead. The imperfect subjunctive and the passé simple are never used.

### 22. Imprévus en voyage -- `fr-b1-imprevus`

- **Order:** 22.
- **Requires:** `fr-a2-politesse`.
- **Grammar:** the plus-que-parfait (`j'avais réservé`, `l'avion était déjà parti`, `nous étions arrivés`) for what had already happened; `quand`, `dès que` + passé composé with the earlier event in the plus-que-parfait; `après avoir` / `après être` + participle and `avant de` + infinitive (no subjunctive yet); `pas encore`, `déjà`, `en fait`.
- **Lessons:**
  1. J'avais déjà réservé
  2. L'avion était déjà parti
  3. Ils ont perdu ma valise
  4. La grève
  5. Dès que nous avons atterri
  6. Quelle aventure!
- **Introduces:** compagnie, bagage, grève, douane, frontière, passager, embarquer, atterrir, décoller, escale, correspondance, annuler, réclamer, guichet, avertir, patience, aventure, pilote, terminal, indemnité, dès, retarder, embouteillage

### 23. Tu me le prêtes? -- `fr-b1-services`

- **Order:** 23.
- **Requires:** `fr-b1-imprevus`.
- **Grammar:** combined pronouns in the order `me/te/nous/vous` + `le/la/les` (`Tu me le prêtes?`, `Je te la rends`) and `le/la/les` + `lui/leur` (`Je le lui ai donné`), with `y` and `en` last (`Il m'en a donné`), and after an affirmative imperative (`Donne-le-moi`, `Rends-le-lui`) against `Ne me le donne pas`; `s'en aller`, `emmener` vs. `emporter`, `se débrouiller`, `s'occuper de`, `il ne reste plus de lait`; reciprocal `nous nous aidons`; possessive pronouns `le mien`, `la tienne`, `les siens`, `le nôtre`, `le vôtre`, `le leur`; `moi-même`, `toi-même`, `soi-même`; `propre` = own.
- **Lessons:**
  1. Tu me prêtes ta perceuse?
  2. Je te le rends demain
  3. Tu peux arroser mes plantes?
  4. Il n'y a plus de lait
  5. Je l'ai fait moi-même
  6. Compte sur moi
- **Introduces:** prêter, emprunter, promettre, promesse, confier, garder, emmener, arroser, ramasser, occuper, débrouiller, mien, tien, sien, nôtre, vôtre, perceuse, outil, plante, chargeur, parapluie, généreux

### 24. Je cherche un emploi -- `fr-b1-emploi`

- **Order:** 24.
- **Requires:** `fr-b1-services`.
- **Grammar:** `depuis` + present and `ça fait ... que` + present (`Ça fait trois mois que je cherche du travail`); `venir de`, `être sur le point de` + infinitive; `continuer à`, `arrêter de`, `recommencer à`, `finir par` + infinitive; the gérondif, `en` + `-ant` for simultaneity and manner (`J'ai appris en travaillant`, `En arrivant, j'ai téléphoné`), always with the same subject and always with `en`; `-ant` forms share the verb's lemma.
- **Lessons:**
  1. Ça fait des mois que je cherche
  2. Mon CV
  3. L'entretien
  4. Je suis sur le point de démissionner
  5. J'ai appris en travaillant
  6. Le premier jour
- **Introduces:** emploi, offre, candidature, entretien, expérience, compétence, formation, stage, embaucher, contrat, salaire, gagner, chômage, secteur, employé, licencier, démissionner, promotion, ambition, flexible, défi, faible, responsable, équipe, lettre, arrêter, recommencer, point

### 25. À mon avis -- `fr-b1-opinions`

- **Order:** 25.
- **Requires:** `fr-b1-emploi`.
- **Grammar:** `je pense/crois/trouve que` + indicative, `il me semble que`, `c'est clair que`, `à mon avis`, `selon`; the subjonctif présent after doubt and denial (`Je ne pense pas que...`, `Je doute que...`, `Ce n'est pas vrai que...`) and impersonal judgments (`Il est possible que...`, `Il est important que...`, `Il vaut mieux que...`, `Il faut que...`), regular (`que tu parles`, `que nous parlions`) and `soit`, `ait`, `aille`, `fasse`, `puisse`, `sache`, `veuille`, `vienne`, `prenne`; `être d'accord avec`, `avoir raison`, `avoir tort`, `dépendre de`; `pourtant`, `cependant`, `au contraire`, `plutôt`. Subjunctive forms share the verb's lemma.
- **Lessons:**
  1. Je pense que tu as raison
  2. Je ne pense pas que ce soit vrai
  3. Il est possible que...
  4. Je suis d'accord
  5. Ça dépend
  6. Mon point de vue
- **Introduces:** avis, opinion, doute, douter, convaincre, discuter, débat, argument, soutenir, critiquer, exagérer, juger, société, social, génération, solution, sujet, évident, faux, préjugé, contre, selon, dépendre, raison, tort, fait, réalité, certain, vue, majorité, pourtant, cependant, contraire, plutôt, clair

### 26. Sentiments -- `fr-b1-sentiments`

- **Order:** 26.
- **Requires:** `fr-b1-opinions`.
- **Grammar:** the subjonctif after wishes, requests and emotions (`Je veux que tu viennes`, `Je souhaite que...`, `Il faut que je parte`, `J'ai peur qu'il soit malade`, `Je suis content que tu sois là`, `Ça m'énerve que...`), against the infinitive when the subject is the same (`Je veux partir` / `Je veux que tu partes`); `espérer que` + indicative (`J'espère que tu viendras`); the subjonctif passé (`Je suis content que tu sois venu`, `Je suis désolé qu'il ait dit ça`); `manquer` (`Tu me manques`: the person missed is the subject); feelings with `être` + adjective and `se mettre en colère`, `se disputer`, `se réconcilier`, `s'entendre bien avec`.
- **Lessons:**
  1. J'espère que tu vas bien
  2. Je suis content que tu sois là
  3. Ça m'inquiète
  4. Disputes et réconciliations
  5. J'ai confiance en toi
  6. Je veux que tu le saches
- **Introduces:** sentiment, émotion, fâché, énerver, jaloux, déçu, fier, nerveux, inquiet, soulagé, stressé, ému, honte, colère, calme, humeur, amour, relation, dispute, disputer, réconcilier, pardonner, mentir, mensonge, manquer, détester, surprendre, confiance, ennuyer

### 27. Livres et films -- `fr-b1-livres`

- **Order:** 27.
- **Requires:** `fr-b1-sentiments`.
- **Grammar:** relative pronouns: `qui` (subject), `que` (object: `Le livre que je lis`), `où` (place and time: `le jour où`), `dont` (`Le film dont je t'ai parlé`), preposition + `qui` for people (`la fille avec qui j'ai voyagé`), preposition + `lequel/laquelle/lesquels/lesquelles` for things (`la ville dans laquelle se passe l'histoire`, `auquel`, `duquel`); `ce qui`, `ce que`, `ce dont`, `ce à quoi`; `celui qui`, `celle que`, `ceux qui`; `traiter de` (`De quoi parle ce livre?`); `quoi` only after a preposition.
- **Lessons:**
  1. Le livre que je lis
  2. L'amie dont je t'ai parlé
  3. La ville dans laquelle se passe l'histoire
  4. L'écrivain qui a gagné le prix
  5. Ce que j'ai préféré
  6. Une critique
- **Introduces:** dont, lequel, celui, quoi, personnage, héros, écrivain, auteur, genre, chapitre, page, intrigue, série, épisode, critique, scène, émouvant, passionnant, publier, sous-titre, version, original, succès, librairie, couverture, science, lecteur, public, roman, traiter, acteur, réalisateur, résumé, science-fiction

### 28. L'environnement -- `fr-b1-environnement`

- **Order:** 28.
- **Requires:** `fr-b1-livres`.
- **Grammar:** the passive with `être` + participle (`Le pont a été construit en 1990`, `La rue est fermée`, `Ces bouteilles seront recyclées`) mostly for written reports, with `par` or no agent; impersonal `on` and pronominal passive with `se` (`Ici, on trie le verre`, `Ça se vend partout`, `Ça ne se fait pas`); `il est interdit de`, `on ne peut pas fumer`; `être fait en/de` for material (`C'est fait en plastique`); `il faut` + infinitive for duty; `on dit que...`.
- **Lessons:**
  1. Ici, on trie le verre
  2. Trier les déchets
  3. Nous gaspillons trop
  4. C'est fait en plastique
  5. Il faut le protéger
  6. La planète
- **Introduces:** environnement, pollution, polluer, déchet, recycler, trier, jeter, séparer, plastique, papier, carton, poubelle, conteneur, énergie, réduire, gaspiller, durable, renouvelable, protéger, planète, loi, permettre, interdire, interdit, règle, citoyen, produire, panneau, solaire, électricité, respecter, détruire, construire, fumer, amende, ampoule, emballage, recyclage, robinet

### 29. Si j'avais le temps... -- `fr-b1-hypotheses`

- **Order:** 29.
- **Requires:** `fr-b1-environnement`.
- **Grammar:** `si` + imparfait + conditionnel présent (`Si j'avais le temps, je voyagerais`; conditional forms `serais`, `aurais`, `irais`, `ferais`, `pourrais`, `voudrais`, `viendrais`, `verrais`); `Et si on partait?`; `si` + plus-que-parfait + conditionnel passé (`Si j'avais su, je serais venu`), `j'aurais dû` and `j'aurais aimé` + infinitive; `comme si` + imparfait; `au cas où` + conditional; `million` and `milliard`. The imperfect subjunctive is never used.
- **Lessons:**
  1. Si j'avais le temps
  2. Si je gagnais à la loterie
  3. Et si on partait?
  4. J'aurais dû le faire
  5. Si j'avais su
  6. Mon rêve
- **Introduces:** loterie, million, milliard, imaginer, regretter, occasion, valeur, risque, île, entier, décision, parfait, idéal, erreur, destin, liberté, bonheur, cas, hypothèse, ailleurs, riche

### 30. Les actualités -- `fr-b1-actualites`

- **Order:** 30.
- **Requires:** `fr-b1-hypotheses`.
- **Grammar:** reported speech with the tense shift (`Il dit qu'il est fatigué` -> `Il a dit qu'il était fatigué`, `qu'il viendrait`, `qu'il était déjà parti`); indirect questions with `si` and question words (`Elle m'a demandé si j'étais prêt`, `où j'habitais`, `ce que je faisais`, `ce qui s'était passé`); reported requests with `demander de` / `dire de` + infinitive (`Il m'a demandé d'attendre`, `de ne pas partir`); `selon`, `d'après` + source.
- **Lessons:**
  1. Il a dit que...
  2. Elle m'a demandé si...
  3. Il a promis qu'il viendrait
  4. Le journal télévisé
  5. Une interview
  6. Sur les réseaux sociaux
- **Introduces:** reporter, actualités, article, titre, annoncer, déclarer, informer, assurer, confirmer, affirmer, nier, enquêter, élection, gouvernement, politique, président, maire, voter, partager, commentaire, source, délit, diffuser, interviewer, réseau, média, rumeur, ajouter, chaîne, ministre, présentateur, question, télévisé, vidéo

### 31. Vivre à l'étranger -- `fr-b1-etranger`

- **Order:** 31.
- **Requires:** `fr-b1-actualites`.
- **Grammar:** conjunctions that always take the subjonctif (`pour que`, `avant que`, `sans que`, `à moins que`, `bien que`, `jusqu'à ce que`) against those that take the indicative (`quand`, `dès que`, `pendant que`, `puisque`, `même si`); `malgré` + noun, `grâce à`, `à cause de`, `afin de` + infinitive; `donc`, `c'est pourquoi`, `par contre`; `s'habituer à`, `s'adapter à`, `avoir l'habitude de`.
- **Lessons:**
  1. Bien qu'il pleuve
  2. Malgré le climat
  3. Pour que tout le monde comprenne
  4. À moins que...
  5. Je me suis habitué
  6. Avantages et inconvénients
- **Introduces:** malgré, puisque, donc, grâce, cause, afin, habituer, adapter, culture, coutume, nostalgie, émigrer, immigré, accent, avantage, inconvénient, qualité, système, rythme, nationalité, mentalité, intégration

## Optional modules

Optional French modules are not planned yet. When they are, they follow the Spanish optional list and `docs/curriculum.md`: each requires the main module that supplies its vocabulary, and no main module requires one.

## Open code questions

Nothing below has been changed; each is a small `shared/` change or a policy decision for the owner.

- **`œ` vs. `oe`.** `baseKey` (NFD, strip marks) does not decompose `œ`, so a learner typing `soeur` for `sœur` or `oeuf` for `œuf` gets a spelling error, not an accent slip. Proposal: in `shared/equivalents.ts` add a `fr` rule that maps `œ`/`Œ` to `oe`/`Oe` in both the typed answer and the accepted answers (like `euro()`), so it is graded as the same word. Until then, units with `œ` list the `oe` spelling in `variants` (which is graded as a whole-sentence alternative).
- **Hyphenated words typed with a space.** `peut être`, `vingt deux`, `est ce que`, `grand mère` are two tokens against one, so they fail (and in slots mode the extra token cannot be typed). English solves this with `-` -> space in `english()`. Proposal: a `fr` rule replacing a hyphen between letters with a space in both texts, so free-text answers compare equal. This would also make enclitic spelling (`donnez-moi` vs `donnez moi`) lenient; whether that is wanted is a product decision.
- **`euro()` gives `euro` where French writes `euros`.** For `fr` it maps `20 €` to `20 euro`, but the text says `vingt euros`. Authors can put both `20 euros` and `20 euro` in `variants` as a workaround; the cleaner fix is a `fr` variant of `euro()` that maps `€`, `euro` and `euros` to one form (invariable in the grader, like Italian).
- **Spacing before `?`, `!`, `:`, `;`.** No change needed: the grader ignores whitespace between marks and words, and both `Ça va?` and `Ça va ?` are accepted. If the display ever adds French typography, the space must be a non-breaking space so a mark never wraps to the next line; the plan stays with no space in `text`.
- **Elided words are not tracked.** The loader checks only the host lemma of `j'ai`, `l'eau`, `n'est`, so it cannot enforce that `je`, `le`, `ne`, `me` are available; the plan rule above is manual. A check that splits a token on its first apostrophe and requires the elided word's lemma is possible but unwanted for `aujourd'hui`, `presqu'île` and `quelqu'un`.
- **Accent-only homophone pairs pass silently as accent slips** (`a` for `à`, `ou` for `où`, `la` for `là`, `sur` for `sûr`). That is the existing grader behavior for every language; for French it means the app does not test those grammar distinctions by spelling alone. Accepted for A1.
- **`LANGUAGE_LOCALES` has no `fr` entry** (French UI does not exist), so a French learner has no French-language fallback; nothing to do until a French UI is planned.
