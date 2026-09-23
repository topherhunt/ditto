import { describe, expect, it } from "vitest";
import { grade } from "../../shared/grader.ts";
import { hasFeedback, outcomeOf, placeholder, slotsAfter } from "../../web/src/practice.ts";

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

  it("locks correct and accent-fixed slots, keeping typed punctuation, and keeps wrong ones editable", () => {
    const r = grade({ mode: "slots", slots: ["vorrei", "un", "caffe,", "per", "favor"] }, { text: "Vorrei un caffè, per favore." });
    const s = slotsAfter(r, 5);
    expect(s.values).toEqual(["Vorrei", "un", "caffè,", "per", "favor"]);
    expect(s.states).toEqual(["correct", "correct", "accent", "correct", "open"]);
  });

  it("keeps a slot with a wrong end mark open", () => {
    const r = grade({ mode: "slots", slots: ["vorrei", "un", "caffè?"] }, { text: "Vorrei un caffè." });
    const s = slotsAfter(r, 3);
    expect(s.values).toEqual(["Vorrei", "un", "caffè?"]);
    expect(s.states).toEqual(["correct", "correct", "open"]);
    expect(r.words.map(hasFeedback)).toEqual([false, false, true]);
  });

  it("maps a free-text answer onto slots, leaving missing words empty and dropping extras", () => {
    const r = grade({ mode: "free", text: "io vorrei caffe" }, { text: "Vorrei un caffè" });
    const s = slotsAfter(r, 3);
    expect(s.values).toEqual(["Vorrei", "", "caffè"]);
    expect(s.states).toEqual(["correct", "open", "accent"]);
  });
});
