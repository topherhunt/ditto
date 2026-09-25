// Merges support-language patches into course files: `node scripts/merge-locale.ts <patch.json>...`.
// `--check` validates the patches without writing. A patch covers one course and one locale:
//   { course, locale, description, grammarFocus: {lessonId: string[]}, lexicon: {key: gloss},
//     units: {unitId: {translation, distractors: [a, b]}} }
// and must have exactly the course's lessons, lexicon keys and translated units. Plain-string fields in a
// course are English and become locale maps on write.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES, type Locale } from "../shared/content.ts";

type Localized<T> = T | Partial<Record<Locale, T>>;
type RawUnit = { id: string; stage: string; translation?: Localized<string>; distractors?: Localized<string[]>; [k: string]: unknown };
type RawCourse = {
  id: string; language: string; description: Localized<string>;
  lexicon: Record<string, { gloss: Localized<string>; [k: string]: unknown }>;
  lessons: { id: string; grammarFocus: Localized<string[]>; units: RawUnit[]; [k: string]: unknown }[];
  [k: string]: unknown;
};
type Patch = {
  course: string; locale: Locale; description: string; grammarFocus: Record<string, string[]>;
  lexicon: Record<string, string>; units: Record<string, { translation: string; distractors: [string, string] }>;
};

const root = join(import.meta.dirname, "..");
const isMap = <T>(v: Localized<T>): v is Partial<Record<Locale, T>> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).every((k) => (LOCALES as readonly string[]).includes(k));
const toMap = <T>(v: Localized<T>): Partial<Record<Locale, T>> => (isMap(v) ? v : { en: v });
const en = <T>(v: Localized<T>): T => toMap(v).en!;

export const coursePath = (id: string) => join(root, "content/courses", id.split("-")[0], `${id}.json`);

function sameKeys(what: string, actual: string[], expected: string[], errors: string[]) {
  const missing = expected.filter((k) => !actual.includes(k));
  const extra = actual.filter((k) => !expected.includes(k));
  if (missing.length) errors.push(`${what}: missing ${missing.join(", ")}`);
  if (extra.length) errors.push(`${what}: not in the course: ${extra.join(", ")}`);
}

const END = /[.!?…]["»”]?$/;

/** Errors make the patch unusable; warnings are for the author to judge. */
export function checkPatch(p: Patch, course: RawCourse): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!LOCALES.includes(p.locale) || p.locale === "en") errors.push(`locale "${p.locale}" must be one of ${LOCALES.filter((l) => l !== "en").join(", ")}`);
  /** `quotesItalian`: glosses and grammar labels cite Italian, so Spanish ¿/¡ can't be required there. */
  const text = (where: string, s: unknown, quotesItalian = false) => {
    if (typeof s !== "string" || s.trim() === "") return errors.push(`${where}: must be a non-empty string`), false;
    if (s !== s.trim() || /\s{2}/.test(s)) errors.push(`${where}: stray whitespace in "${s}"`);
    if (p.locale === "es-419" && !quotesItalian) {
      if (s.includes("?") && !s.includes("¿")) errors.push(`${where}: question without ¿: "${s}"`);
      if (s.includes("!") && !s.includes("¡")) errors.push(`${where}: exclamation without ¡: "${s}"`);
    }
    return true;
  };

  text("description", p.description);
  sameKeys("grammarFocus", Object.keys(p.grammarFocus ?? {}), course.lessons.map((l) => l.id), errors);
  for (const l of course.lessons) {
    const got = p.grammarFocus?.[l.id];
    if (!got) continue;
    if (!Array.isArray(got) || got.length !== en(l.grammarFocus).length) errors.push(`grammarFocus ${l.id}: needs ${en(l.grammarFocus).length} labels`);
    else got.forEach((g, i) => text(`grammarFocus ${l.id}[${i}]`, g, true));
  }
  sameKeys("lexicon", Object.keys(p.lexicon ?? {}), Object.keys(course.lexicon), errors);
  for (const [k, g] of Object.entries(p.lexicon ?? {})) text(`lexicon "${k}"`, g, true);

  const translated = course.lessons.flatMap((l) => l.units).filter((u) => u.translation !== undefined);
  sameKeys("units", Object.keys(p.units ?? {}), translated.map((u) => u.id), errors);
  let longest = 0;
  for (const u of translated) {
    const pu = p.units?.[u.id];
    if (!pu) continue;
    const where = `unit ${u.id}`;
    if (!text(`${where} translation`, pu.translation)) continue;
    if (!Array.isArray(pu.distractors) || pu.distractors.length !== 2) {
      errors.push(`${where}: needs exactly two distractors`);
      continue;
    }
    if (!pu.distractors.every((d, i) => text(`${where} distractor ${i}`, d))) continue;
    const norm = (s: string) => s.toLowerCase().replace(/[\p{P}\s]+/gu, " ").trim();
    const all = [pu.translation, ...pu.distractors].map(norm);
    if (new Set(all).size !== 3) errors.push(`${where}: translation and distractors must all differ: ${JSON.stringify([pu.translation, ...pu.distractors])}`);
    const wantsEnd = END.test(en(u.translation!));
    for (const s of [pu.translation, ...pu.distractors])
      if (END.test(s) !== wantsEnd) errors.push(`${where}: "${s}" ${wantsEnd ? "needs" : "must not have"} an end mark, like the English "${en(u.translation!)}"`);
    const len = pu.translation.length;
    for (const d of pu.distractors)
      if (Math.abs(d.length - len) > Math.max(12, len * 0.6)) warnings.push(`${where}: distractor "${d}" is much ${d.length > len ? "longer" : "shorter"} than "${pu.translation}"`);
    if (pu.distractors.every((d) => d.length < len)) longest++;
  }
  if (translated.length && longest / translated.length > 0.5)
    warnings.push(`the translation is the longest option in ${longest} of ${translated.length} units; vary it`);
  return { errors, warnings };
}

export function applyPatch(p: Patch, course: RawCourse) {
  const set = <T>(v: Localized<T>, x: T) => ({ ...toMap(v), [p.locale]: x });
  course.description = set(course.description, p.description);
  for (const [k, e] of Object.entries(course.lexicon)) e.gloss = set(e.gloss, p.lexicon[k]);
  for (const l of course.lessons) {
    l.grammarFocus = set(l.grammarFocus, p.grammarFocus[l.id]);
    for (const u of l.units) {
      const pu = p.units[u.id];
      if (!pu) continue;
      u.translation = set(u.translation!, pu.translation);
      u.distractors = set(u.distractors!, pu.distractors);
    }
  }
}

/** Every localized field as a map, locales in LOCALES order. */
export function normalize(course: RawCourse) {
  const order = <T>(v: Localized<T>) => Object.fromEntries(LOCALES.flatMap((l) => (toMap(v)[l] === undefined ? [] : [[l, toMap(v)[l]]])));
  course.description = order(course.description);
  for (const e of Object.values(course.lexicon)) e.gloss = order(e.gloss);
  for (const l of course.lessons) {
    l.grammarFocus = order(l.grammarFocus);
    for (const u of l.units) {
      if (u.translation !== undefined) u.translation = order(u.translation);
      if (u.distractors !== undefined) u.distractors = order(u.distractors);
    }
  }
}

/** Objects are padded with spaces at the top level only, like `{ "a": {"b": 1} }`. */
const inline = (v: unknown, depth = 0): string => {
  if (Array.isArray(v)) return `[${v.map((x) => inline(x, depth + 1)).join(", ")}]`;
  if (v && typeof v === "object") {
    const body = Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x, depth + 1)}`).join(", ");
    return depth === 0 ? `{ ${body} }` : `{${body}}`;
  }
  return JSON.stringify(v);
};

/** The house layout: one line per lexicon entry; a unit's core fields on one line, then one line per localized field. */
export function formatCourse(course: RawCourse): string {
  const unit = (u: RawUnit) => {
    const multi = Object.entries(u).filter(([, v]) => isMap(v as Localized<unknown>));
    const core = Object.fromEntries(Object.entries(u).filter(([, v]) => !isMap(v as Localized<unknown>)));
    if (!multi.length) return `        ${inline(core)}`;
    return [`        ${inline(core).slice(0, -2)},`, ...multi.map(([k, v], i) => `          ${JSON.stringify(k)}: ${inline(v)}${i === multi.length - 1 ? " }" : ","}`)].join("\n");
  };
  const lesson = (l: RawCourse["lessons"][number]) => {
    const head = Object.entries(l).filter(([k]) => k !== "units").map(([k, v]) => `      ${JSON.stringify(k)}: ${inline(v)},`);
    return `    {\n${head.join("\n")}\n      "units": [\n${l.units.map(unit).join(",\n")}\n      ]\n    }`;
  };
  const top = Object.entries(course).map(([k, v]) => {
    if (k === "lexicon") return `  "lexicon": {\n${Object.entries(course.lexicon).map(([lk, e]) => `    ${JSON.stringify(lk)}: ${inline(e)}`).join(",\n")}\n  }`;
    if (k === "lessons") return `  "lessons": [\n${course.lessons.map(lesson).join(",\n")}\n  ]`;
    return `  ${JSON.stringify(k)}: ${inline(v)}`;
  });
  return `{\n${top.join(",\n")}\n}\n`;
}

if (import.meta.main) {
  const checkOnly = process.argv.includes("--check");
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!files.length) throw new Error("Usage: node scripts/merge-locale.ts [--check] <patch.json>...");
  let failed = false;
  for (const file of files) {
    const p = JSON.parse(readFileSync(file, "utf8")) as Patch;
    const path = coursePath(p.course);
    const course = JSON.parse(readFileSync(path, "utf8")) as RawCourse;
    const { errors, warnings } = checkPatch(p, course);
    for (const w of warnings) console.log(`WARN ${file}: ${w}`);
    for (const e of errors) console.log(`ERROR ${file}: ${e}`);
    if (errors.length) {
      failed = true;
      continue;
    }
    if (checkOnly) {
      console.log(`OK ${file}`);
      continue;
    }
    applyPatch(p, course);
    normalize(course);
    writeFileSync(path, formatCourse(course));
    console.log(`merged ${file} -> ${path}`);
  }
  if (failed) process.exit(1);
}