import { describe, expect, it } from "vitest";
import { grade, letterDiff, type GradeResult } from "../../shared/grader.ts";
import { tokenize, words } from "../../shared/tokenize.ts";

const free = (typed: string, text: string, variants: string[] = [], commas: number[] = []) =>
  grade({ mode: "free", text: typed }, { language: "en", text, variants, commas });
const slots = (typed: string[], text: string, variants: string[] = [], commas: number[] = []) =>
  grade({ mode: "slots", slots: typed }, { language: "en", text, variants, commas });
/** Every typed mark as "ch:status" (plus ">expected" when wrong), in order. */
const marks = (r: GradeResult) =>
  [...r.leading, ...r.words.flatMap((w) => w.after)].map((m) => `${m.ch}:${m.status}${m.expected ? `>${m.expected}` : ""}`);

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

describe("grade: words", () => {
  it("passes an exact answer, ignoring case and omitted punctuation", () => {
    const r = free("sorry is there a pharmacy near the station", "Sorry, is there a pharmacy near the station?");
    expect(r.passed).toBe(true);
    expect(r.words.every((w) => w.kind === "correct")).toBe(true);
    expect(r.categories).toEqual([]);
  });

  it("accepts a missing accent, marks its letter, and counts an accent slip", () => {
    const r = free("Vorrei un caffe", "Vorrei un caffè");
    expect(r.passed).toBe(true);
    expect(r.accentSlips).toBe(1);
    expect(r.words[2]).toMatchObject({ kind: "accent", target: "caffè", typed: "caffe", accentPositions: [4] });
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
    if (w.kind !== "wrong") throw new Error(`expected wrong, got ${w.kind}`);
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
    expect(free("io vorrei caffe", "Vorrei un caffè").words.map((w) => w.kind)).toEqual(["extra", "correct", "missing", "accent"]);
  });

  it("detects swapped word order", () => {
    const r = free("ik heb twee katten niet", "ik heb niet twee katten");
    expect(r.passed).toBe(false);
    expect(r.categories).toContain("word_order");
  });

  it("grades slots position by position, with an empty slot all-insert", () => {
    expect(slots(["vorrei", "", "caffè"], "Vorrei un caffè").words[1]).toMatchObject({ kind: "wrong", typed: "" });
    expect(() => slots(["vorrei"], "Vorrei un caffè")).toThrow(/expects 3/);
  });

  it("accepts a variant, and compares slots against variants as free text", () => {
    expect(free("we have ten percent off", "We have 10% off", ["We have ten percent off"]).passed).toBe(true);
    const r = slots(["I will", "take", "it"], "I'll take it", ["I will take it"]);
    expect(r.passed).toBe(true);
    expect(r.against).toBe("I will take it");
  });

  it("does not accept a wrong apostrophe placement", () => {
    expect(free("Ill take it", "I'll take it").passed).toBe(false);
  });
});

describe("grade: punctuation", () => {
  const text = "Per me un'acqua frizzante, grazie.";

  it("accepts canonical and optional commas silently, in either mode", () => {
    const r = free("Per me, un'acqua frizzante, grazie.", text, [], [1]);
    expect(r.passed).toBe(true);
    expect(marks(r)).toEqual([",:ok", ",:ok", ".:ok"]);
    expect(marks(slots(["Per", "me,", "un'acqua", "frizzante,", "grazie."], text, [], [1]))).toEqual([",:ok", ",:ok", ".:ok"]);
  });

  it("treats semicolons like commas", () => {
    expect(marks(free("Per me; un'acqua frizzante; grazie", text, [], [1]))).toEqual([";:ok", ";:ok"]);
  });

  it("shows a comma where none belongs as stray, without failing", () => {
    const r = free("Per, me un'acqua frizzante grazie", text);
    expect(r.passed).toBe(true);
    expect(r.categories).toEqual([]);
    expect(r.words[0].after).toEqual([{ ch: ",", status: "stray" }]);
  });

  it("gives a slot's leading punctuation to the gap before it", () => {
    const r = slots(["Per", "me", ",un'acqua", "frizzante", "grazie"], text, [], [1]);
    expect(r.words[1].after).toEqual([{ ch: ",", status: "ok" }]);
    expect(r.words[2].after).toEqual([]);
  });

  it("accepts . or ! at the end of a statement but fails a ?", () => {
    expect(free("per me un'acqua frizzante grazie!", text).passed).toBe(true);
    const r = free("per me un'acqua frizzante grazie?", text);
    expect(r.passed).toBe(false);
    expect(r.categories).toEqual(["punctuation"]);
    expect(marks(r)).toEqual(["?:wrong>."]);
  });

  it("accepts only ? at the end of a question", () => {
    const q = "Sorry, is there a pharmacy near the station?";
    expect(free("sorry is there a pharmacy near the station?", q).passed).toBe(true);
    for (const end of [".", "!"]) {
      const r = slots(["sorry", "is", "there", "a", "pharmacy", "near", "the", `station${end}`], q);
      expect(r.passed).toBe(false);
      expect(marks(r)).toEqual([`${end}:wrong>?`]);
    }
  });

  it("shows any end mark on a word or phrase without one as stray", () => {
    for (const end of [".", "!", "?", ","]) {
      const r = free(`caffè${end}`, "caffè");
      expect(r.passed).toBe(true);
      expect(marks(r)).toEqual([`${end}:stray`]);
    }
  });

  it("fails punctuation inside a word", () => {
    expect(free("Vorrei un caf,fè", "Vorrei un caffè").passed).toBe(false);
    const r = slots(["Vorrei", "un", "caf,fè"], "Vorrei un caffè");
    expect(r.passed).toBe(false);
    expect(r.words[2]).toMatchObject({ kind: "wrong", typed: "caf,fè" });
  });

  it("grades variants against their own punctuation, without the main text's optional commas", () => {
    const r = free("I will take it, thanks?", "I'll take it, thanks.", ["I will take it, thanks."], [1]);
    expect(r.against).toBe("I will take it, thanks.");
    expect(marks(r)).toEqual([",:ok", "?:wrong>."]);
  });
});
