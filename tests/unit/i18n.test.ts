import { describe, expect, it } from "vitest";
import { LOCALES } from "../../shared/content.ts";
import { el } from "../../web/src/i18n/el.ts";
import { en } from "../../web/src/i18n/en.ts";
import { es419 } from "../../web/src/i18n/es-419.ts";
import { it as itDictionary } from "../../web/src/i18n/it.ts";
import { nl } from "../../web/src/i18n/nl.ts";

const DICTIONARIES: Record<(typeof LOCALES)[number], Record<string, string>> = { en, "es-419": es419, nl, it: itDictionary, el };
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
/** Profile.tsx passes both `lessons` (the pluralized phrase) and `n` (the bare number), and es-419, nl and it use `n`. */
const NUMBER_INSTEAD_OF_PHRASE = "profile.accuracy";

describe("UI dictionaries", () => {
  it.each(LOCALES)("%s uses exactly the {variables} the English string uses, since t() throws on an unknown one", (locale) => {
    const mismatched = Object.keys(en)
      .filter((key) => key !== NUMBER_INSTEAD_OF_PHRASE || locale === "el" || locale === "en")
      .filter((key) => vars(DICTIONARIES[locale][key]).join() !== vars((en as Record<string, string>)[key]).join());
    expect(mismatched).toEqual([]);
  });

  it.each(LOCALES)("%s has no empty strings", (locale) => {
    expect(Object.entries(DICTIONARIES[locale]).filter(([, v]) => v.trim() === "").map(([k]) => k)).toEqual([]);
  });

  it("writes Greek questions with the Greek question mark", () => {
    expect(el["notebook.why"]).toBe("Γιατί;");
    expect(el["exercise.meaning"]).toBe("Τι σημαίνει;");
  });
});
