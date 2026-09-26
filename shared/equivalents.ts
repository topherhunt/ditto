import type { Language } from "./content.ts";
import { normalizeApostrophes } from "./tokenize.ts";

/**
 * Accepted ways of writing the same sentence, per language. The grader canonicalizes both the typed answer and each
 * accepted answer, so a rule only has to map every spelling onto one form, in either direction.
 */

const START = "(?<![\\p{L}\\p{N}'])";
const END = "(?![\\p{L}\\p{N}'])";
const word = (w: string) => new RegExp(`${START}${w}${END}`, "giu");
/** `to` with the first letter capitalized when `from` starts with a capital. */
const caseAs = (from: string, to: string) => (from[0] !== from[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to);

const AMOUNT = "(\\d+(?:[.,]\\d+)?)";

/** `$100` -> `100 dollars`. Symbols go before the amount in English; `100$` stays wrong. */
function currencyBefore(s: string, names: Record<string, [string, string]>): string {
  return s.replace(new RegExp(`([${Object.keys(names).join("")}])\\s?${AMOUNT}`, "gu"), (_, sym: string, n: string) =>
    `${n} ${names[sym][n === "1" ? 0 : 1]}`);
}

// Two-word spellings joined as one, compared in the joined form. Hyphens already count as spaces.
const EN_JOINED: [string, string][] = [
  ["cell phone", "cellphone"], ["e mail", "email"], ["web site", "website"], ["wi fi", "wifi"], ["well being", "wellbeing"],
  ["good bye", "goodbye"], ["all right", "alright"], ["per cent", "percent"], ["week end", "weekend"], ["can not", "cannot"],
  ["okay", "ok"],
];

// 'd means had before these (a past participle), would otherwise. Adverbs in between are skipped.
const PARTICIPLES = new Set(
  ("been done gone seen had made got gotten known taken given eaten written chosen forgotten left lost bought brought thought " +
    "told found heard met paid said sent spent sold kept slept felt built taught caught understood won begun drunk driven " +
    "ridden spoken stolen broken woken fallen grown thrown flown shown worn torn better").split(" "),
);
const BASE_ED = new Set("need feed bleed breed speed succeed proceed exceed heed seed shed wed bed".split(" "));
const ADVERBS = new Set("just already never always really probably definitely actually also still ever only".split(" "));
const IS_HAS = new Set("it he she that there here what who where how when why".split(" "));

/** The next word after `rest`'s start that isn't a skippable adverb, lowercased. */
function nextWord(rest: string): string {
  const ws = rest.toLowerCase().match(/\p{L}+/gu) ?? [];
  return ws.find((w) => !ADVERBS.has(w)) ?? "";
}

function expandContractions(s: string): string {
  return s
    .replace(word("(won|can|shan)'t"), (m, stem: string) => caseAs(m, { won: "will not", can: "cannot", shan: "shall not" }[stem.toLowerCase()]!))
    .replace(word("(\\p{L}+)n't"), (m, stem: string) => (stem.toLowerCase() === "ai" ? m : `${stem} not`))
    .replace(word("(\\p{L}+)'(m|re|ve|ll)"), (_, stem: string, c: string) => `${stem} ${{ m: "am", re: "are", ve: "have", ll: "will" }[c.toLowerCase()]}`)
    .replace(word("(\\p{L}+)'d"), (m, stem: string, offset: number, all: string) => {
      const next = nextWord(all.slice(offset + m.length));
      return `${stem} ${PARTICIPLES.has(next) || (next.endsWith("ed") && !BASE_ED.has(next)) ? "had" : "would"}`;
    })
    .replace(word("(\\p{L}+)'s"), (m, stem: string, offset: number, all: string) => {
      if (!IS_HAS.has(stem.toLowerCase())) return m;
      return `${stem} ${["been", "got", "gotten"].includes(nextWord(all.slice(offset + m.length))) ? "has" : "is"}`;
    });
}

function english(s: string): string {
  s = s.replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
  s = currencyBefore(s, { $: ["dollar", "dollars"], "€": ["euro", "euros"], "£": ["pound", "pounds"] });
  s = s.replace(/(?<=[\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, " ");
  s = expandContractions(s);
  for (const [spaced, joined] of EN_JOINED) s = s.replace(word(spaced), (m) => caseAs(m, joined));
  return s;
}

/** `€ 20`, `€20`, `20€` and `20 €` all read as `20 euro` (invariable in Italian, Dutch and Irish). */
function euro(s: string): string {
  return s.replace(new RegExp(`€\\s?${AMOUNT}|${AMOUNT}\\s?€`, "gu"), (_, a?: string, b?: string) => `${a ?? b} euro`);
}

// Spellings of the curriculum's names, the curriculum's own first. Accent-only differences already pass as accent slips.
const NAME_VARIANTS: string[][] = [
  ["anna", "ana"], ["marco", "marko"], ["mark", "marc"], ["sara", "sarah"], ["luca", "luka"], ["matteo", "mateo"],
  ["marta", "martha"], ["elena", "helena"], ["paolo", "paulo"], ["paola", "paula"], ["lisa", "liza"], ["emma", "ema"],
  ["sofie", "sophie"], ["peter", "pieter"], ["frida", "frieda"], ["jansen", "janssen"],
];
const NAME_OF = new Map(NAME_VARIANTS.flatMap(([name, ...rest]) => rest.map((v) => [v, name])));
const NAME_RE = word(`(${[...NAME_OF.keys()].join("|")})`);

function names(s: string): string {
  return s.replace(NAME_RE, (m) => caseAs(m, NAME_OF.get(m.toLowerCase())!));
}

// Not applied to Irish, where `ana` is a word and the names only vary by accent.
const RULES: Record<Language, (s: string) => string> = {
  en: (s) => names(english(s)), it: (s) => names(euro(s)), nl: (s) => names(euro(s)), ga: euro,
};

/** The canonical spelling of `text` in `language`: equal canonical forms are the same answer. */
export function canonicalize(text: string, language: Language): string {
  return RULES[language](normalizeApostrophes(text.normalize("NFC")));
}
