# English curriculum plan

The English instance of [curriculum.md](curriculum.md): American English (US spelling, dollars, miles, Fahrenheit, US settings) for learners whose support language is Latin American Spanish (`es-419`) or Italian (`it`). Each module lists its course id, its requirements, its grammar focus, its six lessons, and the lemmas it `introduces`. A module may use its own lemmas plus every lemma introduced by the modules it requires, transitively. For main modules, that means every earlier main module.

The lemma lists are the core-vocabulary plan and decide ordering. A module author may add up to about 10 extra lemmas when natural sentences need them, but only lemmas that no module in this plan lists. Optional modules may also introduce lemmas that a later main module lists, because main modules never require them.

## Support languages

Every localized field carries exactly `es-419` and `it` (`SUPPORT_LOCALES.en`). There is no `en` text: a learner whose UI is English or Dutch falls back to `es-419`.

- **Translations** are natural Spanish and Italian, not word-for-word: `Can I have a muffin, too?` -> `¿Me da un muffin también?` / `Posso avere anche un muffin?`. Spanish is neutral Latin American (`ustedes`, `celular`, `jugo`), and Spanish questions and exclamations take `¿` and `¡`.
- **Distractors** follow [curriculum.md](curriculum.md) in each language separately. They must never also be a correct translation. A sentence's options all end in `.`, `!` or `?`, and a word's, phrase's or chunk's never do.
- **Glosses** are short: the meaning, then what trips up a Spanish or Italian speaker, flagged `¡ojo!` / `attenzione:`. That covers false friends (`large` is not `largo`, `actually` is not `actualmente`/`attualmente`, `parents` are not `parientes`/`parenti`), homophones (`to`/`too`/`two`, `their`/`there`/`they're`, `its`/`it's`) and structures that differ (`I'm thirty` with `be`, `My head hurts`, `She's a nurse` with the article).
- **grammarFocus** labels are in each support language and may quote English (`a y an: an antes de sonido vocálico`).

## Lemma conventions

- **Nouns:** the singular, including irregular plurals (`children` -> `child`, `people` -> `person`, `teeth` -> `tooth`).
- **Verbs:** the base form. Every form shares one lemma (`am`, `is`, `was`, `been` -> `be`; `went`, `gone` -> `go`; `used to` -> `use`). `could` -> `can`. `would`, `will`, `should` and `must` are their own lemmas.
- **Adjectives and adverbs:** the base form, and regular comparatives and superlatives share it (`bigger`, `biggest` -> `big`). The irregulars `better`, `best`, `worse`, `worst` and the words `more`, `most`, `less`, `least` are their own lemmas. `-ly` adverbs are their own lemmas (`slowly`, `really`).
- **Pronouns and determiners:** every form is its own lemma (`I me my mine myself`, `he him his`, `she her`, `we us our`, `they them their`). `her` is one lemma for both object and possessive. `a` and `an` -> `a`.
- **Contractions** are one token and take the lemma of the verb or auxiliary they contain: `I'm`, `it's`, `what's`, `there's`, `isn't` -> `be`; `don't`, `doesn't`, `didn't` -> `do`; `can't` -> `can`; `won't`, `I'll` -> `will`; `I'd` -> `would` (or `have` for `I'd been`, with a sense key); `I've` -> `have`; `let's` -> `let`. Every unit whose text has a contraction lists the full form as a variant (`I'd like` -> `I would like`). The two exceptions are `let's` and `o'clock`, which have no everyday full form.
- **Possessive `'s`** is part of the token and takes the noun's lemma (`sister's` -> `sister`). `Anna's` is `PROPN`.
- **Hyphenated words** are one token and one lemma (`twenty-one`, `t-shirt`, `round-trip`). Compound numerals are introduced by the module that first uses them. **Open compounds** are separate tokens, each with its own lemma (`ice cream` -> `ice` + `cream`, `living room` -> `living` + `room`), and the gloss of each part explains the compound.
- **Phrasal-verb particles** are their own lemmas (`up`, `out`, `on`, `off`, `away`, `back`, `down`).
- **Days, months, nationalities and languages** are lemmas (`Monday`, `May`, `Spanish`), capitalized in the lemma and lowercase as lexicon keys. Titles `Mr.`, `Ms.`, `Mrs.` are nouns with lemmas `Mr`, `Ms`, `Mrs` (the tokenizer drops the period); the text keeps the period.
- **Proper nouns** (`PROPN`: people, cities, countries, holidays such as `Thanksgiving`) are never introduced and may appear anywhere.
- **Senses:** give a surface a sense key only when two lemmas share it (`left#leave` beside `left` the direction) or when one lemma needs a different gloss in another use (`like#prep` in `what's it like?`, `course#idiom` in `of course`).

## A1

### 1. At the café -- `en-a1-cafe`

- **Requires:** nothing.
- **Grammar:** `I'd like` + noun; `a/an`; `the`; `Can I have...?` / `Can I get...?` / `Could we get...?` as chunks; `it's` = `it is`; `How much is it?`; numbers two to five.
- **Lessons:**
  1. A coffee, please
  2. How much is it?
  3. Something to drink
  4. Hot or iced?
  5. For here or to go?
  6. Cash or card?
- **Introduces:** hi, yes, no, sorry, excuse, please, thank, thanks, welcome, okay, sure, here, what, would, like, have, get, can, pay, be, go, drink, a, the, and, or, with, for, to, of, by, too, all, else, anything, nothing, how, much, it, I, me, you, we, your, dollar, check, card, cash, change, coffee, tea, milk, sugar, water, juice, orange, muffin, bagel, sandwich, cookie, beer, wine, glass, bottle, cup, hot, iced, cold, small, large, two, three, four, five

### 2. Nice to meet you! -- `en-a1-hello`

- **Requires:** `en-a1-cafe`.
- **Grammar:** `be` in the singular with contractions (`I'm`, `you're`, `he's`, `she's`); `not` (`I'm not`, `she isn't`) and yes/no questions (`Are you...?`); `What's your name?` / `My name is...`; `from` + place; nationalities and languages, always capitalized; classroom chunks with `do` (`I don't understand`, `How do you spell it?`, `Can you say that again?`, `more slowly`).
- **Lessons:**
  1. Hello!
  2. What's your name?
  3. Where are you from?
  4. Good morning, Ms. Lee
  5. I don't understand
  6. This is my friend
- **Introduces:** hello, bye, goodbye, good, morning, afternoon, evening, night, nice, meet, see, later, name, my, he, she, this, that, who, where, from, in, live, fine, well, very, not, but, so, also, friend, Mr, Ms, Mrs, country, city, American, English, Spanish, Italian, Mexican, Colombian, Argentinian, Canadian, French, German, Dutch, speak, understand, repeat, spell, say, do, slowly, more, word, mean, again, little, bit

### 3. Numbers and time -- `en-a1-numbers`

- **Requires:** `en-a1-hello`.
- **Grammar:** numbers to 100 (hyphenated `twenty-one`); age with `be` (`I'm thirty`, `I'm thirty years old`: Spanish `tener`, Italian `avere`); `What time is it?`, `It's ten thirty`, `a quarter after five`, `half past six`; `at` + clock time, `on` + day; `What time does it open?` with `does` as a chunk.
- **Lessons:**
  1. Zero to twenty
  2. How old are you?
  3. Your phone number
  4. What time is it?
  5. What time does it open?
  6. The days of the week
- **Introduces:** one, zero, six, seven, eight, nine, ten, eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, hundred, old, year, time, o'clock, half, past, quarter, after, noon, midnight, minute, hour, day, week, today, tomorrow, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, number, phone, cell, open, close, closed, store, at, on, until, now, early, late, which

### 4. My family -- `en-a1-family`

- **Requires:** `en-a1-numbers`.
- **Grammar:** plurals (`-s`, `-es`, `-ies`) and `children`, `men`, `women`, `people`; `have/has` for every person; possessives `his`, `her`, `our`, `their` and `'s` (`my sister's name`); adjectives go before the noun and never take a plural; full `be` (`we're`, `they're`); object pronouns `him`, `her`, `us`, `them`; `What's she like?` vs. `What does she look like?`.
- **Lessons:**
  1. My family
  2. Brothers and sisters
  3. What's she like?
  4. Tall or short?
  5. My grandparents
  6. A big family
- **Introduces:** family, father, mother, dad, mom, parent, son, daughter, brother, sister, husband, wife, grandfather, grandmother, grandparent, uncle, aunt, cousin, child, kid, baby, boy, girl, man, woman, person, they, him, her, us, them, his, our, their, married, single, boyfriend, girlfriend, tall, short, young, beautiful, pretty, big, friendly, kind, funny, hair, eye, blue, brown, blond, dark, long, dog, cat, only, house, both, look

### 5. Work and school -- `en-a1-work`

- **Requires:** `en-a1-family`.
- **Grammar:** the simple present for every person, with third-person `-s` (`works`, `studies`, `teaches`); `do/does` questions and `don't/doesn't`; `a/an` with jobs (`She's a nurse`, where Spanish and Italian drop the article); `at`, `in` and `for` with workplaces (`at a bank`, `in an office`, `for a company`); `want to` + verb.
- **Lessons:**
  1. What do you do?
  2. Where do you work?
  3. I study English
  4. Languages
  5. A new job
  6. Coworkers
- **Introduces:** work, study, teach, learn, want, job, student, teacher, doctor, nurse, engineer, lawyer, waiter, cook, cashier, architect, retired, coworker, boss, office, school, college, university, hospital, company, factory, bank, restaurant, language, class, test, hard, easy, interesting, boring, happy, new, Chinese, Japanese, Portuguese

### 6. My day -- `en-a1-day`

- **Requires:** `en-a1-work`.
- **Grammar:** the simple present for routines; phrasal verbs `get up`, `wake up`, `get dressed`, `go to bed`; frequency adverbs before the main verb and after `be` (`I always get up early`, `I'm never late`); `at`, `in`, `on` with times (`at seven`, `in the morning`, `on Mondays`); `go to work`, `go home`, `go to bed` with no article.
- **Lessons:**
  1. In the morning
  2. I get up early
  3. Lunchtime
  4. In the afternoon
  5. In the evening
  6. Always, often, never
- **Introduces:** wake, up, take, shower, brush, tooth, dressed, breakfast, lunch, dinner, eat, sleep, read, watch, TV, book, news, leave, home, bed, finish, start, always, usually, often, sometimes, never, then, before, every, around, back, tired, relax, quiet, busy

### 7. Around town -- `en-a1-city`

- **Requires:** `en-a1-day`.
- **Grammar:** `there is / there are` and `Is there...?`; imperatives for directions (`Turn left`, `Go straight`, `Don't cross here`); `have to` + verb; `come` and `go`; `Do you know where the station is?` with statement word order after the question word; place prepositions (`next to`, `across from`, `between`, `behind`, `in front of`, `on the corner`); ordinals (`the second street on the right`).
- **Lessons:**
  1. Where's the station?
  2. Is there a pharmacy near here?
  3. Left and right
  4. By bus or on foot?
  5. I have to change trains
  6. Downtown
- **Introduces:** come, know, turn, cross, keep, find, walk, drive, there, left, right, straight, near, far, next, across, between, behind, front, corner, light, block, street, avenue, downtown, station, stop, bus, subway, train, taxi, foot, car, bike, pharmacy, supermarket, museum, church, park, place, first, second, third, thousand, way, map, mile, lost

### 8. At the restaurant -- `en-a1-restaurant`

- **Requires:** `en-a1-city`.
- **Grammar:** `like`, `love`, `don't like` + noun, with countable nouns in the plural (`I like tomatoes`); countable vs. uncountable, with `some` and `any`; `I'll have...` as a chunk (`will`); `Would you like...?`; `hungry` and `thirsty` with `be` (Spanish `tener`, Italian `avere`).
- **Lessons:**
  1. A table for two
  2. The menu
  3. Appetizers and main courses
  4. I like it, I don't like it
  5. I'm hungry
  6. Dessert and the check
- **Introduces:** love, hate, prefer, order, recommend, bring, reservation, table, menu, dish, appetizer, main, course, side, dessert, pasta, pizza, rice, meat, fish, chicken, vegetable, salad, potato, fries, tomato, cheese, bread, oil, salt, fruit, apple, ice, cream, soup, food, delicious, bad, great, spicy, vegetarian, hungry, thirsty, some, any, without, enough, will

### 9. Free time -- `en-a1-free-time`

- **Requires:** `en-a1-restaurant`.
- **Grammar:** `can` and `can't` for ability; `like` and `love` + `-ing` (`I like swimming`); `play soccer` with no article vs. `play the guitar`; invitations (`Do you want to...?`, `Would you like to...?`, `How about...?`) and answers (`I'd love to`, `Sorry, I can't`); question words `why`, `when`, `who ... with`.
- **Lessons:**
  1. What do you do in your free time?
  2. Do you play soccer?
  3. Music
  4. Do you want to come?
  5. Sorry, I can't
  6. The weekend
- **Introduces:** free, play, listen, dance, sing, swim, run, travel, invite, sport, soccer, tennis, basketball, music, guitar, piano, song, movie, concert, theater, party, pool, gym, together, why, because, when, idea, unfortunately, maybe, weekend, tonight, fun, favorite, either, really, hang, out, game

### 10. Shopping -- `en-a1-shopping`

- **Requires:** `en-a1-free-time`.
- **Grammar:** `this`, `that`, `these`, `those`; colors as adjectives, with no agreement; quantities (`a pound of`, `a dozen`, `a bag of`); `how much` vs. `how many`; `one` and `ones` (`the red one`); `try on` (`Can I try it on?`).
- **Lessons:**
  1. At the market
  2. A pound of...
  3. What color is it?
  4. What size?
  5. Can I try it on?
  6. At the register
- **Introduces:** buy, sell, try, spend, cost, wear, fit, these, those, color, black, white, red, green, yellow, gray, pink, purple, size, shirt, t-shirt, pants, jeans, skirt, dress, jacket, coat, shoe, bag, sweater, market, register, receipt, sale, price, expensive, cheap, tight, pound, dozen, egg, banana, money, many

### 11. Travel -- `en-a1-travel`

- **Requires:** `en-a1-shopping`.
- **Grammar:** the present continuous for now (`It's raining`, `What are you doing?`) and for near plans (`I'm leaving tomorrow`); dates (`May third`, `on May third`); weather (`It's sunny`, `What's the weather like?`); `next` and `last`; `arrive in/at`, `leave for`.
- **Lessons:**
  1. A ticket to Chicago
  2. The train is late
  3. At the hotel
  4. What's the weather like?
  5. The seasons
  6. On vacation
- **Introduces:** trip, vacation, tourist, arrive, visit, stay, ticket, round-trip, one-way, plane, airport, gate, flight, delayed, suitcase, passport, hotel, room, key, elevator, beach, mountain, lake, ocean, sun, sunny, rain, snow, wind, windy, cloudy, degree, weather, season, spring, summer, fall, winter, month, January, February, March, April, May, June, July, August, September, October, November, December, last

## A2

### 12. Last weekend -- `en-a2-weekend`

- **Requires:** `en-a1-travel`.
- **Grammar:** the simple past of regular verbs (`-ed`, its spelling and its three sounds) and of common irregulars (`went`, `had`, `did`, `saw`, `ate`, `took`, `made`, `got`, `bought`, `said`, `came`, `left`); `did` questions and `didn't`; `yesterday`, `last`, `ago`; the present perfect with `already`, `yet` and `just`, as chunks.
- **Lessons:**
  1. What did you do yesterday?
  2. We ate out
  3. A week ago
  4. Have you already...?
  5. I lost my keys
  6. My weekend
- **Introduces:** yesterday, ago, already, yet, just, finally, make, lose, forget, clean, wash, groceries, message, text, call, help, tell, ask, answer, wait, hear, decide, put, choose, someone, something, nobody, photo, send

### 13. My story -- `en-a2-story`

- **Requires:** `en-a2-weekend`.
- **Grammar:** the past of `be` (`was`, `were`, `wasn't`) and `was born`; more irregular past forms (`grew up`, `became`, `met`, `fell in love`); life events (`move`, `get married`, `graduate`); the present perfect for experience (`Have you ever...?`, `I've never...`, `been` vs. `gone`).
- **Lessons:**
  1. I went to New York
  2. We got there late
  3. I was born in...
  4. I moved to...
  5. We got married
  6. My life
- **Introduces:** born, die, grow, become, move, graduate, life, story, wedding, high, abroad, north, south, east, west, state, age, during, sad, ever

### 14. When I was a kid -- `en-a2-childhood`

- **Requires:** `en-a2-story`.
- **Grammar:** `used to` + verb and `didn't use to`; the simple past for past states and habits; `when I was a kid`; `remember` + `-ing`.
- **Lessons:**
  1. When I was little
  2. We used to play outside
  3. Every summer
  4. At school
  5. I was scared
  6. I remember
- **Introduces:** childhood, remember, countryside, farm, lot, toy, doll, ball, tree, yard, outside, classmate, afraid, scared, cry, laugh, animal, dream, shy, draw, believe, homework, use

### 15. What happened? -- `en-a2-happened`

- **Requires:** `en-a2-childhood`.
- **Grammar:** the past continuous (`was/were` + `-ing`); past continuous for the background vs. simple past for the event, with `while` and `when`; story markers (`suddenly`, `luckily`, `at first`, `in the end`).
- **Lessons:**
  1. While I was walking...
  2. Suddenly
  3. Someone stole my wallet
  4. An accident
  5. Luckily
  6. A strange day
- **Introduces:** happen, while, suddenly, moment, break, steal, wallet, police, accident, noise, shout, notice, hit, away, luck, lucky, luckily, strange, dangerous, end

### 16. At the doctor's -- `en-a2-doctor`

- **Requires:** `en-a2-happened`.
- **Grammar:** `feel` + adjective (`I feel sick`); `My head hurts` / `I have a headache` (Spanish `me duele`, Italian `mi fa male`); `should` and `shouldn't` for advice; `How long have you had...?` with `for` and `since`; dosage chunks (`twice a day`, `after meals`).
- **Lessons:**
  1. I don't feel well
  2. My head hurts
  3. At the doctor's office
  4. I have a fever
  5. At the pharmacy
  6. I feel better
- **Introduces:** health, sick, better, feel, pain, fever, cough, flu, head, headache, throat, stomach, arm, leg, hand, ear, nose, mouth, body, medicine, pill, prescription, appointment, meal, should, rest, breathe, allergic, temperature, serious, strong, emergency, need, hurt, since, twice, once

### 17. The new apartment -- `en-a2-home`

- **Requires:** `en-a2-doctor`.
- **Grammar:** object pronouns with phrasal verbs (`put it away`, `pick them up`, never `put away it`); `much`, `many`, `a lot of`, `a few`; place prepositions (`on`, `under`, `in`, `above`, `inside`, `in the middle of`); `there's` and `there are` to describe a place.
- **Lessons:**
  1. I'm looking for an apartment
  2. The rooms
  3. The rent
  4. Moving day
  5. Where should I put it?
  6. The neighbors
- **Introduces:** apartment, bathroom, bedroom, kitchen, living, balcony, window, door, stairs, closet, chair, couch, lamp, mirror, fridge, oven, rent, landlord, neighbor, neighborhood, area, above, under, inside, middle, furnished, bright, noisy, comfortable, modern, heating, bill, dirty, box, furniture, include, floor, wall, few, pick, down

### 18. Gifts and holidays -- `en-a2-parties`

- **Requires:** `en-a2-home`.
- **Grammar:** two objects (`give her a gift`, `give it to her`), and `get` or `buy` + person; third-person `likes`/`loves` for every person; dates with `on` (`on July fourth`); wishes and replies (`Happy birthday!`, `Congratulations!`, `Cheers!`).
- **Lessons:**
  1. Happy birthday!
  2. What should I get him?
  3. She loves flowers
  4. The party
  5. Thanksgiving and New Year's
  6. Thanks for the gift
- **Introduces:** gift, present, give, celebrate, wish, cake, candle, guest, anniversary, flower, chocolate, surprise, offer, date, toast, cute, useful, tradition, invitation, birthday, congratulations, cheers, holiday, turkey, wrap

### 19. Plans -- `en-a2-plans`

- **Requires:** `en-a2-parties`.
- **Grammar:** `be going to` for plans; `will` and `won't` for decisions and predictions; the first conditional (`if` + present, `will`); `in` + time (`in two weeks`); `think about/of` + `-ing`, `hope to`, `plan to`.
- **Lessons:**
  1. Next year
  2. In two weeks
  3. If I have time...
  4. I'm thinking of changing jobs
  5. Maybe
  6. A big plan
- **Introduces:** think, hope, plan, future, if, probably, organize, prepare, save, goal, world, possible, important, soon, someday, begin

### 20. Better or worse -- `en-a2-comparing`

- **Requires:** `en-a2-plans`.
- **Grammar:** comparatives (`-er`, `more ... than`) and `(not) as ... as`; superlatives (`the -est`, `the most`) with `in` and `of`; irregular `better/best`, `worse/worst`; `too` and `enough`; `the same as`, `different from`.
- **Lessons:**
  1. Bigger and smaller
  2. City or country?
  3. The best
  4. Really beautiful!
  5. The same or different?
  6. Better this way
- **Introduces:** than, as, best, worse, worst, most, less, least, traffic, air, space, service, fast, slow, practical, heavy, smart, lazy, difference, similar, different, same, climate, seem, almost, instead, fair, safe, crowded

### 21. Could you help me? -- `en-a2-polite`

- **Requires:** `en-a2-comparing`.
- **Grammar:** polite requests (`Could you...?`, `Would you mind` + `-ing`, `Do you mind if I...?`); `would like`, `would love`, `would rather`; imperatives with `please` and `don't` (`Please have a seat`, `Don't worry`); telephone chunks (`This is...`, `Can I leave a message?`, `Hold on`).
- **Lessons:**
  1. Could you help me?
  2. I'd love to
  3. On the phone
  4. Please have a seat
  5. Some advice
  6. A problem
- **Introduces:** mind, seat, line, hold, wrong, problem, advice, suggest, question, information, explain, bother, worry, careful, attention, complaint, return, refund, rather, apologize, sir, ma'am, fix

## Optional modules

The lemma lists here are suggestions within the theme. The author settles the final list, which must not repeat a lemma any of the module's ancestors introduce.

| Module | Id | Level | Requires | Order | Lessons (suggested) | Suggested lemmas |
|---|---|---|---|---|---|---|
| In the kitchen | `en-a1-kitchen` | A1 | `en-a1-restaurant` | 101 | The ingredients · Cut and cook · The recipe · In the pan · In the oven · Dinner for friends | recipe, ingredient, cut, boil, fry, bake, add, mix, stir, pour, heat, onion, garlic, butter, flour, pepper, pan, pot, knife, fork, spoon, plate, slice, raw, fresh, ready, taste, sauce, oven |
| Sports | `en-a1-sports` | A1 | `en-a1-free-time` | 102 | What sports do you play? · At the gym · The game · Winning and losing · The team · Working out | team, player, coach, practice, win, lose, tie, score, goal, fan, field, stadium, baseball, football, volleyball, ski, race, league, point, shape, muscle, exercise, sweat, match |
| Nature | `en-a1-nature` | A1 | `en-a1-travel` | 103 | In the mountains · At the lake · Animals · In the woods · A hike · The weather changes | nature, forest, woods, river, hill, top, trail, hike, field, grass, leaf, tree, animal, bird, cow, sheep, horse, wolf, bear, storm, fog, cloud, sunset, sunrise, fresh, wild, camp, tent |
| At the office | `en-a2-office` | A2 | `en-a2-story` | 104 | The meeting · Email · The boss · A deadline · The job interview · On a break | meeting, manager, deadline, project, client, contract, salary, interview, candidate, résumé, experience, hire, fire, sign, print, printer, desk, break, overtime, shift, schedule, email, report |
| Technology | `en-a2-tech` | A2 | `en-a2-story` | 105 | My phone · The computer · I forgot my password · Download the app · The internet is down · A video call | computer, laptop, screen, keyboard, app, password, account, internet, wi-fi, website, download, upload, install, update, delete, save, log, battery, charger, video, file, connection, user, click |
| Arts and culture | `en-a2-arts` | A2 | `en-a2-happened` | 106 | At the museum · A famous painting · Old buildings · A concert · At the theater · A little history | art, artist, painting, painter, paint, sculpture, statue, exhibit, century, architecture, building, ruin, guide, famous, ancient, modern, show, actor, director, novel, writer, poem, stage, history |
| Paperwork | `en-a2-paperwork` | A2 | `en-a2-polite` | 107 | At the post office · At the bank · The form · The driver's license · Your ID, please · An appointment | mail, package, ship, stamp, envelope, account, checking, savings, transfer, deposit, withdraw, form, fill, signature, document, license, driver, social, security, address, certificate, expire, renew, visa, ID |
