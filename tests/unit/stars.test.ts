import { describe, expect, it } from "vitest";
import { starsFor, type RunAttempt } from "../../server/stars.ts";

const ok: RunAttempt = { outcome: "clean", meaningCorrect: null, hintsLevel: "none", hintsUsed: 0, studied: false };
const full = { master: false, fullPath: true };

describe("starsFor", () => {
  it("gives three stars to a full run with no mistakes and no help", () => {
    expect(starsFor([ok, ok], full)).toBe(3);
  });

  it("takes a star for a corrected item", () => {
    expect(starsFor([ok, { ...ok, outcome: "corrected" }], full)).toBe(2);
  });

  it("takes a star for a revealed item and for a wrong meaning check", () => {
    expect(starsFor([{ ...ok, outcome: "revealed" }], full)).toBe(2);
    expect(starsFor([{ ...ok, meaningCorrect: false }], full)).toBe(2);
  });

  it("takes a star for hints being on, for a pressed hint, and for a study screen", () => {
    expect(starsFor([{ ...ok, hintsLevel: "letters" }], full)).toBe(2);
    expect(starsFor([{ ...ok, outcome: "hinted", hintsUsed: 1 }], full)).toBe(2);
    expect(starsFor([{ ...ok, studied: true }], full)).toBe(2);
  });

  it("gives one star for a run with mistakes and help", () => {
    expect(starsFor([{ ...ok, outcome: "corrected", hintsLevel: "letters" }], full)).toBe(1);
  });

  it("caps a run that skipped words and chunks at two stars", () => {
    expect(starsFor([ok], { master: false, fullPath: false })).toBe(2);
  });

  it("gives a Master run two stars, or three when it had no mistakes", () => {
    expect(starsFor([{ ...ok, outcome: "corrected" }], { master: true, fullPath: false })).toBe(2);
    expect(starsFor([ok], { master: true, fullPath: false })).toBe(3);
  });
});
