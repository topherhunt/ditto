import { describe, expect, it } from "vitest";
import { grade, letterDiff } from "../../shared/grader.ts";
import { tokenize, words } from "../../shared/tokenize.ts";

const free = (typed: string, text: string, variants: string[] = []) => grade(words(typed), text, variants, "free");

describe("tokenize", () => {
  it("keeps apostrophes and hyphens inside words and separates punctuation", () => {
    expect(words("Sorry, is there a pharmacy near the station?")).toEqual(["Sorry", "is", "there", "a", "pharmacy", "near", "the", "station"]);
    expect(words("L’uomo prende un po' di pane.")).toEqual(["L'uomo", "prende", "un", "po'", "di", "pane"]);
    expect(words("'s Avonds eet ik twee auto's.")).toEqual(["'s", "Avonds", "eet", "ik", "twee", "auto's"]);
    expect(words("I'll send an e-mail, 10% off.")).toEqual(["I'll", "send", "an", "e-mail", "10%", "off"]);
  });

  it("keeps punctuation tokens in place so the sentence can be rebuilt", () => {
    const text = "Sì, grazie!";
    expect(tokenize(text).map((t) => t.text).join("")).toBe(text);
    expect(tokenize(text).map((t) => t.type)).toEqual(["word", "punct", "word", "punct"]);
  });
});

describe("grade", () => {
  it("passes an exact answer, ignoring case and punctuation", () => {
    const r = free("sorry is there a pharmacy near the station", "Sorry, is there a pharmacy near the station?");
    expect(r.passed).toBe(true);
    expect(r.words.every((w) => w.kind === "correct")).toBe(true);
    expect(r.categories).toEqual([]);
  });

  it("accepts a missing accent, marks its letter, and counts an accent slip", () => {
    const r = free("Vorrei un caffe", "Vorrei un caffè");
    expect(r.passed).toBe(true);
    expect(r.accentSlips).toBe(1);
    const w = r.words[2];
    expect(w).toMatchObject({ kind: "accent", target: "caffè", typed: "caffe", accentPositions: [4] });
  });

  it("treats a wrong accent direction (é for è) and an extra accent as lenient too", () => {
    expect(free("perchè", "perché").words[0]).toMatchObject({ kind: "accent", accentPositions: [5] });
    expect(free("één", "een").words[0]).toMatchObject({ kind: "accent", accentPositions: [0, 1] });
    expect(free("een", "één").passed).toBe(true);
  });

  it("marks letters to delete and insert on a misspelled word and fails", () => {
    const r = free("I would like a coffe", "I would like a coffee");
    expect(r.passed).toBe(false);
    expect(r.categories).toEqual(["spelling"]);
    const w = r.words[4];
    expect(w.kind).toBe("wrong");
    if (w.kind !== "wrong") throw new Error("unreachable");
    expect(w.ops.filter((o) => o.op === "insert").map((o) => o.ch)).toEqual(["e"]);
    expect(w.ops.filter((o) => o.op === "delete")).toEqual([]);
  });

  it("combines a spelling error with an accent slip inside one word", () => {
    const ops = letterDiff("perke", "perché");
    expect(ops.map((o) => `${o.op}:${o.ch}${o.accent ? "*" : ""}`)).toEqual([
      "keep:p", "keep:e", "keep:r", "delete:k", "insert:c", "insert:h", "keep:é*",
    ]);
  });

  it("reports missing and extra words in free mode", () => {
    const missing = free("vorrei caffè", "Vorrei un caffè");
    expect(missing.passed).toBe(false);
    expect(missing.words.map((w) => w.kind)).toEqual(["correct", "missing", "correct"]);
    expect(missing.categories).toEqual(["missing_word"]);

    const extra = free("io vorrei un caffè", "Vorrei un caffè");
    expect(extra.words.map((w) => w.kind)).toEqual(["extra", "correct", "correct", "correct"]);
    expect(extra.categories).toEqual(["extra_word"]);
  });

  it("prefers an extra plus a missing word over pairing unrelated words", () => {
    const r = free("io vorrei caffe", "Vorrei un caffè");
    expect(r.words.map((w) => w.kind)).toEqual(["extra", "correct", "missing", "accent"]);
  });

  it("detects swapped word order", () => {
    const r = free("ik heb twee katten niet", "ik heb niet twee katten");
    expect(r.passed).toBe(false);
    expect(r.categories).toContain("word_order");
  });

  it("grades slots position by position, with an empty slot all-insert", () => {
    const r = grade(["vorrei", "", "caffè"], "Vorrei un caffè", [], "slots");
    expect(r.words[1]).toMatchObject({ kind: "wrong", typed: "" });
    expect(() => grade(["vorrei"], "Vorrei un caffè", [], "slots")).toThrow(/expects 3/);
  });

  it("ignores punctuation typed into a slot, wherever it is", () => {
    const r = grade(["Per", "me,", "un'acqua", "frizzante,", "grazie."], "Per me, un'acqua frizzante, grazie.", [], "slots");
    expect(r.passed).toBe(true);
    expect(r.words.every((w) => w.kind === "correct")).toBe(true);
    expect(grade(["vorrei,", "un", "caffè!"], "Vorrei un caffè", [], "slots").passed).toBe(true);
  });

  it("accepts a variant, and compares slots against variants as free text", () => {
    expect(free("we have ten percent off", "We have 10% off", ["We have ten percent off"]).passed).toBe(true);
    const r = grade(["I will", "take", "it"], "I'll take it", ["I will take it"], "slots");
    expect(r.passed).toBe(true);
    expect(r.against).toBe("I will take it");
  });

  it("does not accept a wrong apostrophe placement", () => {
    expect(free("Ill take it", "I'll take it").passed).toBe(false);
  });
});
