# Quizzer refactor plan: split into multiple files

## Why

quizzer.html is ~3,300 lines with ~77 functions covering i18n strings, an FSRS
spaced-repetition algorithm, CSV parsing, localStorage persistence, DOM
rendering, routing, TTS integration, analytics, and UI event handling. It works
fine, but the single-file format makes it hard for both humans and AI assistants
to navigate, and impossible to unit-test the pure-logic portions.

## Goals

1. Claude (and humans) can open one file and see only one concern.
2. Pure logic (FSRS, CSV parsing, data layer) is testable without a DOM.
3. No build step required. Plain `<script src>` tags, loaded in order.
4. The app continues to work as a standalone page served by Jekyll.

## Proposed file structure

```
quizzer/
  quizzer.html          # HTML markup, CSS, and a short bootstrap <script>
  quizzer-i18n.js       # LANGS object and t(), setLang(), applyNavLabels(), initLangSelect()
  quizzer-data.js       # localStorage helpers, deck CRUD, card state, session recording
  quizzer-fsrs.js       # FSRS algorithm: newCard(), fsrsSchedule(), forgettingCurve(), etc.
  quizzer-csv.js        # parseCSV(), importCSV(), preset loading
  quizzer-ui.js         # routing, all render*() functions, DOM event handlers
  quizzer-tts.js        # TTS button, OpenAI TTS integration
  quizzer-util.js       # shuffle(), clamp(), genId(), esc(), showToast(), showConfirm()
  quizzes/              # (unchanged) preset CSV decks
```

## How modules communicate (no build step)

Each file attaches its exports to a shared namespace:

```js
// quizzer-fsrs.js
window.Q = window.Q || {};
Q.newCard = function() { ... };
Q.fsrsSchedule = function(card, rating, now) { ... };
```

```js
// quizzer-ui.js
window.Q = window.Q || {};
Q.renderHome = function() {
  const counts = Q.getDueCounts(deckName);  // from quizzer-data.js
  ...
};
```

quizzer.html loads scripts in dependency order:

```html
<script src="quizzer-util.js"></script>
<script src="quizzer-i18n.js"></script>
<script src="quizzer-fsrs.js"></script>
<script src="quizzer-csv.js"></script>
<script src="quizzer-data.js"></script>
<script src="quizzer-tts.js"></script>
<script src="quizzer-ui.js"></script>
<script>
  // Bootstrap: migrate data, set up routes, render
  Q.migrateStats();
  Q.handleRoute();
  window.addEventListener('hashchange', Q.handleRoute);
</script>
```

### Alternative: ES modules (slightly cleaner, same zero-build approach)

Since Jekyll serves these files over HTTP (not file://), `<script type="module">`
works in all modern browsers. This gives you real import/export without a bundler:

```js
// quizzer-fsrs.js
export function newCard() { ... }
export function fsrsSchedule(card, rating, now) { ... }

// quizzer-ui.js
import { newCard, fsrsSchedule } from './quizzer-fsrs.js';
```

```html
<script type="module" src="quizzer-ui.js"></script>
```

Pros: explicit dependency graph, no global namespace pollution.
Cons: won't work if someone opens quizzer.html via file:// (unlikely given Jekyll).
Either approach is fine at this scale. The namespace approach is simpler to migrate to.

## Function-to-file mapping

**quizzer-util.js** (~50 lines)
- shuffle(), clamp(), genId(), esc()
- showToast(), showConfirm()

**quizzer-i18n.js** (~1,600 lines - mostly translation strings)
- LANGS object (EN, NL, IT, AR, etc.)
- t(), setLang(), applyNavLabels(), initLangSelect()
- currentLang state

**quizzer-fsrs.js** (~100 lines)
- FSRS constants (w[], DECAY, FACTOR, etc.)
- newCard(), forgettingCurve(), fsrsInterval(), fsrsSchedule()
- cardMasteryState()

**quizzer-csv.js** (~100 lines)
- parseCSV(), importCSV()
- loadPreset(), togglePresetLang(), renderPresetsSection()

**quizzer-data.js** (~150 lines)
- KEYS constant
- load(), save()
- getDecks(), saveDecks(), getStats(), saveStats(), getSessions(), saveSessions()
- getCardState(), saveCardState(), recordSession()
- getDueCounts(), buildStudyQueue()
- migrateStats()
- exportStats(), importJSONFile(), clearAllData()

**quizzer-tts.js** (~60 lines)
- stopTTS(), ttsBtn(), toggleTTS(), playTTS()
- TTS-related settings (saveSettings reads OpenAI key)

**quizzer-ui.js** (~800 lines)
- navigate(), handleRoute()
- renderHome(), renderImport(), setupImport(), handleFiles()
- renderDeckHome(), renderDeckSettings(), renameDeck(), deleteDeck()
- buildDonut(), buildSparkline(), buildMasteryChart(), showChartTip(), hideChartTip()
- getPeakDailyReviewed()
- startStudySession(), renderStudyCard(), handleAnswer(), handleRating(),
  applyRating(), advanceStudy(), recordStudySession(), finishStudy()
- renderSessionSummary(), buildTierBar()
- renderBrowse(), renderStats(), renderSessionDetail()
- renderGlobalSettings(), renderHelp()
- copyPrompt()

## Testing

Once the logic files are split out, add a simple test page:

```
quizzer/
  tests/
    test.html           # loads quizzer-*.js + a minimal test runner
    test-fsrs.js         # unit tests for FSRS scheduling
    test-csv.js          # unit tests for CSV parsing edge cases
    test-data.js         # tests for data layer (uses localStorage mock)
```

Or use Vitest/Node if you prefer CLI tests — the logic files are pure JS with no
DOM dependencies (except quizzer-data.js which uses localStorage, easily mocked).

The highest-value tests are:
1. FSRS scheduling produces correct intervals for each rating
2. CSV parsing handles edge cases (quoted commas, blank lines, missing fields)
3. buildStudyQueue returns cards in the right order for each mode

## Migration approach

1. Extract quizzer-util.js (no dependencies) and verify the app still works.
2. Extract quizzer-i18n.js (big but self-contained).
3. Extract quizzer-fsrs.js (pure math, easy to test immediately).
4. Extract quizzer-csv.js.
5. Extract quizzer-data.js.
6. Extract quizzer-tts.js.
7. What remains in the `<script>` block is quizzer-ui.js + bootstrap code.
   Move the render/UI functions to quizzer-ui.js, leave only the bootstrap.
8. Add tests for fsrs and csv modules.

Each step is independently deployable. The app should work identically after
each extraction.
