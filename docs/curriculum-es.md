# Spanish curriculum plan

The Spanish instance of [curriculum.md](curriculum.md): neutral Latin American Spanish (`tú`, `usted` and `ustedes`; settings anywhere in Latin America, prices in pesos) for learners whose support language is English (`en`), Italian (`it`) or Dutch (`nl`). Each module lists its course id, its requirements, its grammar focus, its six lessons, and the lemmas it `introduces`. A module may use its own lemmas plus every lemma introduced by the modules it requires, transitively. For main modules, that means every earlier main module.

The lemma lists are the core-vocabulary plan and decide ordering. A module author may add up to about 10 extra lemmas when natural sentences need them, but only lemmas that no module in this plan lists. Optional modules may also introduce lemmas that a later main module lists, because main modules never require them. Every lemma a module lists must be used in at least one of its units (the loader rejects an unused one).

## Variety and vocabulary

- **Pronouns of address:** `tú` for the informal singular (no voseo: never `vos`, `tenés`, `sabés`), `usted` for the formal singular, and `ustedes` for every plural "you", formal or not. Never `vosotros`, `os` or `vuestro`, and never `-áis`/`-éis` verb forms or `-ad`/`-ed` imperatives. Write `usted` and `ustedes` in full, never `Ud.`/`Uds.`
- **Pronoun use:** direct objects are `lo`, `la`, `los`, `las`, for people too (`Lo invito`, `¿La ayudo, señora?`): no leísmo. `le`/`les` are indirect only.
- **Past tenses:** the pretérito indefinido is the everyday past (`¿Ya comiste?`, `Hoy me levanté temprano`). The perfecto compuesto (`he comido`) is for life experience (`¿Alguna vez has estado en Cuzco?`) and ongoing states only.
- **Settings:** anywhere in Latin America. Real cities are proper nouns (Ciudad de México, Guadalajara, Bogotá, Medellín, Lima, Cuzco, Quito, Buenos Aires, Santiago, Montevideo, San José). Money is `pesos` unless the city says otherwise; never a `$` sign in `text`. No real business names.
- **Where countries split,** content uses the form the whole region understands: `carro` (not `coche` or `auto`), `celular`, `computadora`, `jugo`, `boleto` (tickets of every kind), `manejar` (drive), `estacionar`, `departamento` (apartment), `alquilar`/`alquiler` (not `rentar`), `papa` (potato), `frijol`, `aguacate`, `fresa`, `durazno`, `plátano` (banana), `pastel` (cake; `torta` means a sandwich in Mexico), `refresco` (soft drink), `mesero`, `autobús`, `cuadra` (block), `lentes` (glasses), `chaqueta`, `camiseta`, `suéter`, `falda`, `refrigerador`, `elevador`, `piscina`, `habitación` (room), `estampilla`, `cartera` (wallet), `enojado`, `apurarse`, `extrañar` (miss someone), `afuera`/`adentro`, `tomar` (drink, take a bus or a photo), `almuerzo` (lunch), `cena` (dinner). Never `coger` (vulgar in much of the region): use `tomar`, `agarrar` or `recoger`. `acá`, `ahorita` and `recién` are avoided in favor of `aquí`, `ahora` and `acabar de`.
- **No slang or regionalisms:** no `chévere`, `padre`, `bacán`, `plata`, `guagua`, `chamba`, `pana`, `onda`, `güey`.
- **Punctuation:** questions take `¿...?` and exclamations `¡...!`, including inside a sentence (`Hola, ¿cómo estás?`). Never use a dialogue dash; quoted speech goes into reported or direct speech with a colon and quotation marks only when unavoidable.

## Support languages

Every localized field carries exactly `en`, `it` and `nl`, in that order (`SUPPORT_LOCALES.es`). A learner whose UI is Spanish falls back to `en`.

- **Translations** are natural English, Italian and Dutch, not word-for-word: `Quisiera un café, por favor.` -> `I'd like a coffee, please.` / `Vorrei un caffè, per favore.` / `Ik wil graag een koffie.`. English is American. Translations never carry `¿` or `¡`. Translate `tú` as `you` / `tu` / `jij`, `usted` as `you` / `Lei` (capitalized) / `u`, and `ustedes` as `you` (or `you all` / `you guys` only when English needs it to make sense) / `voi` / `jullie`; use Dutch `u` for `ustedes` only when the scene is clearly formal (a waiter to guests). A dropped subject is rendered by the one the context makes clear (`Es de Lima`: `She's from Lima` when the lesson is about a woman).
- **Distractors** follow [curriculum.md](curriculum.md) in each language separately. No distractor may differ from the answer only in a distinction the Spanish doesn't make or a support language collapses: never contrast `tú`/`usted`/`ustedes` (English `you` covers all three, and `usted`'s Italian `Lei` is also "she"); never contrast he/she/you/they when the Spanish subject is dropped and the verb form fits more than one of them (`es`, `está`, `tiene` = he, she, it or formal you), or his/her/your/their for `su`. A sentence's options all end in `.`, `!` or `?`, and a word's, phrase's or chunk's never do.
- **Glosses** are short: the meaning, then the gender for nouns (`casa (f)`, `problema (m)`, `mano (f)`, `agua (f; el agua)`), then irregularities (`tener: tengo, tienes, tiene`; `fui = I went or I was`), then what trips up a speaker of that support language, flagged `watch out:` / `attenzione:` / `let op:`. The gender marker is the same `(m)`/`(f)` in all three glosses. Give the watch-out only in the support language it concerns (Italian false friends go in the `it` gloss).
- **grammarFocus** labels are in each support language and may quote Spanish (`ser vs. estar: Soy mexicano / Estoy cansado` / `ser o estar: Soy mexicano / Estoy cansado` / `ser of estar: Soy mexicano / Estoy cansado`).

**Watch-outs.** Flag these in the gloss or grammarFocus of the module that first uses them.

- **Italian false friends** (`attenzione:`): `burro` = donkey (butter = `mantequilla`); `largo` = long (wide = `ancho`); `salir` = go out, leave (go up = `subir`); `subir` = go up, get on; `embarazada` = pregnant, not embarrassed; `éxito` = success (exit = `salida`); `carpeta` = folder (carpet = `alfombra`); `exquisito` = delicious; `quitar` = take off, remove; `esposa` = wife; `guardar` = keep, put away (look = `mirar`); `mirar` = look at; `contestar` = answer; `pronto` = soon (ready = `listo`); `luego` = later, then; `rato` = a while; `habitación` = room; `camino` = path, way; `primo` = cousin (first = `primero`); `vaso` = drinking glass (vase = `florero`); `copa` = wine glass; `tienda` = store, also tent; `negocio` = business; `oficina` = office; `caldo` = broth (hot = `caliente`); `gamba` = shrimp (leg = `pierna`); `topo` = mole; `aceite` = oil; `salsa` = sauce; `burlar` = mock; `atender` = serve, attend to (wait = `esperar`); `esperar` = wait and hope; `parar` = stop; `prender` = turn on (take = `tomar`); `tirar` = throw away; `apellido` = surname; `rumbo` = direction; `nudo` = knot; `guapo` = good-looking; `enseñar` = teach and show; `constipado` = having a cold; `molestar` = bother; `cena` = dinner (same), but `comida` = food or meal; `todavía` = still, `ya` = already.
- **English false friends** (`watch out:`): `actual` = current, `actualmente` = currently (actually = `en realidad`); `realizar` = carry out (realize = `darse cuenta`); `sensible` = sensitive (sensible = `sensato`); `asistir` = attend (assist = `ayudar`); `librería` = bookstore (library = `biblioteca`); `constipado` = having a cold; `ropa` = clothes; `embarazada` = pregnant; `éxito` = success; `carpeta` = folder; `largo` = long; `molestar` = bother; `recordar` = remember and remind; `introducir` = insert (introduce a person = `presentar`); `soportar` = put up with; `suceso` = event; `fábrica` = factory; `lectura` = reading; `colegio` = school; `pariente` = relative (parents = `padres`); `decepción` = disappointment; `advertir` = warn; `educado` = polite; `carrera` = degree, career or race; `discutir` = argue as well as discuss; `argumento` = plot or argument; `once` = eleven; `sano` = healthy; `vaso` = drinking glass.
- **Dutch false friends** (`let op:`): `mes` = month (knife = `cuchillo`); `pan` = bread (pan = `sartén`); `ropa` = clothes; `librería` = bookstore; `constipado` = having a cold; `embarazada` = pregnant; `éxito` = success; `carpeta` = folder (carpet = `alfombra`); `largo` = long; `realizar` = carry out; `banco` = bank and also bench; `nota` = grade or note (bill = `cuenta`); `vaso` = drinking glass (vase = `florero`); `tanto` = so much (aunt = `tía`); `arma` = weapon (arm = `brazo`); `caso` = case (cheese = `queso`); `trapo` = rag (stairs = `escalera`); `once` = eleven; `sin` = without; `mal` = bad, badly (crazy = `loco`); `rato` = a while; `raro` = strange (as `raar`), not rare.
- **ser vs. estar** (all three): both mean `be`/`essere`/`zijn`. `ser` is for identity, origin, profession, time, material and where an event takes place (`La fiesta es en mi casa`); `estar` is for location, states and results (`Estoy cansado`, `El museo está cerrado`). Some adjectives change meaning: `ser listo` = be smart, `estar listo` = be ready; `ser aburrido` = be boring, `estar aburrido` = be bored; `ser rico` = be rich, `estar rico` = taste good. Italian `stare` is not `estar`: `¿Cómo estás?` = `Come stai?`, but `Estoy en casa` = `Sono a casa`.
- **gustar-type verbs:** `gustar`, `encantar`, `interesar`, `doler`, `quedar`, `faltar`, `importar`, `molestar` take the thing as subject and the person as indirect object (`Me gustan los tacos` = I like tacos, literally "tacos please me"; Dutch `Ik hou van taco's`). Italian `piacere` works the same way, so for `it` only flag the differences (`encantar` has no Italian twin; `me duele` = `mi fa male`).
- **tener** for age, hunger, thirst, cold, heat, fear, sleepiness and hurry (`Tengo treinta años`, `Tengo hambre`, `Tengo frío`, `Tengo prisa`): English and Dutch use `be`; Italian uses `avere` for age, hunger and thirst but `ho freddo` / `ho paura` match too, so the Italian gloss flags only `tengo prisa` (`ho fretta`) and `tengo sueño` (`ho sonno`).
- **Personal `a`:** a specific person as direct object takes `a` (`Conozco a tu hermano`, `Veo a María`), which none of the three languages has. It isn't translated.
- **Weather and time with `hacer`:** `Hace calor` (it's hot), `hace dos años` (two years ago), `Trabajo aquí desde hace dos años` (I've worked here for two years; English and Dutch use a perfect or `al`, Italian `da due anni` + present).
- **Double negation:** `No veo nada`, `No viene nadie`, `Nunca como carne` / `No como carne nunca` (Dutch and English drop one negative; Italian matches).
- **The clock:** `las dos y media` = 2:30 (Dutch speakers: not `half twee`); `la una` is singular. Numbers are read tens first (`veintitrés`, `treinta y cuatro`), unlike Dutch.
- **Verbs of motion:** Spanish uses `ir` toward the listener where Italian uses `venire` (`¡Ya voy!` = `Arrivo!` / `Vengo!`); `llevar` = take along, `traer` = bring here.
- **Italian past tenses:** where Italian uses the passato prossimo for a finished past (`Ieri ho mangiato`), Latin American Spanish uses the indefinido (`Ayer comí`); the same holds for the Dutch perfectum.
- **Subjunctive for Italian speakers:** `creo que` and `pienso que` take the indicative (`Creo que tiene razón`; Italian `credo che abbia ragione`); `cuando` about the future takes the subjunctive (`Cuando llegue`; Italian `quando arriverà`).
- **Inverted marks:** `¿` opens every question and `¡` every exclamation, even mid-sentence. Learners may type them or leave them out: the grader never counts a missing mark, only a wrong end mark (`.` on a question, `?` on a statement). Glosses mention this once, in module 1.
- **Accents and `ñ`:** the grader strips diacritics for comparison, so a missing accent or tilde (`el` for `él`, `ano` for `año`) is an accent slip, shown in orange, not an error. The lexicon still keeps accent pairs apart.

## Lemma conventions

- **Nouns:** the singular (`casas` -> `casa`, `lápices` -> `lápiz`, `jóvenes` -> `joven`). A noun for people with a regular feminine form uses the masculine (`amiga` -> `amigo`, `hija` -> `hijo`, `señora` -> `señor`, `profesora` -> `profesor`, `jefa` -> `jefe`); pairs that are different words stay apart (`padre`/`madre`, `papá`/`mamá`, `hombre`/`mujer`, `rey`/`reina`, `actor`/`actriz`, `príncipe`/`princesa`). A noun used in its sense only in the plural keeps the plural as its lemma (`vacaciones`, `lentes` = glasses, `ganas`, `felicidades`, `gracias`). A diminutive is its own lemma and is used only when listed. The gloss gives the gender: `casa (f)`, `día (m)`.
- **Adjectives:** the masculine singular (`bonita`, `bonitos` -> `bonito`); `-ísimo` forms use the base (`carísimo` -> `caro`, `buenísimo` -> `bueno`). Shortened forms share the full lemma: `buen` -> `bueno`, `mal` (adjective) -> `malo`, `gran` -> `grande`, `primer` -> `primero`, `tercer` -> `tercero`, `algún` -> `alguno`, `ningún` -> `ninguno`, `cualquier` -> `cualquiera`. `mejor`, `peor`, `mayor`, `menor`, `más` and `menos` are their own lemmas. `-mente` adverbs are their own lemmas (`normalmente`). A participle used as an adjective takes the adjective lemma only when the plan lists that adjective (`abierto`, `cerrado`, `casado`, `cansado`, `ocupado`, `perdido`, `pasado`, `prohibido`); otherwise, and in every compound tense or passive, it takes the verb's lemma.
- **Verbs:** the infinitive. Every form shares one lemma, irregular ones included (`soy`, `eres`, `fue`, `era`, `sea` -> `ser`; `voy`, `fui`, `iba`, `vaya` -> `ir`; `quisiera` -> `querer`; `hay`, `había`, `he` -> `haber`; `pude` -> `poder`).
- **Reflexive and pronominal verbs** share the plain verb's lemma (`me llamo`, `llamarse` -> `llamar`; `me levanto` -> `levantar`; `nos casamos` -> `casar`; `se queja` -> `quejar`, even though `quejar` alone is rare). The gloss gives the pronominal meaning (`llamarse = be called`, `quedarse = stay`, `irse = leave`). The pronouns `me`, `te`, `se`, `nos` are their own lemmas, one lemma each for every use (reflexive, direct, indirect, reciprocal, impersonal `se`, and `se` for `le` in `se lo`).
- **Enclitic pronouns** attached to an infinitive, gerund or imperative make one token whose lemma is the verb (`levantarme` -> `levantar`, `dámelo` -> `dar`, `diciéndole` -> `decir`, `siéntese` -> `sentar`). The gloss spells out the parts (`dámelo = dame + lo: give it to me`). Use an enclitic form only once each attached pronoun is itself available as a lemma in the module's chain.
- **Articles:** every definite form is `el` (`el la los las`); every indefinite form is `uno` (`un una unos unas`), and the numeral `uno` (`un`, `una`) and impersonal `uno` share it. Neuter `lo` (`lo bueno`, `lo que`) shares the lemma `lo` with the pronoun, with the key `lo#art`.
- **Contractions:** `al` and `del` are one token each and their own lemmas (`al`, `del`); never write `a el` or `de el` (but `a él` and `de él` with the pronoun stay apart).
- **Pronouns:** subject pronouns `yo tú usted él ella nosotros ustedes ellos` are one lemma each; `nosotras` -> `nosotros`, `ellas` -> `ellos`. Object clitics `me te se nos lo la los las le les` are one lemma each. The pronoun `la`, `los`, `las` share a surface with the article, so the pronoun uses the keys `la#pron`, `los#pron`, `las#pron` (lemmas `la`, `los`, `las`); the bare keys are the article (lemma `el`). Stressed forms `mí ti` and `conmigo contigo` are their own lemmas; after a preposition, `él ella usted nosotros ustedes ellos` keep their subject lemmas; reflexive stressed `sí` (`sí mismo`) shares the lemma `sí` with the key `sí#pron`.
- **Possessives and demonstratives:** the masculine singular (`mis` -> `mi`, `nuestras` -> `nuestro`, `mía` -> `mío`, `esta`, `estos` -> `este`, `esa` -> `ese`, `aquella` -> `aquel`). Neuter `esto`, `eso`, `aquello` are their own lemmas. Demonstratives never take an accent.
- **Accent pairs are different surfaces and different lemmas:** `el`/`él`, `tu`/`tú`, `mi`/`mí`, `te`/`té`, `se`/`sé` (`sé` -> `saber`), `de`/`dé` (`dé` -> `dar`), `si`/`sí`, `que`/`qué`, `como`/`cómo`, `donde`/`dónde`, `cuando`/`cuándo`, `quien`/`quién`, `cual`/`cuál`, `cuanto`/`cuánto`, `aun`/`aún`. `más` is always accented (content never uses `mas` = but). `solo` never takes an accent, whether adjective or adverb. `quiénes`, `cuáles`, `cuántos` share `quién`, `cuál`, `cuánto`.
- **Allomorphs:** `e` (before `i-`/`hi-`: `padres e hijos`) shares the lemma `y`; `u` (before `o-`/`ho-`: `siete u ocho`) shares the lemma `o`.
- **Homographs and sense keys:** a lexicon key is the lowercase surface, plus `#sense` when a surface needs two entries. When the readings belong to different lemmas, the non-verb reading takes the bare key and each verb reading takes `#` + its infinitive: `vino` wine and `vino#venir`; `como` like, as and `como#comer`; `nada` nothing and `nada#nadar`; `bajo` short, low and `bajo#bajar`; `trabajo` and `trabajo#trabajar`, likewise `cena`, `cambio`, `baño`, `viaje`, `juego`, `camino`, `compra`, `ayuda`, `regalo`, `pregunta`, `abrazo`, `beso`, `pelea`, `duda`, `queja`, `cocina`, `partido`, `entre` (`entre#entrar`), `cerrado`, `abierto`, `casado`, `pasado`, `perdido`, `estado`, `hecho`. When every reading is a verb form, the bare key goes to the first lemma in this list and the others take `#` + infinitive: `ser` before `ir` (`fui`, `fue`, `fuimos`, `fueron`, `fuiste`, `fuera` and the other `fu-` forms -> bare = `ser`, `fui#ir`), `ver` before `ir` (`ve` -> bare = `ver`, `ve#ir` = go!), `saber` before `ser` (`sé` -> bare = `saber`, `sé#ser` = be!), `sentir` before `sentar` (`siento`, `sienta` -> bare = `sentir`). When one lemma has two glosses, the second takes a short tag: `tarde` afternoon and `tarde#adv` late; `mañana` tomorrow and `mañana#noun` morning; `este` this and `este#east`; `bajo#prep` under; `papa` potato (never used as `papa#pope`); `rico` tasty and `rico#rich`; `listo` ready and `listo#smart`; `tiempo` time and `tiempo#weather`; `estación` station and `estación#season`; `metro` subway and `metro#unit`; `cuarto` quarter, fourth and `cuarto#room`; `seguro` sure, `seguro#safe`, `seguro#insurance`; `salud` health and `salud#toast` (¡Salud!); `hace#ago` and `hace#weather` beside plain `hace` (does, makes); `cuenta` bill and `cuenta#idiom` (darse cuenta); `sueño` dream and `sueño#sleepy`; `solo` only and `solo#alone`; `sobre#noun` envelope; `medio#media`; `tratar#about` (tratar de = be about); `vela` candle (and `vela#sail` if ever needed). A module that uses a second reading adds that key to its lexicon; no module re-lists the lemma.
- **Numbers:** each numeral is its own lemma. One-word numerals are all listed in this plan, so no author introduces one: `dieciséis` to `diecinueve` and `veintiuno` to `veintinueve` (module 3), `ciento` to `quinientos` (module 10), `seiscientos` to `ochocientos` (module 11), `novecientos` (module 13), `millón` (module 29). `veintiún` -> `veintiuno`, `un`/`una` -> `uno`, `doscientas` -> `doscientos`. `cien` (exactly 100) and `ciento` (`ciento veinte`) are separate lemmas. `treinta y dos` is three tokens (`treinta`, `y`, `dos`). Numbers are words in `text`, with digit variants (`veinte pesos` -> `20 pesos`, `a las tres` -> `a las 3`, `treinta y dos` -> `32`).
- **Days and months** are lowercase in Spanish and are lemmas (`lunes`, `enero`). **Nationalities and languages** are lowercase too (`español`, `mexicano`, `inglés`), unlike Dutch and English, and one lemma serves both the language and the nationality (`Hablo inglés`, `Es inglés`). Country names are proper nouns (`México`, `los Países Bajos`).
- **Proper nouns** (`PROPN`: people, cities, countries, holidays such as `Navidad`, `Año Nuevo`, `Día de Muertos`) are never introduced and may appear anywhere.
- **Every lemma is a single token** with no spaces. Multi-word expressions (`por favor`, `de repente`, `sin embargo`, `a pesar de`) are made of their words' lemmas, and the gloss of each part explains the expression.
- **Diacritics** are part of the spelling (`café`, `año`, `pingüino`, `él`); the grader treats a missing accent as an accent slip, not an error.

## A1

### 1. En la cafetería -- `es-a1-cafeteria`

- **Requires:** nothing.
- **Grammar:** `quisiera` + noun (a form of `querer`, taught as a chunk) and `¿me da...?` / `¿me trae...?` as chunks; `un/una` and `el/la`; `¿cuánto es?` and `¿cuánto cuesta?`; `¿tiene...?` with `usted`; `para llevar` / `para tomar aquí`; `¿puedo pagar con tarjeta?` as a chunk; `lo` in `lo quiero con leche`; `¿` and `¡`.
- **Lessons:**
  1. Un café, por favor
  2. ¿Cuánto es?
  3. Algo de tomar
  4. ¿Frío o caliente?
  5. ¿Para llevar?
  6. ¿Tarjeta o efectivo?
- **Introduces:** hola, sí, no, perdón, disculpar, por, favor, gracias, de, nada, bueno, yo, usted, me, lo, querer, dar, traer, poder, tener, tomar, llevar, pagar, ser, el, uno, dos, tres, cuatro, cinco, diez, veinte, cincuenta, cien, y, o, con, sin, para, en, aquí, también, más, mucho, solo, otro, todo, algo, cosa, cuánto, costar, qué, eso, peso, cuenta, tarjeta, efectivo, café, té, leche, azúcar, agua, gas, jugo, naranja, pan, pastel, sándwich, galleta, queso, jamón, refresco, cerveza, vino, vaso, botella, taza, chocolate, caliente, frío, grande, pequeño, negro, natural, rico

### 2. ¡Hola! -- `es-a1-hola`

- **Requires:** `es-a1-cafeteria`.
- **Grammar:** `ser` in the singular (`soy`, `eres`, `es`) for name, origin and nationality; `estar` for how you are (`¿Cómo estás?`, `Estoy bien`), the first split of `ser` and `estar`; `llamarse` in the singular (`me llamo`, `te llamas`, `se llama`); `no` before the verb; `ser de` + place; nationality agreement (`mexicano/mexicana`, `inglés/inglesa`), lowercase; `tú` vs. `usted` (the verb in the third person); classroom chunks (`No entiendo`, `¿Puede repetir?`, `¿Cómo se escribe?`, `¿Cómo se dice...?`, `¿Qué significa...?`, `más despacio`).
- **Lessons:**
  1. ¡Hola!
  2. ¿Cómo te llamas?
  3. ¿De dónde eres?
  4. Buenos días, señora Gómez
  5. No entiendo
  6. Este es mi amigo
- **Introduces:** adiós, chao, hasta, luego, pronto, mañana, día, tarde, noche, gusto, encantado, bienvenido, llamar, se, te, nombre, apellido, tú, él, ella, mi, tu, su, este, quién, dónde, cómo, estar, bien, mal, muy, poco, pero, claro, amigo, señor, país, ciudad, vivir, hablar, entender, repetir, escribir, decir, significar, despacio, palabra, vez, español, inglés, italiano, holandés, alemán, francés, mexicano, colombiano, argentino, chileno, peruano, estadounidense

### 3. Números y horas -- `es-a1-numeros`

- **Requires:** `es-a1-hola`.
- **Grammar:** `tener` in the singular; age with `tener` (`Tengo treinta años`; English and Dutch use `be`); numbers to 100, with `dieciséis` to `diecinueve` and `veintiuno` to `veintinueve` as one word and `treinta y uno` as three; phone numbers read in pairs (`cuarenta y cinco, veintitrés...`); `¿Qué hora es?`, `Es la una`, `Son las tres`, `y media`, `y cuarto`, `menos cuarto`, `en punto`, `de la mañana/tarde/noche`; `a las` + time; days with the article and no preposition (`el lunes`, `los sábados`); `¿cuál?`.
- **Lessons:**
  1. De cero a veinte
  2. ¿Cuántos años tienes?
  3. Tu número de teléfono
  4. ¿Qué hora es?
  5. ¿A qué hora abre la tienda?
  6. Los días de la semana
- **Introduces:** cero, seis, siete, ocho, nueve, once, doce, trece, catorce, quince, dieciséis, diecisiete, dieciocho, diecinueve, veintiuno, veintidós, veintitrés, veinticuatro, veinticinco, veintiséis, veintisiete, veintiocho, veintinueve, treinta, cuarenta, sesenta, setenta, ochenta, noventa, año, hora, medio, cuarto, menos, punto, a, minuto, semana, hoy, mediodía, medianoche, lunes, martes, miércoles, jueves, viernes, sábado, domingo, fin, número, teléfono, celular, abrir, cerrar, abierto, cerrado, tienda, ahora, temprano, desde, cuál

### 4. La familia -- `es-a1-familia`

- **Requires:** `es-a1-numeros`.
- **Grammar:** plural nouns and articles (`-s`, `-es`); adjective agreement in gender and number; possessives `mi/mis`, `tu/tus`, `su/sus`, `nuestro`; full `ser` and `tener`; `ser` for what someone is like (`Es alto`, `¿Cómo es?`) vs. `estar` for a state (`Está casado`, `¿Cómo está?`); `los padres` = parents; `tener` + physical features (`Tiene los ojos verdes`).
- **Lessons:**
  1. Mi familia
  2. Hermanos y hermanas
  3. ¿Cómo es ella?
  4. ¿Alto o bajo?
  5. Los abuelos
  6. Una familia grande
- **Introduces:** familia, padre, madre, papá, mamá, hijo, hermano, abuelo, tío, primo, sobrino, esposo, pareja, novio, niño, bebé, chico, hombre, mujer, persona, gente, perro, gato, mascota, casa, conocer, nosotros, ustedes, ellos, nuestro, casado, soltero, divorciado, alto, bajo, largo, corto, joven, viejo, mayor, menor, bonito, guapo, feo, simpático, amable, divertido, cariñoso, inteligente, delgado, pelo, ojo, barba, lentes, azul, verde, castaño, rubio, único, junto, ambos

### 5. Trabajo y estudios -- `es-a1-trabajo`

- **Requires:** `es-a1-familia`.
- **Grammar:** the present of regular `-ar` verbs, all persons (`trabajo, trabajas, trabaja, trabajamos, trabajan`); `hacer` (`¿Qué haces?`); `ser` + profession with no article (`Soy enfermera`); `trabajar en` + place and `trabajar como` + job; `hablar` + language with no article; duration with `desde hace` and `hace ... que` + present (`Estudio español desde hace un año`); `¿A qué te dedicas?` as a chunk.
- **Lessons:**
  1. ¿A qué te dedicas?
  2. ¿Dónde trabajas?
  3. Estudio español
  4. Idiomas
  5. Un trabajo nuevo
  6. Mis compañeros
- **Introduces:** trabajar, estudiar, aprender, enseñar, practicar, necesitar, dedicar, hacer, trabajo, profesión, estudiante, profesor, maestro, médico, enfermero, ingeniero, abogado, mesero, cocinero, cajero, arquitecto, programador, jubilado, compañero, jefe, oficina, escuela, universidad, hospital, empresa, fábrica, banco, idioma, curso, clase, examen, difícil, fácil, interesante, aburrido, contento, nuevo, ocupado, chino, japonés, portugués, árabe, como, computadora, tiempo, completo

### 6. Mi día -- `es-a1-dia`

- **Requires:** `es-a1-trabajo`.
- **Grammar:** the present of `-er` and `-ir` verbs; stem-changing verbs (`empezar` e>ie, `volver` and `dormir` o>ue, `vestirse` e>i); reflexive verbs with `me te se nos` (`me levanto`, `nos acostamos`); `ir` and `ir a` + place, with `al` and `del` (`voy al trabajo`, `salgo del trabajo`); `salir` (`salgo`); frequency adverbs (`siempre`, `normalmente`, `a veces`, `nunca`); `por la mañana/tarde/noche`.
- **Lessons:**
  1. Por la mañana
  2. Me levanto temprano
  3. La hora del almuerzo
  4. Por la tarde
  5. Por la noche
  6. Siempre, a veces, nunca
- **Introduces:** ir, al, del, nos, levantar, despertar, duchar, bañar, vestir, lavar, cepillar, diente, desayunar, desayuno, almorzar, almuerzo, cenar, cena, comer, comida, cocinar, dormir, acostar, leer, ver, televisión, tele, libro, periódico, noticia, salir, volver, cama, empezar, terminar, listo, primero, después, antes, siempre, normalmente, nunca, cada, cansado, tranquilo, descansar, caminar, bicicleta, ejercicio

### 7. En la ciudad -- `es-a1-ciudad`

- **Requires:** `es-a1-dia`.
- **Grammar:** `hay` for what exists (`¿Hay una farmacia por aquí?`) vs. `está/están` for where a known thing is (`¿Dónde está el museo?`); `ir` and `venir` in full; `tener que` + infinitive; `usted` commands as chunks (`siga derecho`, `doble a la derecha`, `tome el metro`, `cruce la calle`); place prepositions (`al lado de`, `enfrente de`, `entre`, `detrás de`, `cerca de`, `lejos de`, `hacia`); ordinals (`la segunda calle`), with `primer`/`tercer` before a masculine noun; `saber` (`¿Sabe dónde está...?`, `¿Sabes manejar?`) vs. `conocer`.
- **Lessons:**
  1. ¿Dónde está la estación?
  2. ¿Hay una farmacia por aquí?
  3. A la izquierda y a la derecha
  4. ¿En autobús o a pie?
  5. ¿Dónde me bajo?
  6. El centro
- **Introduces:** haber, venir, que, saber, buscar, encontrar, llegar, entrar, pasar, seguir, doblar, cruzar, bajar, subir, esperar, manejar, estacionar, derecho, izquierda, derecha, cerca, lejos, lado, enfrente, entre, detrás, hacia, ahí, allá, parte, esquina, cuadra, semáforo, calle, avenida, plaza, centro, estación, parada, autobús, metro, tren, taxi, pie, carro, camino, farmacia, supermercado, museo, iglesia, parque, biblioteca, baño, lugar, segundo, tercero, mil, kilómetro, perdido, mapa, línea, dirección

### 8. En el restaurante -- `es-a1-restaurante`

- **Requires:** `es-a1-ciudad`.
- **Grammar:** `gustar` and `encantar` (`me gusta el pescado`, `me gustan las papas`, `te gusta`, `le gusta`, `a mí`, `a ti`); `tener hambre` and `tener sed` (English and Dutch use `be`); `preferir` (e>ie) and `pedir` (e>i); ordering (`Para mí, el pollo`, `¿Qué me recomienda?`, `Voy a pedir...` as a chunk); `la cuenta, por favor` and `cuentas separadas`.
- **Lessons:**
  1. Una mesa para dos
  2. El menú
  3. De entrada y de plato fuerte
  4. ¿Te gusta?
  5. Tengo hambre
  6. El postre y la cuenta
- **Introduces:** gustar, encantar, preferir, pedir, reservar, recomendar, desear, probar, beber, sentar, le, mí, ti, restaurante, mesa, menú, plato, entrada, fuerte, postre, sopa, ensalada, carne, pollo, pescado, arroz, frijol, papa, tomate, verdura, fruta, pasta, pizza, taco, tortilla, aguacate, sal, pimienta, aceite, salsa, delicioso, picante, vegetariano, malo, hambre, sed, alguno, bastante, propina, separado, enseguida

### 9. Tiempo libre -- `es-a1-tiempo-libre`

- **Requires:** `es-a1-restaurante`.
- **Grammar:** `querer` and `poder` in full (e>ie, o>ue); `jugar` (u>ue) + `al` + sport (`jugar al fútbol`) and `tocar` + instrument (Italian `suonare`, Dutch `spelen`); `estar` + gerundio for what is happening right now (`¿Qué estás haciendo?`, `Estoy viendo una película`), never for habits; invitations (`¿Quieres venir?`, `¿Vamos al cine?`, `¿Tienes ganas de...?`) and answers (`¡Claro!`, `¡Qué lástima!`, `No puedo`); `porque` vs. `¿por qué?`; `cuándo`, `con quién`, `conmigo`, `contigo`.
- **Lessons:**
  1. ¿Qué haces en tu tiempo libre?
  2. ¿Juegas al fútbol?
  3. La música
  4. ¿Quieres venir?
  5. ¡Qué lástima! No puedo
  6. ¿Qué estás haciendo?
- **Introduces:** libre, jugar, tocar, escuchar, bailar, cantar, nadar, correr, pasear, viajar, invitar, deporte, fútbol, tenis, partido, juego, música, guitarra, piano, canción, película, concierto, teatro, cine, fiesta, piscina, gimnasio, porque, cuándo, conmigo, contigo, tampoco, idea, lástima, quizás, genial, ganas, favorito, verdad, plan, pasatiempo, rato

### 10. De compras -- `es-a1-compras`

- **Requires:** `es-a1-tiempo-libre`.
- **Grammar:** demonstratives `este`, `ese`, `aquel` and neuter `esto`, `eso`; color agreement (`una camisa roja`, `unos zapatos rojos`; `azul`, `verde`, `gris` change only for number); quantities (`un kilo de`, `medio kilo de`, `una docena de`); hundreds for prices (`trescientos cincuenta pesos`); `quedar` and `faltar` like `gustar` (`Me queda grande`, `¿Cómo me queda?`); `lo/la` as chunks (`¿Me lo puedo probar?`, `Me la llevo`); `Solo estoy mirando`.
- **Lessons:**
  1. En el mercado
  2. Medio kilo de tomates
  3. ¿De qué color?
  4. ¿Qué talla es?
  5. ¿Me lo puedo probar?
  6. En la caja
- **Introduces:** comprar, vender, gastar, quedar, faltar, mirar, mostrar, ayudar, cambiar, la, esto, ese, aquel, color, blanco, rojo, amarillo, gris, rosado, morado, talla, ropa, camisa, camiseta, pantalón, jeans, falda, vestido, chaqueta, suéter, zapato, bolsa, probador, mercado, caja, recibo, oferta, descuento, precio, caro, barato, apretado, cómodo, kilo, gramo, docena, huevo, plátano, manzana, fresa, uva, dinero, cambio, ciento, doscientos, trescientos, cuatrocientos, quinientos

### 11. De viaje -- `es-a1-viaje`

- **Requires:** `es-a1-compras`.
- **Grammar:** `ir a` + infinitive for plans (`Voy a viajar a Lima`); dates (`el tres de mayo`, `el primero de enero`) and months, lowercase; weather (`Hace calor`, `Hace frío`, `Hace sol`, `Hace viento`, `Llueve`, `Está nublado`, `¿Qué tiempo hace?`, `¿Cómo está el clima?`); `próximo` and `pasado`; `salir` and `llegar` with times (`El vuelo sale a las diez`); `tardar` (`¿Cuánto tarda el autobús?`).
- **Lessons:**
  1. Un boleto a Guadalajara
  2. El tren tiene retraso
  3. En el hotel
  4. ¿Qué tiempo hace?
  5. Las estaciones del año
  6. De vacaciones
- **Introduces:** viaje, vacaciones, turista, visitar, tardar, boleto, ida, vuelta, avión, aeropuerto, vuelo, andén, maleta, pasaporte, hotel, habitación, llave, elevador, playa, mar, montaña, lago, sol, lluvia, llover, nieve, nevar, viento, nublado, grado, clima, calor, retraso, reserva, primavera, verano, otoño, invierno, mes, enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre, próximo, pasado, siguiente, seiscientos, setecientos, ochocientos

## A2

A2 is where Spanish tenses arrive. `cuando` about the future needs the subjunctive (`cuando llegue`), so until module 31 A2 and B1 content says `si` or keeps `cuando` for habits and the past.

### 12. El fin de semana pasado -- `es-a2-fin-de-semana`

- **Requires:** `es-a1-viaje`.
- **Grammar:** the pretérito indefinido of regular verbs (`-é, -aste, -ó, -amos, -aron`; `-í, -iste, -ió, -imos, -ieron`) with spelling changes (`llegué`, `busqué`, `empecé`, `leyó`); `hice`/`hizo` and `fui`/`fue` (`ir`); time markers `ayer`, `anoche`, `el sábado pasado`, `hace` + time (ago); `ya` and `todavía no` with the indefinido (`¿Ya comiste?`), the Latin American norm.
- **Lessons:**
  1. ¿Qué hiciste ayer?
  2. Comimos afuera
  3. Hace una semana
  4. ¿Ya lo compraste?
  5. Perdí las llaves
  6. Mi fin de semana
- **Introduces:** ayer, anoche, ya, todavía, último, perder, olvidar, limpiar, sacar, compra, mensaje, mandar, contar, preguntar, responder, oír, decidir, elegir, pensar, regresar, divertir, alguien, nadie, ninguno, ni, foto, afuera, puerta

### 13. Mi historia -- `es-a2-historia`

- **Requires:** `es-a2-fin-de-semana`.
- **Grammar:** irregular indefinido (`estuve`, `tuve`, `pude`, `puse`, `vine`, `dije`, `traje`, `quise`, `supe`, and `fui`/`fue` for `ser`); reflexive verbs in the past (`me mudé`, `nos casamos`); `nacer` (`Nací en Quito en mil novecientos noventa`); the perfecto compuesto for life experience only (`¿Alguna vez has estado en Cuzco?`, `Nunca he viajado en avión`), with `haber` + participle.
- **Lessons:**
  1. Nací en Quito
  2. Fui a la escuela en Cali
  3. Me mudé a Bogotá
  4. Nos casamos
  5. ¿Alguna vez has estado en Cuzco?
  6. Mi vida
- **Introduces:** nacer, morir, crecer, mudar, casar, graduar, enamorar, recibir, dejar, conseguir, caer, vida, historia, boda, secundaria, extranjero, norte, sur, oeste, estado, edad, durante, triste, pueblo, capital, carrera, título, varios, novecientos

### 14. Cuando era niño -- `es-a2-infancia`

- **Requires:** `es-a2-historia`.
- **Grammar:** the pretérito imperfecto (regular `-aba` and `-ía`; `era`, `iba`, `veía`) for description and past habits; `de niño` and `cuando era niño` (`cuando` + past); `soler` + infinitive (`Solía jugar en la calle`); `acordarse de` vs. `recordar`.
- **Lessons:**
  1. Cuando era niño
  2. Jugábamos en la calle
  3. Todos los veranos
  4. En la escuela
  5. Tenía miedo
  6. Me acuerdo de mi abuela
- **Introduces:** infancia, cuando, entonces, acordar, recordar, soler, creer, usar, campo, granja, juguete, muñeca, pelota, árbol, jardín, miedo, llorar, reír, animal, sueño, soñar, tímido, travieso, dibujar, tarea

### 15. ¿Qué pasó? -- `es-a2-que-paso`

- **Requires:** `es-a2-infancia`.
- **Grammar:** indefinido for the events vs. imperfecto for the background (`Llovía cuando salí`); `estaba` + gerundio for an action in progress (`Estaba caminando cuando...`); `mientras` + imperfecto; story markers (`al principio`, `de repente`, `por suerte`, `al final`, `así que`); `darse cuenta de`.
- **Lessons:**
  1. Mientras caminaba...
  2. De repente
  3. Me robaron la cartera
  4. Un accidente
  5. Por suerte
  6. Un día raro
- **Introduces:** ocurrir, mientras, repente, así, momento, principio, final, romper, robar, cartera, policía, ladrón, accidente, herido, ruido, gritar, chocar, asustar, susto, suerte, afortunadamente, raro, extraño, peligroso, ayuda

### 16. Con el médico -- `es-a2-medico`

- **Requires:** `es-a2-que-paso`.
- **Grammar:** `doler` like `gustar` (`Me duele la cabeza`, `Me duelen los pies`; Dutch `Mijn hoofd doet pijn`, Italian `mi fa male`), with the article for body parts, not the possessive; `sentirse` + adjective or adverb (`Me siento mal`); advice and rules with `deber` + infinitive and `hay que`; `¿Desde cuándo...?` and `desde hace` + present; dosage chunks (`dos veces al día`, `después de comer`); `¡Que te mejores!` as a fixed chunk.
- **Lessons:**
  1. No me siento bien
  2. Me duele la cabeza
  3. En el consultorio
  4. Tengo fiebre
  5. En la farmacia
  6. Ya estoy mejor
- **Introduces:** salud, enfermo, sentir, doler, dolor, fiebre, tos, resfriado, gripe, cabeza, cara, garganta, estómago, espalda, brazo, pierna, mano, oído, oreja, nariz, boca, cuerpo, corazón, medicina, pastilla, receta, consultorio, doctor, cita, respirar, alérgico, temperatura, grave, urgencia, necesario, deber, mejorar, mejor, mareado

### 17. La casa nueva -- `es-a2-casa`

- **Requires:** `es-a2-medico`.
- **Grammar:** direct object pronouns `lo`, `la`, `los`, `las` before a finite verb or attached to an infinitive or gerund (`Lo voy a poner aquí` / `Voy a ponerlo aquí`); personal `a` with people (`Conozco a mis vecinos`); `hay` vs. `estar` for location; place prepositions (`encima de`, `debajo de`, `dentro de`, `sobre`, `arriba`, `abajo`, `en medio de`); `donde` as a relative in chunks (`el barrio donde vivo`).
- **Lessons:**
  1. Busco departamento
  2. Las habitaciones
  3. El alquiler
  4. La mudanza
  5. ¿Dónde lo pongo?
  6. Los vecinos
- **Introduces:** los, las, poner, colgar, alquilar, departamento, alquiler, dueño, mudanza, cocina, sala, comedor, balcón, ventana, escalera, piso, pared, clóset, silla, sofá, lámpara, espejo, refrigerador, horno, calefacción, mueble, vecino, barrio, arriba, abajo, dentro, encima, debajo, sobre, donde, amueblado, luz, ruidoso, moderno, limpio, sucio, incluido

### 18. Regalos y fiestas -- `es-a2-fiestas`

- **Requires:** `es-a2-casa`.
- **Grammar:** indirect object pronouns `me te le nos les`, with the doubling `a` + person (`Le regalé un libro a mi mamá`); `gustar`, `encantar` and `interesar` with every person (`nos gusta`, `les encanta`); `dar` and `regalar`; dates and birthdays (`¿Cuándo es tu cumpleaños?`, `el quince de septiembre`); wishes (`¡Feliz cumpleaños!`, `¡Felicidades!`, `¡Salud!`, `¡Feliz Navidad!`, `¡Feliz Año Nuevo!`).
- **Lessons:**
  1. ¡Feliz cumpleaños!
  2. ¿Qué le regalo?
  3. Le encantan las flores
  4. La fiesta
  5. Navidad y Año Nuevo
  6. Gracias por el regalo
- **Introduces:** les, interesar, regalar, regalo, celebrar, felicitar, felicidades, cumpleaños, vela, invitado, invitación, flor, sorpresa, fecha, feliz, lindo, útil, especial, tradición, piñata, quinceañera, envolver, agradecer, abrazar, abrazo, besar, beso, brindar, ofrecer

### 19. Planes -- `es-a2-planes`

- **Requires:** `es-a2-fiestas`.
- **Grammar:** the futuro simple, regular and irregular (`tendré`, `haré`, `podré`, `saldré`, `vendré`, `diré`, `querré`, `sabré`); `ir a` for plans vs. the future for predictions and promises; real conditions with `si` + present and a present, future or `ir a` (`Si tengo tiempo, voy a viajar`); `dentro de` + time; `pensar` + infinitive, `esperar` + infinitive, `tratar de` + infinitive.
- **Lessons:**
  1. El año que viene
  2. Dentro de dos semanas
  3. Si tengo tiempo...
  4. Pienso estudiar
  5. Tal vez
  6. Un gran plan
- **Introduces:** si, futuro, caso, probablemente, seguramente, seguro, tal, organizar, preparar, ahorrar, meta, proyecto, mundo, posible, imposible, importante, intentar, tratar, cumplir, aprovechar

### 20. Mejor o peor -- `es-a2-comparar`

- **Requires:** `es-a2-planes`.
- **Grammar:** `más/menos` + adjective + `que`; `tan ... como`, `tanto ... como` (`tanta gente como`), `igual de`; the superlative `el/la más ... de`; `-ísimo` (`carísimo`, `buenísimo`); irregular `mejor`, `peor`, `mayor`, `menor`; `demasiado` and `suficiente`; `vale la pena`.
- **Lessons:**
  1. Más grande, más pequeño
  2. ¿Ciudad o campo?
  3. El mejor del mundo
  4. ¡Carísimo!
  5. ¿Igual o diferente?
  6. Vale la pena
- **Introduces:** tan, tanto, peor, mismo, igual, diferente, diferencia, parecido, parecer, casi, manera, ejemplo, normal, tráfico, aire, espacio, servicio, rápido, lento, práctico, pesado, perezoso, justo, lleno, vacío, demasiado, suficiente, valer, pena

### 21. ¿Me podría ayudar? -- `es-a2-cortesia`

- **Requires:** `es-a2-comparar`.
- **Grammar:** the condicional for polite requests, wishes and advice (`¿Podría...?`, `Me gustaría...`, `Deberías...`); the imperative: affirmative `tú` (`pasa`, `ven`, `dime`) and `usted`/`ustedes` (`pase`, `siéntense`), with attached pronouns (`dígame`), and the negative (`no te preocupes`, `no se preocupe`), whose forms are the present subjunctive, met here only as imperatives; telephone chunks (`¿Con quién hablo?`, `¿Me comunica con...?`, `Un momento, por favor`, `¿Quiere dejar un recado?`, `Se equivocó de número`).
- **Lessons:**
  1. ¿Me podría ayudar?
  2. Me gustaría...
  3. Por teléfono
  4. Pase, siéntese
  5. Un consejo
  6. Un problema
- **Introduces:** problema, consejo, aconsejar, sugerir, pregunta, información, explicar, molestar, preocupar, cuidado, atención, queja, quejar, devolver, arreglar, permiso, adelante, comunicar, recado, marcar, contestar, equivocado, apagar

## B1

B1 sentences run longer (up to about 16 words) and chain clauses, but each lesson still builds them from words, phrases and chunks. A B1 module never uses grammar that a later module introduces: no present subjunctive before module 25 (except the imperatives of module 21 and fixed chunks such as `¡Que te mejores!`), no passive `ser` + participle before module 28, no imperfect subjunctive or unreal `si` before module 29, no backshifted reported speech before module 30, and no subjunctive after `cuando`, `aunque`, `para que` and the other conjunctions before module 31. Where Italian needs the congiuntivo and Spanish doesn't (`creo que` + indicative), or the other way round (`cuando llegue`), the Italian glosses and grammarFocus say so; for English and Dutch, they point out that Spanish marks with the verb what those languages leave to context.

### 22. Imprevistos de viaje -- `es-b1-imprevistos`

- **Requires:** `es-a2-cortesia`.
- **Grammar:** the pluscuamperfecto (`Ya había reservado`, `El avión ya había salido`); `cuando` + indefinido with an earlier event in the pluscuamperfecto; `en cuanto` + indefinido, `después de` and `antes de` + infinitive (no subjunctive yet); `resultar que` (`Resulta que...`); `aún` and `ya` with the past.
- **Lessons:**
  1. Ya había reservado
  2. El avión ya había salido
  3. Perdieron mi equipaje
  4. La huelga
  5. En cuanto aterrizamos
  6. ¡Qué aventura!
- **Introduces:** aerolínea, equipaje, huelga, aduana, frontera, pasajero, abordar, aterrizar, despegar, escala, conexión, cancelar, reclamar, mostrador, advertir, paciencia, aventura, mochila, piloto, terminal, compensación, cuanto, resultar, aún

### 23. ¿Me lo prestas? -- `es-b1-favores`

- **Requires:** `es-b1-imprevistos`.
- **Grammar:** combined pronouns (`me lo`, `te la`, `nos los`), with `le`/`les` becoming `se` before `lo`, `la`, `los`, `las` (`Se lo di`); attached to infinitives, gerunds and imperatives (`prestármelo`, `dámelo`); `irse`, `llevarse`, `quedarse con`, `acabarse` (`Se acabó la leche`); reciprocal `nos` and `se` (`Nos ayudamos`); possessive pronouns `mío`, `tuyo`, `suyo` (`¿Es tuyo?`, `el mío`); `uno mismo`, `yo mismo`.
- **Lessons:**
  1. ¿Me prestas tu taladro?
  2. Te lo devuelvo mañana
  3. ¿Me cuidas las plantas?
  4. Se acabó la leche
  5. Lo hice yo mismo
  6. Cuenta conmigo
- **Introduces:** prestar, prometer, promesa, confiar, cuidar, acabar, regar, recoger, encargar, mío, tuyo, suyo, propio, taladro, herramienta, planta, cargador, paraguas, molestia, generoso

### 24. Busco empleo -- `es-b1-empleo`

- **Requires:** `es-b1-favores`.
- **Grammar:** gerund periphrases: `llevar` + time + gerundio (`Llevo tres meses buscando trabajo`), `seguir` + gerundio (`Sigo esperando`); `acabar de` + infinitive (`Acabo de enviar el currículum`), `volver a` + infinitive (again), `dejar de` + infinitive (stop), `estar a punto de`; the gerund alone for manner (`Aprendí trabajando`).
- **Lessons:**
  1. Llevo meses buscando
  2. Mi currículum
  3. La entrevista
  4. Estoy a punto de renunciar
  5. Aprendí trabajando
  6. El primer día
- **Introduces:** empleo, puesto, vacante, solicitar, solicitud, entrevista, currículum, experiencia, habilidad, formación, pasantía, contratar, contrato, sueldo, ganar, desempleado, sector, empleado, requisito, despedir, renunciar, ascenso, ambición, flexible, desafío, débil, responsable, equipo

### 25. En mi opinión -- `es-b1-opiniones`

- **Requires:** `es-b1-empleo`.
- **Grammar:** the present subjunctive (regular, plus `sea`, `esté`, `vaya`, `haya`, `tenga`, `haga`, `pueda`, `sepa`, `diga`) after doubt and denial (`No creo que...`, `Dudo que...`, `No es verdad que...`) and impersonal judgments (`Es posible que...`, `Es importante que...`, `Es mejor que...`); the indicative after `creo que`, `pienso que`, `me parece que`, `está claro que` (Italian `credo che` takes the congiuntivo; Spanish doesn't); `estar de acuerdo con`, `tener razón`, `depender de`; `no ... sino`.
- **Lessons:**
  1. Creo que tienes razón
  2. No creo que sea verdad
  3. Es posible que...
  4. Estoy de acuerdo
  5. Depende
  6. Mi punto de vista
- **Introduces:** opinión, duda, dudar, convencer, discutir, debate, argumento, apoyar, criticar, exagerar, juzgar, sociedad, social, generación, solución, tema, obvio, falso, prejuicio, contra, según, depender, acuerdo, razón, hecho, realidad, cierto, vista, mayoría, general, además, sino

### 26. Sentimientos -- `es-b1-sentimientos`

- **Requires:** `es-b1-opiniones`.
- **Grammar:** the subjunctive after wishes and requests (`quiero que`, `espero que`, `ojalá`) and emotions (`me alegra que`, `me molesta que`, `tengo miedo de que`), against the infinitive when the subject is the same (`Espero verte` / `Espero que vengas`); the perfect subjunctive (`Me alegra que hayas venido`); feelings with `estar` + adjective and `ponerse` (`Me puse nervioso`).
- **Lessons:**
  1. Espero que estés bien
  2. Me alegra que estés aquí
  3. Me preocupa
  4. Peleas y reconciliaciones
  5. Confío en ti
  6. Quiero que lo sepas
- **Introduces:** sentimiento, emoción, enojado, enojar, molesto, celoso, decepcionado, orgulloso, nervioso, preocupado, emocionado, vergüenza, aliviado, aburrir, calma, humor, amor, relación, pelea, pelear, reconciliar, perdonar, mentir, mentira, extrañar, alegrar, ojalá, importar, odiar, sorprender, confianza

### 27. Libros y películas -- `es-b1-libros`

- **Requires:** `es-b1-sentimientos`.
- **Grammar:** relative pronouns: `que` for people and things; `quien`/`quienes` after a preposition (`la amiga con quien viajé`); `el que`, `la que` after a preposition (`la ciudad en la que pasa la historia`); `lo que` (what, which); `el cual` and `cuyo` for reading; `tratar de` = be about (`¿De qué trata?`).
- **Lessons:**
  1. El libro que estoy leyendo
  2. La amiga de quien te hablé
  3. La ciudad en la que pasa
  4. El escritor que ganó el premio
  5. Lo que más me gustó
  6. Una reseña
- **Introduces:** quien, cual, cuyo, personaje, protagonista, escritor, autor, género, capítulo, página, trama, serie, episodio, reseña, escena, conmovedor, emocionante, publicar, subtítulo, versión, original, éxito, premio, librería, portada, ficción, ciencia, lector, público

### 28. El medio ambiente -- `es-b1-ambiente`

- **Requires:** `es-b1-libros`.
- **Grammar:** passive and impersonal `se` (`Aquí se recicla el vidrio`, `Se venden botellas`, `No se puede fumar`); the passive with `ser` + participle (`El puente fue construido en 1990`), mostly for written reports; `estar` + participle for a result (`Está prohibido`, `Está hecho de plástico`); impersonal `uno` and the third-person plural (`Dicen que...`).
- **Lessons:**
  1. Aquí se recicla el vidrio
  2. Separar la basura
  3. Desperdiciamos demasiado
  4. Está hecho de plástico
  5. Hay que protegerlo
  6. El planeta
- **Introduces:** ambiente, contaminación, contaminar, basura, reciclar, tirar, separar, plástico, papel, vidrio, cartón, contenedor, energía, reducir, desperdiciar, sostenible, renovable, proteger, planeta, tierra, ley, permitir, prohibir, prohibido, regla, ciudadano, producir, panel, solar, electricidad, respetar, destruir, construir, fumar

### 29. Si pudiera... -- `es-b1-suenos`

- **Requires:** `es-b1-ambiente`.
- **Grammar:** the imperfect subjunctive in `-ra` (`pudiera`, `tuviera`, `fuera`, `hiciera`; content never uses the `-se` forms) after `si`, with the conditional (`Si tuviera tiempo, viajaría`); `ojalá` + imperfect subjunctive for unlikely wishes; `como si`; the past unreal (`Si lo hubiera sabido, habría venido`), `habría` + participle and `debería haber` + participle; `millón` and `mil millones` (a `billón` is a million million).
- **Lessons:**
  1. Si tuviera tiempo
  2. Si me ganara la lotería
  3. Ojalá pudiera
  4. Debería haberlo hecho
  5. Si lo hubiera sabido
  6. Mi sueño
- **Introduces:** lotería, millón, lograr, deseo, imaginar, arrepentir, lamentar, oportunidad, valor, riesgo, isla, entero, decisión, perfecto, ideal, error, equivocar, destino, libertad, felicidad

### 30. Las noticias -- `es-b1-noticias`

- **Requires:** `es-b1-suenos`.
- **Grammar:** reported speech with the tense shift (`Dice que está cansada` -> `Dijo que estaba cansada`, `que vendría`, `que había llegado`); reported questions with `si` and question words (`Me preguntó si estaba listo`, `Me preguntó dónde vivía`); reported requests with `pedir que` and `decir que` + imperfect subjunctive (`Me pidió que esperara`); `según` + source.
- **Lessons:**
  1. Dijo que...
  2. Me preguntó si...
  3. Prometió que vendría
  4. El noticiero
  5. Una entrevista
  6. En las redes sociales
- **Introduces:** periodista, reportero, noticiero, artículo, titular, anunciar, declarar, informar, asegurar, confirmar, afirmar, negar, investigar, elección, gobierno, político, presidente, alcalde, votar, compartir, comentario, fuente, delito, difundir, entrevistar, red

### 31. Vivir en el extranjero -- `es-b1-extranjero`

- **Requires:** `es-b1-noticias`.
- **Grammar:** conjunctions that always take the subjunctive (`para que`, `antes de que`, `sin que`, `a menos que`) and those that take it for the future or the hypothetical but the indicative for facts (`cuando`, `en cuanto`, `mientras`, `aunque`: `Cuando llegue, te llamo` / `Cuando llego, te llamo`; `Aunque llueva` / `Aunque llueve`); `ya que`, `así que`, `por eso`, `sin embargo`, `aun así`; `a pesar de` + noun or infinitive; `acostumbrarse a` + noun or infinitive.
- **Lessons:**
  1. Aunque llueva
  2. A pesar del clima
  3. Para que todos entiendan
  4. A menos que...
  5. Ya me acostumbré
  6. Ventajas y desventajas
- **Introduces:** aunque, aun, embargo, pesar, cultura, costumbre, acostumbrar, adaptar, nostalgia, emigrar, inmigrante, acento, ventaja, desventaja, calidad, sistema, ritmo, nacionalidad, mentalidad, directo, integración

## Optional modules

The lemma lists here are suggestions within the theme. The author settles the final list, which must not repeat a lemma any of the module's ancestors introduce (it may use a lemma a later main module lists). An optional module's grammar is that of the module it requires, plus the chunks its lessons need.

| Module | Id | Level | Requires | Order | Lessons (suggested) | Suggested lemmas |
|---|---|---|---|---|---|---|
| En la cocina | `es-a1-cocina` | A1 | `es-a1-restaurante` | 101 | Los ingredientes · Cortar y cocinar · La receta · En la sartén · En el horno · Una cena para amigos | receta, ingrediente, cortar, hervir, freír, hornear, agregar, mezclar, revolver, echar, calentar, cebolla, ajo, mantequilla, harina, sartén, olla, horno, cuchillo, tenedor, cuchara, cucharada, rebanada, pizca, masa, crudo, cocido, fresco |
| Deporte | `es-a1-deporte` | A1 | `es-a1-tiempo-libre` | 102 | ¿Qué deporte practicas? · En el gimnasio · El partido · Ganar y perder · El equipo · Entrenar | equipo, jugador, entrenador, entrenar, ganar, perder, empatar, gol, meter, aficionado, cancha, estadio, béisbol, básquetbol, voleibol, ciclismo, carrera, campeonato, forma, músculo, sudar, árbitro |
| Naturaleza | `es-a1-naturaleza` | A1 | `es-a1-viaje` | 103 | En la montaña · En el lago · Los animales · En el bosque · Una caminata · El tiempo cambia | naturaleza, bosque, selva, río, cerro, volcán, sendero, caminata, pasto, hoja, árbol, animal, pájaro, vaca, oveja, caballo, tormenta, niebla, nube, atardecer, amanecer, fresco, salvaje, acampar, carpa |
| En la oficina | `es-a2-oficina` | A2 | `es-a2-historia` | 104 | La reunión · Los correos · El jefe · Una fecha límite · La entrevista · En el descanso | reunión, gerente, plazo, límite, fecha, proyecto, cliente, contrato, sueldo, entrevista, candidato, currículum, experiencia, contratar, despedir, firmar, imprimir, impresora, escritorio, descanso, extra, turno, horario, correo, informe |
| Tecnología | `es-a2-tecnologia` | A2 | `es-a2-historia` | 105 | Mi celular · La computadora · Olvidé mi contraseña · Descargar la aplicación · No hay internet · Una videollamada | funcionar, laptop, pantalla, teclado, aplicación, contraseña, internet, wifi, sitio, página, descargar, instalar, actualizar, borrar, guardar, conectar, batería, cargador, video, archivo, conexión, usuario, clic, videollamada |
| Arte y cultura | `es-a2-arte` | A2 | `es-a2-que-paso` | 106 | En el museo · Un cuadro famoso · Edificios antiguos · Un concierto · En el teatro · Un poco de historia | arte, artista, cuadro, pintor, pintar, escultura, estatua, exposición, obra, siglo, mural, arquitectura, edificio, ruina, pirámide, guía, famoso, antiguo, moderno, espectáculo, actor, director, novela, escritor, poema, escenario |
| Trámites | `es-a2-tramites` | A2 | `es-a2-cortesia` | 107 | En el correo · En el banco · El formulario · La oficina de migración · Su identificación, por favor · Una cita | correo, paquete, enviar, estampilla, transferencia, depositar, retirar, formulario, llenar, firma, firmar, documento, identificación, licencia, conducir, domicilio, certificado, vencer, renovar, visa, migración, residencia, fila, trámite |
| Había una vez | `es-b1-cuentos` | B1 | `es-b1-libros` | 108 | El rey y la reina · En el bosque · La bruja · El príncipe se fue · El tesoro · Y vivieron felices | The indefinido and imperfecto of story verbs in the third person for reading (`vivía`, `llegó`, `dijo`, `huyó`, `cayó`), `había una vez`, `érase una vez` (a form of `ser`), `convertirse en`. rey, reina, príncipe, princesa, castillo, dragón, bruja, mago, hada, lobo, bosque, caballero, magia, hechizo, espada, tesoro, campesino, torre, volar, huir, rescatar, valiente, astuto, gigante, sapo, veneno, convertir |
| Dinero | `es-b1-dinero` | B1 | `es-b1-empleo` | 109 | Mi cuenta bancaria · Ahorrar · Los impuestos · La hipoteca · Todo sube · Invertir | hipoteca, impuesto, invertir, inversión, interés, préstamo, deuda, crédito, ingreso, aumento, inflación, crisis, economía, presupuesto, automático, pensión, ahorro, bancario, gasto, cobrar |
| Bienestar | `es-b1-bienestar` | B1 | `es-b1-sentimientos` | 110 | Estoy estresado · Dormir bien · Comer sano · Ponerse en forma · Relajarse · Encontrar el equilibrio | bienestar, estrés, estresado, dieta, alimentación, sano, saludable, insomnio, meditación, adelgazar, engordar, vitamina, grasa, proteína, ansiedad, equilibrio, terapeuta, terapia, yoga, mental, físico, rutina, relajar, forma |
