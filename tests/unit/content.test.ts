import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { audioFile, loadContent, VOICES } from "../../server/content.ts";

const root = join(import.meta.dirname, "../..");

function loadCourses(...courses: object[]) {
  const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
  mkdirSync(join(dir, "courses/it"), { recursive: true });
  courses.forEach((c, i) => writeFileSync(join(dir, `courses/it/c${i}.json`), JSON.stringify(c)));
  return loadContent(dir, join(dir, "audio"), { requireAudio: false });
}

const unit = (id: string, text: string, extra: object = {}) =>
  ({ id, rev: 1, stage: "sentence", text, translation: "t", distractors: ["d1", "d2"], ...extra });

const base = {
  id: "it-test", language: "it", level: "A1", order: 1, title: "T", description: "D", track: "main", requires: [] as string[],
  introduces: ["lo", "prendere"],
  lexicon: { "lo#pron": { lemma: "lo", pos: "PRON", gloss: "it" }, prendo: { lemma: "prendere", pos: "VERB", gloss: "I take" } } as Record<string, object>,
  lessons: [{ id: "it-test-1", title: "L", grammarFocus: [], units: [unit("it-test-1-u01", "Lo prendo.", { senses: { "0": "pron" } })] as Record<string, unknown>[] }],
};

/** A course that requires `base` and reuses its words. */
const child = (over: object = {}) => ({
  ...structuredClone(base), id: "it-next", order: 2, requires: ["it-test"], introduces: [], lexicon: {},
  lessons: [{ id: "it-next-1", title: "L", grammarFocus: [], units: [unit("it-next-1-u01", "Lo prendo!", { senses: { "0": "pron" } })] }],
  ...over,
});

describe("content loading", () => {
  it("loads the real content for every language", () => {
    const c = loadContent(join(root, "content"), join(root, "content/audio"), { requireAudio: false });
    expect(new Set(c.courses.map((x) => x.language))).toEqual(new Set(["en", "it", "nl"]));
  });

  it("serves one audio URL per voice for the unit and each word, in voice order", () => {
    const c = loadContent(join(root, "tests/fixtures/content"), join(root, "content/audio"), { requireAudio: false });
    const u = c.units.get("it-a1-bar-2-u09")!;
    expect(u.words.map((w) => `${w.text}:${w.pos}`)).toEqual(["Lo:PRON", "prendo:VERB", "grazie:INTJ"]);
    expect(u.audio).toEqual(VOICES.it.map((v) => `/audio/${audioFile("it", v, "Lo prendo, grazie.")}`));
    expect(u.words[0].audio).toEqual(VOICES.it.map((v) => `/audio/${audioFile("it", v, "lo")}`));
    expect(new Set(u.audio).size).toBe(VOICES.it.length);
  });

  it("resolves senses and shares audio for identical text", () => {
    const c = loadCourses(base);
    expect(c.units.get("it-test-1-u01")!.words[0].lemma).toBe("lo");
    expect(new Set(c.audioJobs.map((j) => j.file)).size).toBe(c.audioJobs.length);
  });

  it("rejects a word without a lexicon entry, an unused entry, and a lesson not ending in a sentence", () => {
    const noSense = structuredClone(base);
    delete noSense.lessons[0].units[0].senses;
    expect(() => loadCourses(noSense)).toThrow(/no lexicon entry "lo"/);

    const unused = structuredClone(base);
    unused.lexicon.extra = { lemma: "x", pos: "NOUN", gloss: "x" };
    expect(() => loadCourses(unused)).toThrow(/unused lexicon entries: extra/);

    const noSentence = structuredClone(base);
    noSentence.lessons[0].units[0].stage = "chunk";
    expect(() => loadCourses(noSentence)).toThrow(/must end with a sentence/);
  });

  it("requires distractors with a translation, end marks on sentences, and none on words", () => {
    const noDistractors = structuredClone(base);
    delete noDistractors.lessons[0].units[0].distractors;
    expect(() => loadCourses(noDistractors)).toThrow(/needs distractors/);

    const noEnd = structuredClone(base);
    noEnd.lessons[0].units[0].text = "Lo prendo";
    expect(() => loadCourses(noEnd)).toThrow(/must end with \. ! or \?/);

    const word = structuredClone(base);
    word.lessons[0].units.unshift(unit("it-test-1-u00", "prendo.", { stage: "word" }));
    expect(() => loadCourses(word)).toThrow(/is a word and must not end/);
  });

  it("checks optional comma positions", () => {
    const ok = structuredClone(base);
    ok.lessons[0].units[0].commas = [0];
    expect(loadCourses(ok).units.get("it-test-1-u01")!.commas).toEqual([0]);

    const outOfRange = structuredClone(base);
    outOfRange.lessons[0].units[0].commas = [1];
    expect(() => loadCourses(outOfRange)).toThrow(/comma position 1 is not between two words/);

    const doubled = structuredClone(base);
    doubled.lessons[0].units[0].text = "Lo, prendo.";
    doubled.lessons[0].units[0].commas = [0];
    expect(() => loadCourses(doubled)).toThrow(/already has a comma/);
  });

  it("inherits lexicon and lemmas from required courses", () => {
    const c = loadCourses(base, child());
    expect(c.units.get("it-next-1-u01")!.words[1].gloss).toBe("I take");
    expect(c.courses.find((x) => x.id === "it-next")!.requires).toEqual(["it-test"]);
  });

  it("enforces lemma introduction: once, before use, and actually used", () => {
    expect(() => loadCourses(child())).toThrow(/requires unknown course it-test/);
    expect(() => loadCourses(base, child({ requires: [] }))).toThrow(/no lexicon entry "lo#pron"/);
    expect(() => loadCourses(base, child({ introduces: ["prendere"] }))).toThrow(/introduces "prendere", already introduced by it-test/);
    expect(() => loadCourses(base, child({ introduces: ["tè"] }))).toThrow(/introduces lemmas it never uses: tè/);

    const notIntroduced = structuredClone(base);
    notIntroduced.introduces = ["lo"];
    expect(() => loadCourses(notIntroduced)).toThrow(/lemma "prendere" \("prendo"\) is not introduced/);
  });

  it("rejects requires cycles and a main course requiring an optional one", () => {
    const a = child({ id: "it-a", requires: ["it-b"], lessons: [{ id: "it-a-1", title: "L", grammarFocus: [], units: [unit("it-a-1-u01", "Lo prendo!", { senses: { "0": "pron" } })] }] });
    const b = child({ id: "it-b", requires: ["it-a", "it-test"], lessons: [{ id: "it-b-1", title: "L", grammarFocus: [], units: [unit("it-b-1-u01", "Lo prendo?", { senses: { "0": "pron" } })] }] });
    expect(() => loadCourses(base, a, b)).toThrow(/requires cycle/);

    expect(() => loadCourses({ ...base, track: "optional" }, child())).toThrow(/main-track course requires optional it-test/);
  });

  it("fails when audio is required and missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
    expect(() => loadContent(join(root, "tests/fixtures/content"), dir, { requireAudio: true })).toThrow(/audio files missing/);
  });
});
