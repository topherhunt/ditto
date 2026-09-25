import { describe, expect, it } from "vitest";
import type { Language } from "../../shared/content.ts";
import { canonicalize } from "../../shared/equivalents.ts";
import { grade } from "../../shared/grader.ts";

const passes = (language: Language, typed: string, text: string, variants: string[] = []) =>
  grade({ mode: "free", text: typed }, { language, text, variants }).passed;

describe("equivalent spellings", () => {
  it.each([
    ["Is the cellphone $100?", "Is the cell phone a hundred dollars?", ["Is the cell phone 100 dollars?"]],
    ["Is the cell-phone 100 dollars?", "Is the cell phone a hundred dollars?", ["Is the cell phone 100 dollars?"]],
    ["The rent is 900 dollars a month.", "The rent is $900 a month.", []],
    ["It costs $1.", "It costs 1 dollar.", []],
    ["My salary is $60000 a year.", "My salary is $60,000 a year.", []],
    ["I would like a coffee.", "I'd like a coffee.", []],
    ["I'd like a coffee.", "I would like a coffee.", []],
    ["We had chosen the red one.", "We'd chosen the red one.", []],
    ["I had just finished.", "I'd just finished.", []],
    ["You had better go.", "You'd better go.", []],
    ["It is broken.", "It's broken.", []],
    ["He has been here.", "He's been here.", []],
    ["I do not know.", "I don't know.", []],
    ["She won't come.", "She will not come.", []],
    ["I can not swim.", "I can't swim.", []],
    ["I cannot swim.", "I can't swim.", []],
    ["They are here and we've eaten.", "They're here and we have eaten.", []],
    ["I'll send an email.", "I will send an e-mail.", []],
    ["Is there Wi Fi?", "Is there wifi?", []],
    ["It's a round trip ticket.", "It's a round-trip ticket.", []],
    ["Okay, it's alright.", "OK, it's all right.", []],
  ])("en: %s passes for %s", (typed, text, variants) => {
    expect(passes("en", typed, text, variants)).toBe(true);
  });

  it.each([
    ["Is the cell phone 100$?", "Is the cell phone a hundred dollars?", ["Is the cell phone 100 dollars?"]],
    ["It costs $2.", "It costs 20 dollars.", []],
    ["I would like a coffee.", "I'd liked a coffee.", []],
    ["I had like a coffee.", "I'd like a coffee.", []],
    ["We would chosen the red one.", "We'd chosen the red one.", []],
    ["It has broken.", "It's broken.", []],
    ["Let us go.", "Let's go.", []],
    ["My sister is name is Anna.", "My sister's name is Anna.", []],
    ["I do know.", "I don't know.", []],
  ])("en: %s fails for %s", (typed, text, variants) => {
    expect(passes("en", typed, text, variants)).toBe(false);
  });

  it("marks the canonical sentence it matched as `against`", () => {
    const r = grade({ mode: "free", text: "Is the cellphone $100?" }, { language: "en", text: "Is the cell phone a hundred dollars?", variants: ["Is the cell phone 100 dollars?"] });
    expect(r.against).toBe("Is the cellphone 100 dollars?");
    expect(r.words.every((w) => w.kind === "correct")).toBe(true);
  });

  it("shows only the real mistake when the rest is an equivalent spelling", () => {
    const r = grade({ mode: "free", text: "I would like a coffe." }, { language: "en", text: "I'd like a coffee." });
    expect(r.passed).toBe(false);
    expect(r.words.filter((w) => w.kind !== "correct").map((w) => w.kind === "wrong" && w.typed)).toEqual(["coffe"]);
  });

  it.each(["it", "nl", "ga"] as const)("%s: every placement of the euro sign reads as euro", (language) => {
    for (const typed of ["€20", "€ 20", "20€", "20 €"]) expect(canonicalize(`Ecco ${typed}.`, language)).toBe("Ecco 20 euro.");
    expect(passes(language, "Ecco 20€, tenga il resto.", "Ecco venti euro, tenga il resto.", ["Ecco 20 euro, tenga il resto."])).toBe(true);
  });

  it("keeps spacing and contractions strict outside English", () => {
    expect(passes("nl", "Ik drink een koffie-melk.", "Ik drink een koffiemelk.")).toBe(false);
    expect(passes("it", "Vorrei un caffè-latte.", "Vorrei un caffè latte.")).toBe(false);
  });
});
