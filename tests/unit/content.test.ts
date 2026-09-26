import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { audioFile, loadContent, VOICES } from "../../server/content.ts";
import { pickVoice } from "../../shared/content.ts";

const root = join(import.meta.dirname, "../..");

function loadCourses(...courses: object[]) {
  return loadWithFixes(null, ...courses);
}

function loadWithFixes(fixes: object | null, ...courses: object[]) {
  const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
  mkdirSync(join(dir, "courses/it"), { recursive: true });
  courses.forEach((c, i) => writeFileSync(join(dir, `courses/it/c${i}.json`), JSON.stringify(c)));
  if (fixes) writeFileSync(join(dir, "audio-fixes.json"), JSON.stringify(fixes));
  return loadContent(dir, join(dir, "audio"), { audio: "skip" });
}

/** Every localized field in the Italian test courses carries exactly en, es-419 and nl. */
const tr = <T>(en: T, es: T, nl: T) => ({ en, "es-419": es, nl });

const unit = (id: string, text: string, extra: object = {}) =>
  ({ id, rev: 1, stage: "sentence", text, translation: tr("t", "t-es", "t-nl"), distractors: tr(["d1", "d2"], ["d1-es", "d2-es"], ["d1-nl", "d2-nl"]), ...extra });

const base = {
  id: "it-test", language: "it", level: "A1", order: 1, title: "T", description: tr("D", "D-es", "D-nl"), track: "main", requires: [] as string[],
  introduces: ["lo", "prendere"],
  lexicon: {
    "lo#pron": { lemma: "lo", pos: "PRON", gloss: tr("it", "lo", "het") },
    prendo: { lemma: "prendere", pos: "VERB", gloss: tr("I take", "tomo", "ik neem") },
  } as Record<string, { lemma: string; pos: string; gloss: Record<string, string> }>,
  lessons: [{ id: "it-test-1", title: "L", grammarFocus: tr<string[]>([], [], []), units: [unit("it-test-1-u01", "Lo prendo.", { senses: { "0": "pron" } })] as Record<string, unknown>[] }],
};

/** A course that requires `base` and reuses its words. */
const child = (over: object = {}) => ({
  ...structuredClone(base), id: "it-next", order: 2, requires: ["it-test"], introduces: [], lexicon: {},
  lessons: [{ id: "it-next-1", title: "L", grammarFocus: tr<string[]>([], [], []), units: [unit("it-next-1-u01", "Lo prendo!", { senses: { "0": "pron" } })] }],
  ...over,
});

describe("content loading", () => {
  it("loads the real content for every language", () => {
    const c = loadContent(join(root, "content"), join(root, "content/audio"), { audio: "skip" });
    expect(new Set(c.locales.en.courses.map((x) => x.language))).toEqual(new Set(["en", "it", "nl", "ga"]));
  });

  it("serves one audio URL per voice for the unit and each word, in voice order", () => {
    const c = loadContent(join(root, "tests/fixtures/content"), join(root, "content/audio"), { audio: "skip" });
    const u = c.locales.en.units.get("it-a1-bar-2-u09")!;
    expect(u.words.map((w) => `${w.text}:${w.pos}`)).toEqual(["Lo:PRON", "prendo:VERB", "grazie:INTJ"]);
    expect(u.audio).toEqual(VOICES.it.map((v) => `/audio/${audioFile("it", v, "Lo prendo, grazie.")}`));
    expect(u.words[0].audio).toEqual(VOICES.it.map((v) => `/audio/${audioFile("it", v, "lo")}`));
    expect(new Set(u.audio).size).toBe(VOICES.it.length);
  });

  it("resolves senses and shares audio for identical text", () => {
    const c = loadCourses(base);
    expect(c.locales.en.units.get("it-test-1-u01")!.words[0].lemma).toBe("lo");
    expect(new Set(c.audioJobs.map((j) => j.file)).size).toBe(c.audioJobs.length);
  });

  it("renders an audio fix into a new file for that voice and text only, including word audio", () => {
    const fix = { say: "Lo." };
    const c = loadWithFixes({ it: { "kokoro:if_sara": { lo: fix } } }, base);
    const u = c.locales.en.units.get("it-test-1-u01")!;
    expect(u.words[0].audio).toEqual(VOICES.it.map((v) => `/audio/${audioFile("it", v, "lo", v.model === "if_sara" ? fix : undefined)}`));
    expect(u.words[0].audio[2]).not.toBe(`/audio/${audioFile("it", VOICES.it[2], "lo")}`);
    expect(u.audio).toEqual(VOICES.it.map((v) => `/audio/${audioFile("it", v, "Lo prendo.")}`));
    expect(c.audioJobs.find((j) => `/audio/${j.file}` === u.words[0].audio[2])).toMatchObject({ text: "lo", fix });
  });

  it("reads a unit with a speaker only in voices of that gender, renders nothing for the others, and keeps every voice for its words", () => {
    const course = structuredClone(base);
    course.lessons[0].units[0].speaker = "M";
    const c = loadCourses(course);
    const u = c.locales.en.units.get("it-test-1-u01")!;
    expect(u.audio).toEqual(VOICES.it.map((v) => (v.gender === "M" ? `/audio/${audioFile("it", v, "Lo prendo.")}` : null)));
    expect(u.audio.filter(Boolean).length).toBeGreaterThan(0);
    expect(c.audioJobs.filter((j) => j.text === "Lo prendo.").map((j) => j.voice.gender)).toEqual(VOICES.it.filter((v) => v.gender === "M").map((v) => v.gender));
    expect(u.words[0].audio.every(Boolean)).toBe(true);
    for (let i = 0; i < 50; i++) expect(u.audio[pickVoice(u.audio)]).not.toBeNull();
    expect(() => pickVoice([null, null])).toThrow(/no audio/);
  });

  it("rejects audio fixes for an unknown voice, phonemes on a non-Kokoro voice, and text nothing renders", () => {
    expect(() => loadWithFixes({ it: { "kokoro:nobody": { lo: { say: "Lo." } } } }, base)).toThrow(/unknown it voice kokoro:nobody/);
    expect(() => loadWithFixes({ it: { "piper:it_IT-paola-medium": { lo: { phonemes: "lo" } } } }, base)).toThrow(/phonemes need a kokoro voice/);
    expect(() => loadWithFixes({ it: { "kokoro:if_sara": { gone: { take: 2 } } } }, base)).toThrow(/fixes for text no content renders: it\|kokoro:if_sara\|gone/);
    expect(() => loadWithFixes({ it: { "kokoro:if_sara": { lo: {} } } }, base)).toThrow(/empty fix/);
    expect(() => loadWithFixes({ it: { "kokoro:if_sara": { lo: { cut: 2 } } } }, base)).toThrow(/cut/);
  });

  it("rejects a word without a lexicon entry, an unused entry, and a lesson not ending in a sentence", () => {
    const noSense = structuredClone(base);
    delete noSense.lessons[0].units[0].senses;
    expect(() => loadCourses(noSense)).toThrow(/no lexicon entry "lo"/);

    const unused = structuredClone(base);
    unused.lexicon.extra = { lemma: "x", pos: "NOUN", gloss: tr("x", "x", "x") };
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
    expect(loadCourses(ok).locales.en.units.get("it-test-1-u01")!.commas).toEqual([0]);

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
    expect(c.locales.en.units.get("it-next-1-u01")!.words[1].gloss).toBe("I take");
    expect(c.locales.en.courses.find((x) => x.id === "it-next")!.requires).toEqual(["it-test"]);
  });

  it("serves each locale its support language, falling back to the first for a locale the course lacks", () => {
    const c = loadCourses(base);
    const text = (l: keyof typeof c.locales) => {
      const u = c.locales[l].units.get("it-test-1-u01")!;
      return [c.locales[l].courses[0].description, u.translation, ...u.distractors!, u.words[1].gloss];
    };
    expect(text("es-419")).toEqual(["D-es", "t-es", "d1-es", "d2-es", "tomo"]);
    expect(text("nl")).toEqual(["D-nl", "t-nl", "d1-nl", "d2-nl", "ik neem"]);
    expect(text("it")).toEqual(["D", "t", "d1", "d2", "I take"]);
  });

  it("rejects a localized field missing a support locale or carrying an extra one", () => {
    const missing = structuredClone(base);
    delete (missing.lessons[0].units[0].translation as Record<string, string>).nl;
    expect(() => loadCourses(missing)).toThrow(/unit it-test-1-u01 translation has locales \[en, es-419\], needs exactly \[en, es-419, nl\]/);

    const extra = structuredClone(base);
    extra.lexicon.prendo.gloss.it = "prendo";
    expect(() => loadCourses(extra)).toThrow(/lexicon "prendo" gloss has locales/);
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
    const a = child({ id: "it-a", requires: ["it-b"], lessons: [{ id: "it-a-1", title: "L", grammarFocus: tr<string[]>([], [], []), units: [unit("it-a-1-u01", "Lo prendo!", { senses: { "0": "pron" } })] }] });
    const b = child({ id: "it-b", requires: ["it-a", "it-test"], lessons: [{ id: "it-b-1", title: "L", grammarFocus: tr<string[]>([], [], []), units: [unit("it-b-1-u01", "Lo prendo?", { senses: { "0": "pron" } })] }] });
    expect(() => loadCourses(base, a, b)).toThrow(/requires cycle/);

    expect(() => loadCourses({ ...base, track: "optional" }, child())).toThrow(/main-track course requires optional it-test/);
  });

  it("fails when audio is required and missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
    expect(() => loadContent(join(root, "tests/fixtures/content"), dir, { audio: "require" })).toThrow(/audio files missing/);
  });

  it("counts only the absent files as missing when some audio is present", () => {
    const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
    const { audioJobs } = loadContent(join(root, "tests/fixtures/content"), dir, { audio: "skip" });
    const present = audioJobs[0].file;
    mkdirSync(join(dir, dirname(present)), { recursive: true });
    writeFileSync(join(dir, present), "");
    expect(() => loadContent(join(root, "tests/fixtures/content"), dir, { audio: "require" }))
      .toThrow(`${audioJobs.length - 1} of ${audioJobs.length} audio files missing`);
  });

  it("says nothing about missing audio when the check is skipped", () => {
    const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(loadContent(join(root, "tests/fixtures/content"), dir, { audio: "skip" }).audioJobs.length).toBeGreaterThan(0);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("prints a red banner with the missing count, example files and the fix when audio is optional and missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const c = loadContent(join(root, "tests/fixtures/content"), dir, { audio: "warn" });
      const out = warn.mock.calls.map((a) => a.join(" ")).join("\n");
      expect(out).toContain("\x1b[31m");
      expect(out).toContain(`${c.audioJobs.length} of ${c.audioJobs.length} audio files missing`);
      expect(out).toContain(c.audioJobs[0].file);
      expect(out).toContain("npm run content:audio");
      expect(out.split("\n").length).toBeGreaterThan(3);
    } finally {
      warn.mockRestore();
    }
  });
});
