import { describe, expect, it } from "vitest";
import { grade } from "../../shared/grader.ts";
import { words } from "../../shared/tokenize.ts";
import { outcomeOf, placeholder, slotsAfter } from "../../web/src/practice.ts";

describe("practice helpers", () => {
  it("rates a unit by its worst event", () => {
    expect(outcomeOf({ revealed: false, wrongSubmissions: 0, hintsUsed: 0 })).toBe("clean");
    expect(outcomeOf({ revealed: false, wrongSubmissions: 0, hintsUsed: 2 })).toBe("hinted");
    expect(outcomeOf({ revealed: false, wrongSubmissions: 1, hintsUsed: 2 })).toBe("corrected");
    expect(outcomeOf({ revealed: true, wrongSubmissions: 0, hintsUsed: 0 })).toBe("revealed");
  });

  it("builds placeholders for each hint level, keeping apostrophes visible", () => {
    expect(placeholder("caffè", "letters")).toBe("c····");
    expect(placeholder("un'acqua", "letters")).toBe("u·'·····");
    expect(placeholder("caffè", "initial")).toBe("c");
    expect(placeholder("caffè", "none")).toBe("");
  });

  it("locks correct and accent-fixed slots and keeps wrong ones editable", () => {
    const r = grade(["vorrei", "un", "caffe", "per", "favor"], "Vorrei un caffè, per favore.", [], "slots");
    const s = slotsAfter(r, 5, []);
    expect(s.values).toEqual(["Vorrei", "un", "caffè", "per", "favor"]);
    expect(s.states).toEqual(["correct", "correct", "accent", "correct", "open"]);
  });

  it("maps a free-text answer onto slots, leaving missing words empty and dropping extras", () => {
    const r = grade(words("io vorrei caffe"), "Vorrei un caffè", [], "free");
    const s = slotsAfter(r, 3, []);
    expect(s.values).toEqual(["Vorrei", "", "caffè"]);
    expect(s.states).toEqual(["correct", "open", "accent"]);
  });
});
