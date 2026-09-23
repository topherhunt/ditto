import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { audioFile, loadContent } from "../../server/content.ts";

const root = join(import.meta.dirname, "../..");

function loadCourse(course: object) {
  const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
  mkdirSync(join(dir, "courses/it"), { recursive: true });
  writeFileSync(join(dir, "courses/it/c.json"), JSON.stringify(course));
  return loadContent(dir, join(dir, "audio"), { requireAudio: false });
}

const base = {
  id: "it-test", language: "it", level: "A1", order: 1, title: "T", description: "D",
  lexicon: { "lo#pron": { lemma: "lo", pos: "PRON", gloss: "it" }, prendo: { lemma: "prendere", pos: "VERB", gloss: "I take" } },
  lessons: [{ id: "it-test-1", title: "L", grammarFocus: [], units: [
    { id: "it-test-1-u01", rev: 1, stage: "sentence", text: "Lo prendo.", translation: "I'll take it.", senses: { "0": "pron" } },
  ] }],
};

describe("content loading", () => {
  it("loads the real seed courses for every language", () => {
    const c = loadContent(join(root, "content"), join(root, "content/audio"), { requireAudio: false });
    expect(c.courses.map((x) => x.language)).toEqual(["en", "it", "nl"]);
    const u = c.units.get("it-a1-bar-2-u09")!;
    expect(u.words.map((w) => `${w.text}:${w.pos}`)).toEqual(["Lo:PRON", "prendo:VERB", "grazie:INTJ"]);
    expect(u.audio).toBe(`/audio/${audioFile("it", "Lo prendo, grazie.")}`);
    expect(u.words[0].audio).toBe(`/audio/${audioFile("it", "lo")}`);
  });

  it("resolves senses and shares audio for identical text", () => {
    const c = loadCourse(base);
    expect(c.units.get("it-test-1-u01")!.words[0].lemma).toBe("lo");
    expect(new Set(c.audioJobs.map((j) => j.file)).size).toBe(c.audioJobs.length);
  });

  it("rejects a word without a lexicon entry, an unused entry, and a lesson not ending in a sentence", () => {
    const noSense = structuredClone(base);
    delete (noSense.lessons[0].units[0] as { senses?: object }).senses;
    expect(() => loadCourse(noSense)).toThrow(/no lexicon entry "lo"/);

    const unused = structuredClone(base);
    (unused.lexicon as Record<string, object>).extra = { lemma: "x", pos: "NOUN", gloss: "x" };
    expect(() => loadCourse(unused)).toThrow(/unused lexicon entries: extra/);

    const noSentence = structuredClone(base);
    noSentence.lessons[0].units[0].stage = "chunk";
    expect(() => loadCourse(noSentence)).toThrow(/must end with a sentence/);
  });

  it("fails when audio is required and missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "lp-content-"));
    expect(() => loadContent(join(root, "content"), dir, { requireAudio: true })).toThrow(/audio files missing/);
  });
});
