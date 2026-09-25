# Dutch curriculum plan

The Dutch instance of [curriculum.md](curriculum.md): standard Netherlands Dutch (Dutch settings: euros, the OV-chipkaart, the huisarts, Sinterklaas and Koningsdag) for learners whose support language is English (`en`) or Latin American Spanish (`es-419`). Each module lists its course id, its requirements, its grammar focus, its six lessons, and the lemmas it `introduces`. A module may use its own lemmas plus every lemma introduced by the modules it requires, transitively. For main modules, that means every earlier main module.

The lemma lists are the core-vocabulary plan and decide ordering. A module author may add up to about 10 extra lemmas when natural sentences need them, but only lemmas that no module in this plan lists. Optional modules may also introduce lemmas that a later main module lists, because main modules never require them.

## Support languages

Every localized field carries exactly `en` and `es-419` (`SUPPORT_LOCALES.nl`). A learner whose UI is Dutch or Italian falls back to `en`.

- **Translations** are natural English and Spanish, not word-for-word: `Ik wil graag een koffie.` -> `I'd like a coffee.` / `Quisiera un café.`. English is American; Spanish is neutral Latin American (`ustedes`, `celular`, `jugo`), and Spanish questions and exclamations take `¿` and `¡`. Translate `u` as `usted`, `jij/je` as `tú`, `jullie` as `ustedes`.
- **Distractors** follow [curriculum.md](curriculum.md) in each language separately. English `you` covers `jij`, `u` and `jullie`, so never contrast on those; in Spanish, never let a distractor differ from the answer only in `tú`/`usted`. A sentence's options all end in `.`, `!` or `?`, and a word's, phrase's or chunk's never do.
- **Glosses** are short: the meaning, then the article for nouns (`huis (het)`, `tafel (de)`), then what trips up an English or Spanish speaker, flagged `watch out:` / `¡ojo!`. That covers false friends (`slim` = smart, `bellen` = to call, `wil` = want, not will, `eventueel` = possibly, `door` = through, `kind` = child, `actueel` = current; for Spanish `carpeta`-style traps such as `bank` = sofa or bank, `winkel` = store), clock time (`half drie` = 2:30), numbers read units first (`eenentwintig` = one-and-twenty), and structures that differ (`Ik ben dertig`, with `zijn` where Spanish uses `tener`; `Ik heb honger`, with `hebben` where English uses `be`).
- **grammarFocus** labels are in each support language and may quote Dutch (`verb second: Morgen ga ik...` / `verbo en segundo lugar: Morgen ga ik...`).

## Lemma conventions

- **Nouns:** the singular (`kinderen` -> `kind`, `foto's` -> `foto`, `ideeën` -> `idee`). A diminutive is its own lemma (`broodje`, `meisje`, `biertje`, `kopje`), because many are lexicalized. Closed compounds are one word and one lemma (`treinkaartje`, `hoofdpijn`); hyphenated words are one token and one lemma (`ov-chipkaart`, `e-mail`).
- **Verbs:** the infinitive. Every form shares one lemma (`ben`, `is`, `was`, `geweest` -> `zijn`; `zou` -> `zullen`; `kon` -> `kunnen`). A reflexive verb shares the plain verb's lemma (`zich voelen` -> `voelen`); `zich` is its own lemma, and `me`, `je`, `ons` used reflexively keep their pronoun lemmas.
- **Separable verbs** are their own lemma (`opstaan`, `meenemen`, `afspreken`). When the verb is written as one word (`opstaan`, `opgestaan`, `op te staan`: the last is three tokens, `op` + `te` + `staan`, so avoid it before module 9) the token takes the separable lemma. When it splits (`Ik sta om zeven uur op`), the finite part takes the separable lemma (`sta` -> `opstaan`, gloss `sta ... op = get up`) and the particle takes the particle's own lemma (`op`), with a sense key when the module also uses it as a preposition and the gloss differs (`op#part`). A module that introduces a separable verb must also have its particle available.
- **Adjectives:** the base form; inflected and regular comparative and superlative forms share it (`grote`, `groter`, `grootst` -> `groot`). `beter`, `best`, `meer`, `meest`, `minder`, `minst`, `liever`, `liefst` are their own lemmas. Participles used as adjectives use the adjective (`getrouwd`, `gesloten`).
- **Articles and determiners:** `de`, `het`, `een` and `één` (the numeral) are separate lemmas. `het` the article and `het` the pronoun share the lemma `het`, with the key `het#pron` for the pronoun. `deze`, `dit`, `die`, `dat` are separate lemmas; relative `die`/`dat` share them (`die#rel`, `dat#conj` for the conjunction).
- **Pronouns:** every form is its own lemma (`ik mij me mijn`, `jij je jou jouw`, `u uw`, `hij hem`, `zij ze haar`, `wij we ons onze`, `jullie`, `hun hen`). `onze` -> `ons`. A surface with two jobs keeps one lemma and uses sense keys when the glosses differ (`je` subject, object, possessive; `ze` she or they; `haar` her or hair -> `haar#noun`; `zijn` to be or his -> `zijn#poss`; `ons` us or 100 grams -> `ons#noun`).
- **Homographs** share one lemma string, and the first module that uses either meaning introduces it; sense keys separate the glosses (`meer` more and `meer#noun` lake; `arm#noun` arm and `arm` poor; `bank` bank and `bank#sofa`; `waar` where and `waar#adj` true; `als` as, `als#if` if and `als#than`; `weer` again and `weer#noun` weather; `morgen` tomorrow and `morgen#noun` morning; `dag` hello and `dag#noun` day; `kaart` card, `kaart#menu`, `kaart#map`).
- **Pronominal adverbs** written as one word are one lemma each (`daarom`, `waarom`, `ervan`, `erop`, `daarmee`, `waarover`). Split ones are separate tokens (`er ... mee` -> `er` + `mee`). `er` is one lemma for all four uses.
- **Apostrophes:** `'s` in `'s ochtends`, `'s middags`, `'s avonds`, `'s nachts`, `'s morgens` is its own token and lemma (`'s`, DET, gloss: old genitive, `'s avonds` = in the evening); the next word takes the noun's lemma (`avonds` -> `avond`). `zo'n` is one token and its own lemma. Apostrophe plurals are one token (`foto's`, `menu's`, `auto's`). Never use informal `'t`, `m'n`, `z'n`, `'n`: write `het`, `mijn`, `zijn`, `een`.
- **Numbers:** each numeral is its own lemma, and compound numerals are one word (`eenentwintig`, `tweeënveertig`); a module introduces the compounds it first uses. Numbers are words in the text with digit variants (`drie euro` -> `3 euro`).
- **Days and months** are lowercase in Dutch and are lemmas (`maandag`, `januari`). **Nationalities and languages** are capitalized (`Nederlands`, `Spaans`), capitalized in the lemma and lowercase as lexicon keys.
- **Proper nouns** (`PROPN`: people, cities, countries, holidays such as `Sinterklaas`, `Koningsdag`, `Kerstmis`) are never introduced and may appear anywhere.
- **Diacritics** are part of the spelling (`één`, `café`, `ideeën`, `België`, `geïnteresseerd`); the grader treats a missing accent as an accent slip, not an error.

## A1

### 1. In het café -- `nl-a1-cafe`

- **Requires:** nothing.
- **Grammar:** `ik wil graag` + noun; `mag ik ... (hebben)?` and `kan ik pinnen?` as chunks; `een` vs. `één`; `de` and `het`; `geen` + noun; `hoeveel kost het?`; numbers one to five; `alstublieft` vs. `alsjeblieft`.
- **Lessons:**
  1. Een koffie, alstublieft
  2. Wat kost het?
  3. Iets te drinken
  4. Warm of koud?
  5. Hier of meenemen?
  6. Pinnen of contant?
- **Introduces:** hoi, ja, nee, sorry, pardon, alstublieft, alsjeblieft, dank, bedankt, je, wel, graag, oké, ik, u, willen, mogen, kunnen, hebben, nemen, krijgen, zijn, betalen, pinnen, drinken, meenemen, een, de, het, één, twee, drie, vier, vijf, en, of, met, zonder, voor, van, te, ook, nog, iets, niets, geen, anders, alles, hoeveel, kosten, wat, dat, mij, hier, euro, cent, rekening, kaart, contant, koffie, thee, melk, suiker, water, sap, sinaasappel, appel, taart, appeltaart, broodje, kaas, koekje, bier, wijn, glas, fles, kopje, munt, warm, koud, klein, groot, vers, lekker

### 2. Hallo! -- `nl-a1-hallo`

- **Requires:** `nl-a1-cafe`.
- **Grammar:** `zijn` in the singular (`ik ben`, `jij bent`, `u bent`, `hij/zij is`); `heten`; `niet` and its position; yes/no questions by inversion (`Ben jij Anna?`), with the `-t` dropped after `jij` (`Kom jij uit Spanje?`); `komen uit` + country; nationalities and languages, capitalized; `jij` vs. `u`; classroom chunks (`Ik begrijp het niet`, `Kunt u dat herhalen?`, `Hoe schrijf je dat?`, `Wat betekent...?`).
- **Lessons:**
  1. Hallo!
  2. Hoe heet je?
  3. Waar kom je vandaan?
  4. Goedemorgen, mevrouw De Vries
  5. Ik begrijp het niet
  6. Dit is mijn vriend
- **Introduces:** hallo, dag, doei, goedemorgen, goedemiddag, goedenavond, welterusten, tot, straks, ziens, aangenaam, kennismaken, heten, naam, achternaam, mijn, jouw, uw, jij, hij, zij, ze, dit, die, wie, waar, vandaan, uit, komen, wonen, in, gaan, hoe, goed, prima, heel, erg, zo, niet, maar, dus, vriend, vriendin, meneer, mevrouw, land, stad, Nederlands, Engels, Spaans, Italiaans, Duits, Frans, Mexicaans, Amerikaans, Colombiaans, Argentijns, Belgisch, Nederlander, spreken, begrijpen, herhalen, schrijven, zeggen, betekenen, langzaam, woord, beetje, keer

### 3. Getallen en tijd -- `nl-a1-getallen`

- **Requires:** `nl-a1-hallo`.
- **Grammar:** `hebben` in the singular; numbers to 100, units first (`eenentwintig`, `vierendertig`); age with `zijn` (`Ik ben dertig (jaar)`, Spanish `tener`); `Hoe laat is het?`, `Het is drie uur`, `half vier` (= 3:30), `kwart over`, `kwart voor`, `tien over half`; `om` + clock time, `op` + day; `welk/welke`.
- **Lessons:**
  1. Van nul tot twintig
  2. Hoe oud ben je?
  3. Je telefoonnummer
  4. Hoe laat is het?
  5. Hoe laat gaat de winkel open?
  6. De dagen van de week
- **Introduces:** nul, zes, zeven, acht, negen, tien, elf, twaalf, dertien, veertien, vijftien, zestien, zeventien, achttien, negentien, twintig, dertig, veertig, vijftig, zestig, zeventig, tachtig, negentig, honderd, oud, jaar, tijd, laat, uur, half, kwart, over, om, op, minuut, week, vandaag, morgen, ochtend, middag, avond, nacht, maandag, dinsdag, woensdag, donderdag, vrijdag, zaterdag, zondag, nummer, telefoonnummer, telefoon, mobiel, open, dicht, opengaan, sluiten, winkel, nu, vroeg, precies, ongeveer, welk, weekend

### 4. De familie -- `nl-a1-familie`

- **Requires:** `nl-a1-getallen`.
- **Grammar:** plurals in `-en` and `-s` (and `kinderen`); the adjective `-e` (`de grote broer`, `een groot huis`, never `-e` after `een` + `het` noun); possessives `zijn`, `haar`, `ons/onze`, `jullie`, `hun`; full `zijn` and `hebben`; object pronouns `hem`, `haar`, `ons`, `hen/hun`; `Hoe ziet hij eruit?` as a chunk.
- **Lessons:**
  1. Mijn familie
  2. Broers en zussen
  3. Hoe is ze?
  4. Lang of klein?
  5. Opa en oma
  6. Een grote familie
- **Introduces:** familie, gezin, vader, moeder, papa, mama, ouder, zoon, dochter, broer, zus, broertje, zusje, man, vrouw, opa, oma, grootouder, oom, tante, neef, nicht, kind, baby, jongen, meisje, persoon, mens, kennen, wij, we, jullie, hem, haar, ons, hun, hen, getrouwd, gescheiden, vriendje, lang, jong, mooi, knap, aardig, grappig, lief, blauw, bruin, blond, donker, kort, oog, hond, kat, enig, alleen, huis, allebei, samen, eruitzien, eruit

### 5. Werk en studie -- `nl-a1-werk`

- **Requires:** `nl-a1-familie`.
- **Grammar:** the present tense of regular verbs for every person (stem, stem + `t`, infinitive), with the spelling rules (`werken` -> `werk`, `lopen` -> `loop`, `leven` -> `leef`) and no `-t` after inverted `jij`; `werken als` + job, with no article; `bij` + employer, `op` + school or office; `al` + present for duration (`Ik werk hier al twee jaar`, Spanish `hace dos años que`).
- **Lessons:**
  1. Wat doe je?
  2. Waar werk je?
  3. Ik leer Nederlands
  4. Talen
  5. Een nieuwe baan
  6. Collega's
- **Introduces:** werken, studeren, leren, lesgeven, doen, werk, baan, beroep, student, leraar, docent, arts, verpleegkundige, ingenieur, advocaat, ober, kok, kassière, architect, schoonmaker, gepensioneerd, collega, baas, kantoor, school, universiteit, ziekenhuis, bedrijf, fabriek, bank, taal, cursus, les, examen, moeilijk, makkelijk, interessant, saai, blij, nieuw, druk, Chinees, Japans, Portugees, Turks, Arabisch, als, bij, al, veel

### 6. Mijn dag -- `nl-a1-dag`

- **Requires:** `nl-a1-werk`.
- **Grammar:** separable verbs (`opstaan`: `Ik sta om zeven uur op`); reflexive verbs (`zich aankleden`, `zich haasten`); verb second: a time phrase first inverts subject and verb (`Om acht uur ga ik naar mijn werk`); frequency adverbs (`altijd`, `vaak`, `nooit`); `'s ochtends`, `'s middags`, `'s avonds`.
- **Lessons:**
  1. 's Ochtends
  2. Ik sta vroeg op
  3. Lunchtijd
  4. 's Middags
  5. 's Avonds
  6. Altijd, vaak, nooit
- **Introduces:** opstaan, wakker, worden, douchen, aankleden, haasten, zich, poetsen, tand, ontbijten, ontbijt, lunch, lunchen, avondeten, eten, koken, slapen, lezen, kijken, tv, boek, krant, nieuws, weggaan, naar, thuis, bed, beginnen, stoppen, klaar, eerst, dan, daarna, later, altijd, meestal, vaak, soms, nooit, elk, rond, terug, moe, rustig, ontspannen, 's, fietsen, fiets, maken

### 7. In de stad -- `nl-a1-stad`

- **Requires:** `nl-a1-dag`.
- **Grammar:** `er is / er zijn` and `Is er ...?`; the imperative (`Ga rechtdoor`, `Sla linksaf`); `moeten` + infinitive at the end; `gaan` and `komen` in full; `Weet u waar het station is?` as a chunk, with the verb at the end; place prepositions (`naast`, `tegenover`, `tussen`, `achter`, `aan de linkerkant`); ordinals (`de tweede straat rechts`).
- **Lessons:**
  1. Waar is het station?
  2. Is er een apotheek in de buurt?
  3. Links en rechts
  4. Met de bus of lopend?
  5. Ik moet overstappen
  6. Het centrum
- **Introduces:** moeten, weten, zoeken, vinden, lopen, rijden, afslaan, oversteken, overstappen, er, daar, links, rechts, linksaf, rechtsaf, rechtdoor, dichtbij, ver, naast, tegenover, tussen, achter, aan, kant, buurt, hoek, stoplicht, kruispunt, straat, plein, centrum, station, halte, bus, tram, metro, trein, taxi, voet, auto, apotheek, supermarkt, museum, kerk, park, bibliotheek, plek, eerste, tweede, derde, duizend, weg, kilometer, meter, kwijt, lopend, zien, wachten

### 8. In het restaurant -- `nl-a1-restaurant`

- **Requires:** `nl-a1-stad`.
- **Grammar:** `houden van` + noun and `graag` + verb (`Ik eet graag vis`); `lusten` (`Ik lust geen vis`); `niet` vs. `geen` in full; `honger` and `dorst` with `hebben` (English `be`); `Ik neem...` and `Wat raadt u aan?`; `apart betalen`.
- **Lessons:**
  1. Een tafel voor twee
  2. De kaart
  3. Voorgerecht en hoofdgerecht
  4. Lekker of niet lekker?
  5. Ik heb honger
  6. Het toetje en de rekening
- **Introduces:** houden, lusten, bestellen, reserveren, aanraden, brengen, tafel, menu, gerecht, voorgerecht, hoofdgerecht, nagerecht, toetje, pasta, pizza, rijst, vlees, vis, kip, groente, salade, aardappel, friet, tomaat, brood, olie, zout, peper, fruit, ijs, soep, bord, stuk, heerlijk, vies, pittig, vegetarisch, honger, dorst, sommige, genoeg, apart, fooi, zitten, restaurant

### 9. Vrije tijd -- `nl-a1-vrije-tijd`

- **Requires:** `nl-a1-restaurant`.
- **Grammar:** `kunnen` and `willen` in full; `graag`, `liever`, `het liefst`; `spelen` + instrument or game with no article (`Ik speel gitaar`) and sport verbs (`Ik voetbal`, `Ik zwem`); invitations (`Zullen we...?`, `Heb je zin om te...?`, `Kom je ook?`) and answers (`Leuk!`, `Helaas kan ik niet`); `om te` + infinitive; `omdat` + a short clause with the verb at the end, as a chunk, against `want` with main-clause order; question words `waarom`, `wanneer`, `met wie`.
- **Lessons:**
  1. Wat doe je in je vrije tijd?
  2. Speel je voetbal?
  3. Muziek
  4. Heb je zin om mee te gaan?
  5. Helaas, ik kan niet
  6. Het weekend
- **Introduces:** vrij, spelen, luisteren, dansen, zingen, zwemmen, hardlopen, wandelen, reizen, uitnodigen, sporten, sport, voetbal, voetballen, tennis, muziek, gitaar, piano, liedje, film, concert, theater, bioscoop, feest, zwembad, sportschool, waarom, omdat, wanneer, idee, helaas, misschien, leuk, zin, zullen, liever, liefst, hobby, favoriet, echt, vanavond, uitgaan, spel, afspreken, afspraak, mee, meegaan, want

### 10. Winkelen -- `nl-a1-winkelen`

- **Requires:** `nl-a1-vrije-tijd`.
- **Grammar:** `deze/die` with `de` nouns and `dit/dat` with `het` nouns; colors as adjectives with the `-e` ending (`een rode jas`, `een rood shirt`); quantities (`een kilo`, `een pond`, `een ons`, `een zak`); `hoeveel kost/kosten`; `passen` and `staan` (`Mag ik het passen?`, `Het staat je goed`).
- **Lessons:**
  1. Op de markt
  2. Een pond tomaten
  3. Welke kleur?
  4. Welke maat?
  5. Mag ik het passen?
  6. Bij de kassa
- **Introduces:** kopen, verkopen, passen, uitgeven, dragen, staan, deze, kleur, zwart, wit, rood, groen, geel, grijs, roze, paars, oranje, maat, shirt, t-shirt, broek, spijkerbroek, rok, jurk, jas, trui, schoen, tas, paskamer, markt, kassa, bonnetje, uitverkoop, korting, aanbieding, prijs, duur, goedkoop, strak, wijd, kilo, pond, gram, zak, ei, banaan, geld, weinig, tasje, helpen

### 11. Op reis -- `nl-a1-reizen`

- **Requires:** `nl-a1-winkelen`.
- **Grammar:** `gaan` + infinitive and the present for future plans (`Morgen ga ik naar Utrecht`); dates (`op drie mei`) and months, lowercase; weather (`Het regent`, `Het is mooi weer`, `Wat voor weer is het?`); `volgend` and `vorig`; `vertrekken` and `aankomen` (separable) with times.
- **Lessons:**
  1. Een kaartje naar Utrecht
  2. De trein heeft vertraging
  3. In het hotel
  4. Wat voor weer is het?
  5. De seizoenen
  6. Op vakantie
- **Introduces:** reis, vakantie, toerist, aankomen, vertrekken, bezoeken, blijven, inchecken, uitchecken, boeken, kaartje, ov-chipkaart, enkele, retour, vliegtuig, vliegveld, perron, spoor, vertraging, koffer, paspoort, hotel, kamer, sleutel, lift, strand, zee, berg, meer, zon, zonnig, regen, regenen, sneeuw, sneeuwen, wind, bewolkt, graad, weer, seizoen, lente, zomer, herfst, winter, maand, januari, februari, maart, april, mei, juni, juli, augustus, september, oktober, november, december, volgend, vorig

## A2

### 12. Vorig weekend -- `nl-a2-weekend`

- **Requires:** `nl-a1-reizen`.
- **Grammar:** the perfect with `hebben`: `ge-` + stem + `-t` or `-d` (the 't kofschip rule), and common irregular participles (`gegeten`, `gedronken`, `gezien`, `gedaan`, `gehad`, `genomen`, `gekocht`, `gebracht`, `gedacht`, `gevonden`, `geschreven`, `gelezen`); the participle at the end; `gisteren`, `geleden`, `al`, `nog niet`, `net`.
- **Lessons:**
  1. Wat heb je gisteren gedaan?
  2. We hebben buiten de deur gegeten
  3. Een week geleden
  4. Heb je al...?
  5. Ik ben mijn sleutels kwijt
  6. Mijn weekend
- **Introduces:** gisteren, geleden, net, eindelijk, verliezen, kwijtraken, vergeten, schoonmaken, wassen, boodschappen, bericht, appen, bellen, vertellen, vragen, antwoorden, horen, besluiten, kiezen, iemand, niemand, foto, sturen, gezellig, deur, buiten, denken

### 13. Mijn verhaal -- `nl-a2-verhaal`

- **Requires:** `nl-a2-weekend`.
- **Grammar:** the perfect with `zijn` (motion to a place and change of state: `gaan`, `komen`, `worden`, `blijven`, `vertrekken`, `verhuizen`, `geboren`); `Ik heb gefietst` vs. `Ik ben naar huis gefietst`; life-event verbs; `ooit` and `nog nooit` for experience.
- **Lessons:**
  1. Ik ben naar Amsterdam gegaan
  2. We zijn laat aangekomen
  3. Ik ben geboren in...
  4. Ik ben verhuisd
  5. We zijn getrouwd
  6. Mijn leven
- **Introduces:** geboren, overlijden, opgroeien, verhuizen, trouwen, afstuderen, verliefd, leven, verhaal, bruiloft, middelbaar, buitenland, noorden, zuiden, oosten, westen, provincie, leeftijd, tijdens, verdrietig, ooit, vallen, halen

### 14. Toen ik klein was -- `nl-a2-jeugd`

- **Requires:** `nl-a2-verhaal`.
- **Grammar:** the simple past (imperfectum): regular `-te/-ten` and `-de/-den`, and `was/waren`, `had/hadden`, `ging`, `kwam`, `deed`, `zag`; past habits (`vroeger`, `elke zomer`, `altijd`); `toen` + clause with the verb at the end (`Toen ik klein was, ...`), and the inversion after it; `zich herinneren`.
- **Lessons:**
  1. Toen ik klein was
  2. We speelden buiten
  3. Elke zomer
  4. Op school
  5. Ik was bang
  6. Ik herinner me
- **Introduces:** jeugd, vroeger, toen, herinneren, platteland, boerderij, speelgoed, pop, bal, boom, tuin, klasgenoot, juf, meester, bang, huilen, lachen, dier, droom, dromen, verlegen, tekenen, geloven, huiswerk, gebruiken

### 15. Wat is er gebeurd? -- `nl-a2-gebeurd`

- **Requires:** `nl-a2-jeugd`.
- **Grammar:** the simple past for the story and the perfect for the news of it; subordinate clauses with the verb at the end after `terwijl`, `toen` and `voordat`; story markers (`opeens`, `gelukkig`, `eerst`, `uiteindelijk`).
- **Lessons:**
  1. Terwijl ik liep...
  2. Opeens
  3. Mijn fiets is gestolen
  4. Een ongeluk
  5. Gelukkig
  6. Een vreemde dag
- **Introduces:** gebeuren, terwijl, opeens, plotseling, moment, breken, stelen, portemonnee, politie, ongeluk, lawaai, schreeuwen, merken, botsen, gelukkig, geluk, pech, vreemd, raar, gevaarlijk, uiteindelijk, einde, slot, voordat, door

### 16. Bij de dokter -- `nl-a2-dokter`

- **Requires:** `nl-a2-gebeurd`.
- **Grammar:** `zich voelen` + adjective; `Ik heb pijn aan...`, `Mijn hoofd doet pijn` (Spanish `me duele`); `moeten` and `niet mogen` for advice and rules; `Hoe lang heb je dat al?` with `al` and `sinds`; dosage chunks (`twee keer per dag`, `na het eten`).
- **Lessons:**
  1. Ik voel me niet goed
  2. Mijn hoofd doet pijn
  3. Bij de huisarts
  4. Ik heb koorts
  5. Bij de apotheek
  6. Het gaat beter
- **Introduces:** gezondheid, ziek, beter, voelen, pijn, koorts, hoest, verkouden, griep, hoofd, hoofdpijn, keel, buik, rug, arm, been, hand, oor, neus, mond, lichaam, medicijn, pil, recept, huisarts, maaltijd, rusten, ademen, allergisch, temperatuur, ernstig, sterk, spoed, nodig, sinds, per, na, beterschap, dokter

### 17. Het nieuwe huis -- `nl-a2-huis`

- **Requires:** `nl-a2-dokter`.
- **Grammar:** object pronouns for things: `hem` for a `de` word, `het` for a `het` word, `ze` for plurals; `er` with numbers (`Ik heb er twee`); positional verbs `staan`, `liggen`, `zitten`, `hangen` and placing verbs `zetten`, `leggen`, `hangen`; place prepositions (`boven`, `onder`, `binnen`, `in het midden van`).
- **Lessons:**
  1. Ik zoek een appartement
  2. De kamers
  3. De huur
  4. De verhuizing
  5. Waar zet ik het neer?
  6. De buren
- **Introduces:** appartement, woning, huur, huren, verhuurder, verhuizing, badkamer, slaapkamer, keuken, woonkamer, balkon, raam, trap, kast, stoel, lamp, spiegel, koelkast, oven, verwarming, buurman, buurvrouw, buur, wijk, boven, onder, binnen, midden, gemeubileerd, licht, lawaaierig, comfortabel, modern, schoon, doos, meubel, inclusief, vloer, muur, verdieping, zetten, leggen, hangen, liggen, neer

### 18. Cadeaus en feesten -- `nl-a2-feest`

- **Requires:** `nl-a2-huis`.
- **Grammar:** two objects (`Ik geef haar een boek`, `Ik geef het aan haar`); `iemand feliciteren met` and the Dutch custom of congratulating the whole family (`Gefeliciteerd met je moeder!`); `jarig zijn`; dates with `op` (`op vijf december`); wishes and answers (`Proost!`, `Fijne feestdagen!`, `Gelukkig nieuwjaar!`).
- **Lessons:**
  1. Gefeliciteerd!
  2. Wat geef ik hem?
  3. Ze houdt van bloemen
  4. Het feest
  5. Sinterklaas en oud en nieuw
  6. Bedankt voor het cadeau
- **Introduces:** cadeau, cadeautje, geven, vieren, feliciteren, gefeliciteerd, wensen, kaars, gast, verjaardag, jarig, bloem, chocola, verrassing, aanbieden, datum, proost, schattig, handig, fijn, traditie, uitnodiging, feestdag, nieuwjaar, oliebol, inpakken, visite, cake

### 19. Plannen -- `nl-a2-plannen`

- **Requires:** `nl-a2-feest`.
- **Grammar:** the future with `gaan` + infinitive and with `zullen` (promises and predictions); real conditions with `als` + present (`Als ik tijd heb, ga ik...`), with the inversion in the main clause; `over` + time (`over twee weken`); `van plan zijn om te`, `hopen te`, `proberen te`.
- **Lessons:**
  1. Volgend jaar
  2. Over twee weken
  3. Als ik tijd heb...
  4. Ik ben van plan om...
  5. Misschien
  6. Een groot plan
- **Introduces:** hopen, plan, plannen, toekomst, waarschijnlijk, zeker, organiseren, voorbereiden, sparen, doel, wereld, mogelijk, belangrijk, binnenkort, proberen, veranderen, vast

### 20. Beter of slechter -- `nl-a2-vergelijken`

- **Requires:** `nl-a2-plannen`.
- **Grammar:** comparatives in `-er` (`-der` after `r`: `duurder`) with `dan`; `even ... als`, `(net) zo ... als`; superlatives (`het grootst`, `de grootste`); irregular `goed/beter/best`, `veel/meer/meest`, `weinig/minder/minst`, `graag/liever/liefst`; `te` + adjective and `genoeg` after it.
- **Lessons:**
  1. Groter en kleiner
  2. Stad of platteland?
  3. De beste
  4. Hartstikke mooi!
  5. Hetzelfde of anders?
  6. Beter zo
- **Introduces:** even, best, slecht, meest, minder, minst, verkeer, lucht, ruimte, service, snel, praktisch, zwaar, slim, lui, verschil, hetzelfde, zelfde, verschillend, gelijk, klimaat, lijken, bijna, plaats, eerlijk, veilig, hartstikke, vol

### 21. Beleefd -- `nl-a2-beleefd`

- **Requires:** `nl-a2-vergelijken`.
- **Grammar:** `zou/zouden` for polite requests and wishes (`Zou u mij kunnen helpen?`, `Ik zou graag...`); `Kunt u...?` / `Kun je...?`; the softening particles `even`, `maar`, `eens`, `toch` (`Kun je even helpen?`, `Kom maar binnen`); the imperative with `u` (`Gaat u zitten`, `Neemt u plaats`); telephone chunks (`Met Anna de Vries`, `Kunt u mij doorverbinden?`, `Blijft u even aan de lijn`).
- **Lessons:**
  1. Zou u mij kunnen helpen?
  2. Ik zou graag...
  3. Aan de telefoon
  4. Gaat u zitten
  5. Een advies
  6. Een probleem
- **Introduces:** eens, toch, lijn, verkeerd, probleem, advies, adviseren, voorstellen, vraag, informatie, uitleggen, storen, zorg, voorzichtig, aandacht, klacht, terugbrengen, terugkrijgen, excuus, repareren, doorverbinden, terugbellen, achterlaten, momentje, natuurlijk, gerust

## B1

B1 sentences run longer (up to about 16 words) and chain clauses, but each lesson still builds them from words, phrases and chunks. A B1 module never uses grammar that a later module introduces: no passive before module 28, no unreal conditionals with `zou` + past before module 29, no backshifted reported speech before module 30. Where Spanish needs the subjunctive (modules 25, 26, 29, 31), the Spanish grammarFocus and glosses point out that Dutch uses an ordinary verb-final clause.

### 22. Reisproblemen -- `nl-b1-reisproblemen`

- **Requires:** `nl-a2-beleefd`.
- **Grammar:** the past perfect (`Ik had al geboekt`, `Het vliegtuig was al vertrokken`); `nadat`, `zodra` and `toen` with an earlier event, verb at the end; `het bleek dat...`; `uiteindelijk` + result.
- **Lessons:**
  1. Ik had al geboekt
  2. Het vliegtuig was al vertrokken
  3. Mijn bagage is zoek
  4. De staking
  5. Zodra ik geland was
  6. Wat een avontuur!
- **Introduces:** missen, luchtvaartmaatschappij, bagage, zoek, staking, staken, verzekering, huurauto, douane, grens, passagier, instappen, landen, vlucht, overstap, vertraagd, annuleren, geannuleerd, waarschuwen, geduld, avontuur, rugzak, schadevergoeding, piloot, terminal, zodra, nadat, blijken, inmiddels

### 23. Kun je me helpen? -- `nl-b1-gunsten`

- **Requires:** `nl-b1-reisproblemen`.
- **Grammar:** pronominal adverbs for things after a preposition (`Ik reken erop`, `Ik ben ermee bezig`, `Waarmee?`, `daarvoor`), including the split form (`Ik heb er geen zin in`); `lenen` (both lend and borrow) vs. `uitlenen`; `elkaar`; reflexive `zichzelf`, `mezelf`, `jezelf`; `zorgen voor`, `rekenen op`, `oppassen op`.
- **Lessons:**
  1. Mag ik je boor lenen?
  2. Ik breng hem morgen terug
  3. Kun jij op mijn planten passen?
  4. De melk is op
  5. Ik heb het zelf gedaan
  6. Je kunt op me rekenen
- **Introduces:** gunst, lenen, uitlenen, schuldig, beloven, belofte, vertrouwen, rekenen, oppassen, elkaar, zelf, mezelf, jezelf, zichzelf, erop, ervan, ermee, eraan, ervoor, daarvoor, daarmee, waarmee, waarvoor, boor, ladder, gereedschap, plant, waarderen, terugbetalen, oplader, paraplu, bezig

### 24. Werk zoeken -- `nl-b1-carriere`

- **Requires:** `nl-b1-gunsten`.
- **Grammar:** the progressive `aan het` + infinitive (`Ik ben aan het solliciteren`); `zitten/staan/liggen te` + infinitive (`Ik zit te wachten`); `op het punt staan om te`; `te` + infinitive after `proberen`, `beginnen`, `vergeten`, `hoeven` (`Je hoeft niet te komen`).
- **Lessons:**
  1. Ik ben werk aan het zoeken
  2. Mijn cv
  3. Het sollicitatiegesprek
  4. Ik sta op het punt om te stoppen
  5. Al doende leer je
  6. De eerste dag
- **Introduces:** carrière, vacature, solliciteren, sollicitatie, sollicitatiegesprek, cv, ervaring, vaardigheid, opleiding, stage, aannemen, contract, salaris, werkloos, sector, werknemer, werkgever, functie, eis, ontslag, ontslaan, promotie, ambitie, flexibel, fulltime, parttime, uitdaging, zelfverzekerd, zwak, punt, hoeven

### 25. Volgens mij -- `nl-b1-mening`

- **Requires:** `nl-b1-carriere`.
- **Grammar:** `dat`-clauses with the verb at the end (`Ik denk dat het klopt`; Spanish `no creo que` + subjunctive, where Dutch keeps the plain verb); `of` for indirect yes/no questions (`Ik weet niet of...`); `volgens mij` with inversion; `gelijk hebben`, `het eens/oneens zijn met`; `het hangt ervan af`; likelihood with `zal wel`, `moet wel`, `kan`.
- **Lessons:**
  1. Ik denk dat het klopt
  2. Dat denk ik niet
  3. Dat zal wel
  4. Je hebt gelijk
  5. Het hangt ervan af
  6. Een standpunt
- **Introduces:** mening, twijfel, twijfelen, overtuigen, bespreken, discussie, argument, standpunt, steunen, bekritiseren, overdrijven, maatschappij, sociaal, oudere, generatie, oplossing, onderwerp, duidelijk, vanzelfsprekend, onwaar, oordelen, vooroordeel, tegen, volgens, afhangen, af, oneens, reden, feit, helemaal, eigenlijk, kloppen

### 26. Gevoelens -- `nl-b1-gevoelens`

- **Requires:** `nl-b1-mening`.
- **Grammar:** adjective + preposition (`boos op`, `trots op`, `jaloers op`, `bang voor`, `blij met`, `teleurgesteld in`); reflexive emotion verbs (`zich ergeren aan`, `zich zorgen maken over`, `zich schamen voor`, `zich vervelen`); `willen dat` + clause (`Ik wil dat je het weet`, Spanish subjunctive); `blij dat`, `hopen dat`, `bang dat`.
- **Lessons:**
  1. Ik hoop dat het goed met je gaat
  2. Ik ben blij dat je er bent
  3. Ik maak me zorgen om hem
  4. Ruzie en het weer goedmaken
  5. Ik vertrouw je
  6. Ik wil dat je het weet
- **Introduces:** gevoel, emotie, boos, overstuur, jaloers, teleurgesteld, trots, zenuwachtig, bezorgd, enthousiast, schamen, opgelucht, eenzaam, vervelen, ergeren, kalm, humeur, liefde, relatie, stel, ruzie, vergeven, liegen, leugen, knuffelen, kussen, verwachten, goedmaken, uitmaken

### 27. Boeken en films -- `nl-b1-boeken`

- **Requires:** `nl-b1-gevoelens`.
- **Grammar:** relative pronouns `die` (`de` nouns and plurals) and `dat` (`het` nouns), verb at the end; `waar` + preposition (`waarover`, `waarin`, `waarmee`) for things; `wie` after a preposition for people (`de vriend met wie`); `wat` after `alles`, `iets`, `het enige`; `gaan over` and `zich afspelen in`.
- **Lessons:**
  1. Het boek dat ik lees
  2. De vriend over wie ik vertelde
  3. De stad waar het zich afspeelt
  4. De schrijver die de prijs won
  5. Alles wat ik mooi vond
  6. Een recensie
- **Introduces:** personage, hoofdpersoon, schrijver, auteur, genre, hoofdstuk, bladzijde, serie, aflevering, recensie, scène, ontroerend, spannend, publiceren, ondertiteling, versie, origineel, succes, boekhandel, omslag, afspelen, fictie, wetenschap, lezer, publiek, waarover, waarin, enige, winnen

### 28. Het milieu -- `nl-b1-milieu`

- **Requires:** `nl-b1-boeken`.
- **Grammar:** the passive with `worden` in the present and past (`Glas wordt hier gerecycled`, `Het werd in 1990 gebouwd`) and with `zijn` in the perfect (`Het is gemaakt van plastic`); the passive with modals (`Het moet gescheiden worden`); impersonal `er wordt` (`Er wordt hier niet gerookt`) and `men`.
- **Lessons:**
  1. Glas wordt hier gerecycled
  2. Afval scheiden
  3. We verspillen te veel
  4. Het is gemaakt van plastic
  5. Het moet beschermd worden
  6. De planeet
- **Introduces:** milieu, vervuiling, vervuilen, afval, vuilnis, recyclen, weggooien, scheiden, plastic, papier, bak, container, statiegeld, energie, verminderen, verspillen, duurzaam, hernieuwbaar, beschermen, planeet, aarde, wet, toestaan, verboden, regel, burger, produceren, zonnepaneel, elektriciteit, respecteren, grondstof, vernietigen, men, bouwen, roken

### 29. Als ik rijk was... -- `nl-b1-dromen`

- **Requires:** `nl-b1-milieu`.
- **Grammar:** unreal conditions with the simple past and `zou` (`Als ik tijd had, zou ik reizen`; Spanish imperfect subjunctive); `Ik zou willen dat...`; `had ik maar`, `was ik maar`; `alsof`; the past unreal (`Als ik het had geweten, was ik gekomen`, `Ik had het moeten doen`, `Het zou beter zijn geweest`).
- **Lessons:**
  1. Als ik tijd had
  2. Als ik de loterij won
  3. Had ik maar...
  4. Ik had het moeten doen
  5. Het zou beter zijn geweest
  6. Mijn droom
- **Introduces:** loterij, rijk, miljoen, miljard, bereiken, verlangen, spijt, kans, moed, risico, eiland, geheel, keuze, veroorloven, perfect, ideaal, fout, vergissing, beslissing, alsof, wensdroom

### 30. Het nieuws -- `nl-b1-nieuws`

- **Requires:** `nl-b1-dromen`.
- **Grammar:** reported speech with the tense shift (`Ze zegt dat ze moe is` -> `Ze zei dat ze moe was`, `had`, `zou`); reported questions with `of` and a question word, verb at the end (`Hij vroeg of ik klaar was`, `Ze vroeg waar ik woonde`); reported commands (`Ze zei dat ik moest wachten`, `Hij vroeg ons om niet te bellen`); `volgens` + source.
- **Lessons:**
  1. Ze zei dat...
  2. Hij vroeg of...
  3. Hij beloofde dat hij zou komen
  4. Het journaal
  5. Een interview
  6. Op sociale media
- **Introduces:** journalist, verslaggever, journaal, artikel, kop, aankondigen, verklaren, melden, verkiezing, regering, politicus, minister-president, burgemeester, informeren, delen, commentaar, openbaar, media, ontkennen, bron, stemmen, misdaad, nep, verspreiden, beweren, interview, interviewen

### 31. Wonen in Nederland -- `nl-b1-nederland`

- **Requires:** `nl-b1-nieuws`.
- **Grammar:** linking words and their word order: `hoewel`, `ook al`, `aangezien`, `zodat`, `tenzij`, `zolang` with the verb at the end; `toch`, `daarom`, `echter`, `bovendien` with inversion; `dus` and `want` with main-clause order; `ondanks` + noun; `gewend zijn aan` / `wennen aan` + noun or `het` + infinitive.
- **Lessons:**
  1. Ook al regent het
  2. Ondanks het weer
  3. Zodat iedereen het begrijpt
  4. Tenzij
  5. Ik ben eraan gewend
  6. Voor- en nadelen
- **Introduces:** hoewel, aangezien, zodat, tenzij, zolang, daarom, echter, bovendien, ondanks, cultuur, gewoonte, wennen, gewend, aanpassen, heimwee, emigreren, immigrant, accent, voordeel, nadeel, kwaliteit, systeem, tempo, nationaliteit, inburgering, mentaliteit, direct, iedereen

## Optional modules

The lemma lists here are suggestions within the theme. The author settles the final list, which must not repeat a lemma any of the module's ancestors introduce.

| Module | Id | Level | Requires | Order | Lessons (suggested) | Suggested lemmas |
|---|---|---|---|---|---|---|
| In de keuken | `nl-a1-keuken` | A1 | `nl-a1-restaurant` | 101 | De ingrediënten · Snijden en koken · Het recept · In de pan · In de oven · Eten voor vrienden | recept, ingrediënt, snijden, bakken, braden, toevoegen, mengen, roeren, gieten, verwarmen, ui, knoflook, boter, bloem, pan, mes, vork, lepel, plakje, rauw, gaar, proeven, saus, oven, snufje, deeg |
| Sport | `nl-a1-sport` | A1 | `nl-a1-vrije-tijd` | 102 | Welke sport doe je? · In de sportschool · De wedstrijd · Winnen en verliezen · Het team · Trainen | team, speler, trainer, trainen, winnen, verliezen, gelijkspelen, scoren, doelpunt, fan, veld, stadion, hockey, schaatsen, wielrennen, wedstrijd, competitie, punt, conditie, spier, oefening, zweten, scheidsrechter |
| Natuur | `nl-a1-natuur` | A1 | `nl-a1-reizen` | 103 | In de duinen · Aan het meer · Dieren · In het bos · Een wandeling · Het weer verandert | natuur, bos, rivier, heuvel, duin, pad, wandeling, gras, blad, boom, dier, vogel, koe, schaap, paard, eend, storm, mist, wolk, zonsondergang, zonsopgang, fris, wild, kamperen, tent, polder, dijk |
| Op kantoor | `nl-a2-kantoor` | A2 | `nl-a2-verhaal` | 104 | De vergadering · E-mail · De manager · Een deadline · Het sollicitatiegesprek · Pauze | vergadering, manager, deadline, project, klant, contract, salaris, sollicitatiegesprek, kandidaat, cv, ervaring, aannemen, ontslaan, tekenen, printen, printer, bureau, pauze, overuren, dienst, rooster, e-mail, verslag |
| Technologie | `nl-a2-technologie` | A2 | `nl-a2-verhaal` | 105 | Mijn telefoon · De computer · Ik ben mijn wachtwoord vergeten · De app downloaden · Het internet doet het niet · Een videogesprek | computer, laptop, scherm, toetsenbord, app, wachtwoord, account, internet, wifi, website, downloaden, uploaden, installeren, updaten, verwijderen, opslaan, inloggen, batterij, oplader, video, bestand, verbinding, gebruiker, klikken |
| Kunst en cultuur | `nl-a2-kunst` | A2 | `nl-a2-gebeurd` | 106 | In het museum · Een beroemd schilderij · Oude gebouwen · Een concert · In het theater · Een beetje geschiedenis | kunst, kunstenaar, schilderij, schilder, schilderen, beeld, standbeeld, tentoonstelling, eeuw, architectuur, gebouw, ruïne, gids, beroemd, modern, voorstelling, acteur, regisseur, roman, schrijver, gedicht, podium, geschiedenis, gracht |
| Papierwerk | `nl-a2-papierwerk` | A2 | `nl-a2-beleefd` | 107 | Op het postkantoor · Bij de bank · Het formulier · De gemeente · Je legitimatie, alstublieft · Een afspraak | post, pakket, versturen, postzegel, envelop, bankrekening, overmaken, storten, opnemen, formulier, invullen, handtekening, document, rijbewijs, legitimatie, adres, uittreksel, verlopen, verlengen, visum, gemeente, inschrijven, BSN, DigiD |
| Er was eens | `nl-b1-sprookjes` | B1 | `nl-b1-boeken` | 108 | De koning en de koningin · In het bos · De heks · De prins vertrok · De schat · Nog lang en gelukkig | The simple past of strong story verbs for reading (`vloog`, `vocht`, `reed`, `viel`, `sprak`, `sliep`), `er was eens`, `veranderen in`. koning, koningin, prins, prinses, kasteel, draak, heks, tovenaar, fee, wolf, bos, ridder, magie, zwaard, schat, boer, toren, vliegen, redden, dapper, sluw, betoveren, reus, kikker, gif |
| Geld | `nl-b1-geld` | B1 | `nl-b1-carriere` | 109 | Mijn bankrekening · Sparen · Belasting · De hypotheek · Alles wordt duurder · Beleggen | hypotheek, belasting, beleggen, belegging, rente, lening, schuld, krediet, verdienen, inkomen, opslag, stijgen, inflatie, crisis, economie, budget, pinautomaat, pensioen, spaarrekening, toeslag |
| Welzijn | `nl-b1-welzijn` | B1 | `nl-b1-gevoelens` | 110 | Ik ben gestrest · Goed slapen · Gezond eten · In vorm komen · Ontspannen · Balans vinden | welzijn, stress, gestrest, dieet, voeding, gezond, slapeloosheid, meditatie, gewicht, afvallen, vitamine, vet, eiwit, angst, balans, therapeut, therapie, beweging, yoga, mentaal, lichamelijk, routine |
