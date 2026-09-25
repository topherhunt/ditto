import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CourseSchema, LANGUAGES, LOCALES, SUPPORT_LOCALES, supportLocale,
  type Course, type Language, type LexEntry, type Locale, type Localized, type ServedCourse, type ServedUnit,
} from "../shared/content.ts";
import { tokenize, words } from "../shared/tokenize.ts";

/** For `abair`, `model` is an ABAIR voice name; see scripts/tts-render.py. */
export type Voice = { engine: "piper" | "kokoro" | "abair"; model: string; speaker?: number; gender: "F" | "M" };

/**
 * Order matters: served audio arrays follow it. The NL mls speakers were picked as female by median pitch.
 * GA uses ABAIR's Munster voices, to match the Munster forms in the course (Conas atá tú?, Táim).
 */
export const VOICES: Record<Language, Voice[]> = {
  en: [
    { engine: "piper", model: "en_US-amy-medium", gender: "F" },
    { engine: "piper", model: "en_US-lessac-medium", gender: "F" },
    { engine: "piper", model: "en_US-ryan-medium", gender: "M" },
    { engine: "piper", model: "en_US-joe-medium", gender: "M" },
  ],
  it: [
    { engine: "piper", model: "it_IT-paola-medium", gender: "F" },
    { engine: "piper", model: "it_IT-serena-medium", gender: "F" },
    { engine: "kokoro", model: "if_sara", gender: "F" },
    { engine: "kokoro", model: "im_nicola", gender: "M" },
  ],
  nl: [
    { engine: "piper", model: "nl_NL-pim-medium", gender: "M" },
    { engine: "piper", model: "nl_NL-ronnie-medium", gender: "M" },
    { engine: "piper", model: "nl_NL-mls-medium", speaker: 3, gender: "F" },
    { engine: "piper", model: "nl_NL-mls-medium", speaker: 6, gender: "F" },
  ],
  ga: [
    { engine: "abair", model: "ga_MU_nnc_piper", gender: "F" }, // Neasa
    { engine: "abair", model: "ga_MU_cmg_piper", gender: "M" }, // Colm
  ],
};

/** Bump to re-render every file after changing how audio is produced (padding, loudness). */
const RENDER_VERSION = 2;

export const voiceId = (v: Voice) => `${v.engine}:${v.model}${v.speaker === undefined ? "" : `#${v.speaker}`}`;

export type AudioJob = { language: Language; voice: Voice; text: string; file: string };

/** Content-addressed: identical text in one language and voice shares a file. */
export function audioFile(language: Language, voice: Voice, text: string): string {
  const hash = createHash("sha1").update(`${RENDER_VERSION}|${language}|${voiceId(voice)}|${text.normalize("NFC")}`).digest("hex").slice(0, 20);
  return `${language}/${hash}.m4a`;
}

/** Every course and unit, localized into the support language `supportLocale` picks for the UI locale. */
export type LocalizedContent = { courses: ServedCourse[]; units: Map<string, ServedUnit> };

export type Content = {
  /** Keyed by UI locale. Ids, text, audio and structure are the same in each; only support-language text differs. */
  locales: Record<Locale, LocalizedContent>;
  audioJobs: AudioJob[];
};

function fail(file: string, msg: string): never {
  throw new Error(`Invalid content in ${file}: ${msg}`);
}

function lexKey(word: string, sense: string | undefined): string {
  const key = word.toLowerCase();
  return sense ? `${key}#${sense}` : key;
}

const END_MARKS = /[.!?]\s*$/;

/** Transitive `requires`, nearest first. Throws on unknown ids and cycles. */
function ancestorsOf(id: string, byId: Map<string, { course: Course; file: string }>, trail: string[] = []): string[] {
  const { course, file } = byId.get(id)!;
  const out: string[] = [];
  for (const req of course.requires) {
    if (trail.includes(req) || req === id) fail(file, `requires cycle: ${[...trail, id, req].join(" -> ")}`);
    if (!byId.has(req)) fail(file, `requires unknown course ${req}`);
    for (const a of [req, ...ancestorsOf(req, byId, [...trail, id])]) if (!out.includes(a)) out.push(a);
  }
  return out;
}

export function loadContent(contentDir: string, audioDir: string, opts: { requireAudio: boolean }): Content {
  const locales = Object.fromEntries(LOCALES.map((l): [Locale, LocalizedContent] => [l, { courses: [], units: new Map() }])) as Record<Locale, LocalizedContent>;
  const courseIds = new Set<string>();
  const unitIds = new Set<string>();
  const jobs = new Map<string, AudioJob>();
  const lessonIds = new Set<string>();

  const addAudio = (language: Language, text: string) =>
    VOICES[language].map((voice) => {
      const file = audioFile(language, voice, text);
      if (!jobs.has(file)) jobs.set(file, { language, voice, text, file });
      return `/audio/${file}`;
    });

  for (const language of LANGUAGES) {
    const dir = join(contentDir, "courses", language);
    if (!existsSync(dir)) continue;
    const byId = new Map<string, { course: Course; file: string }>();
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      const file = join(dir, name);
      const parsed = CourseSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
      if (!parsed.success) fail(file, z_message(parsed.error));
      const course: Course = parsed.data;
      if (course.language !== language) fail(file, `language "${course.language}" but stored under ${language}/`);
      if (courseIds.has(course.id)) fail(file, `duplicate course id ${course.id}`);
      courseIds.add(course.id);
      byId.set(course.id, { course, file });
    }
    /** Checks a localized field carries exactly this language's support locales. */
    const complete = <T>(file: string, where: string, v: Localized<T>): Localized<T> => {
      const want = SUPPORT_LOCALES[language];
      const have = Object.keys(v);
      if (have.length !== want.length || !want.every((l) => have.includes(l)))
        fail(file, `${where} has locales [${have.join(", ")}], needs exactly [${want.join(", ")}]`);
      return v;
    };

    for (const [id, { course, file }] of byId) {
      const ancestors = ancestorsOf(id, byId);
      if (course.track === "main") {
        const optional = course.requires.filter((r) => byId.get(r)!.course.track === "optional");
        if (optional.length) fail(file, `main-track course requires optional ${optional.join(", ")}`);
      }

      /** Lemma -> id of the course that introduces it, over this course and its ancestors. */
      const introducedBy = new Map<string, string>();
      for (const a of ancestors) for (const l of byId.get(a)!.course.introduces) introducedBy.set(l, a);
      for (const l of course.introduces) {
        if (introducedBy.has(l)) fail(file, `introduces "${l}", already introduced by ${introducedBy.get(l)}`);
        introducedBy.set(l, id);
      }
      const lookup = (key: string): LexEntry | undefined => {
        if (course.lexicon[key]) return course.lexicon[key];
        const found = ancestors.flatMap((a) => (byId.get(a)!.course.lexicon[key] ? [{ a, e: byId.get(a)!.course.lexicon[key] }] : []));
        const kinds = new Set(found.map((f) => `${f.e.lemma}/${f.e.pos}`));
        if (kinds.size > 1) fail(file, `"${key}" is ambiguous across ${found.map((f) => f.a).join(", ")}; add it to this lexicon`);
        return found[0]?.e;
      };

      complete(file, "description", course.description);
      for (const [key, e] of Object.entries(course.lexicon)) complete(file, `lexicon "${key}" gloss`, e.gloss);

      const usedLex = new Set<string>();
      const usedLemmas = new Set<string>();
      type Built = Omit<ServedUnit, "translation" | "distractors" | "words"> & {
        translation?: Localized<string>; distractors?: Localized<[string, string]>; words: (LexEntry & { text: string; audio: string[] })[];
      };
      const built: { lesson: Course["lessons"][number]; units: Built[] }[] = [];
      for (const lesson of course.lessons) {
        if (lessonIds.has(lesson.id)) fail(file, `duplicate lesson id ${lesson.id}`);
        lessonIds.add(lesson.id);
        if (lesson.units.at(-1)!.stage !== "sentence") fail(file, `lesson ${lesson.id} must end with a sentence unit`);
        complete(file, `lesson ${lesson.id} grammarFocus`, lesson.grammarFocus);
        const builtUnits: Built[] = [];
        for (const unit of lesson.units) {
          const where = `unit ${unit.id}`;
          if (unitIds.has(unit.id)) fail(file, `duplicate unit id ${unit.id}`);
          unitIds.add(unit.id);
          if (!unit.translation) fail(file, `${where} needs a translation`);
          if (!!unit.translation !== !!unit.distractors) fail(file, `${where} needs distractors exactly when it has a translation`);
          if (unit.translation) complete(file, `${where} translation`, unit.translation);
          if (unit.distractors) complete(file, `${where} distractors`, unit.distractors);
          if (unit.stage === "sentence" && !END_MARKS.test(unit.text)) fail(file, `${where} is a sentence and must end with . ! or ?`);
          if (unit.stage === "word" && END_MARKS.test(unit.text)) fail(file, `${where} is a word and must not end with . ! or ?`);
          const ws = words(unit.text);
          if (ws.length === 0) fail(file, `${where} has no words`);
          for (const idx of Object.keys(unit.senses ?? {}))
            if (Number(idx) >= ws.length) fail(file, `${where} sense index ${idx} is out of range`);

          const gapHasComma = new Set<number>();
          let wordIndex = -1;
          for (const t of tokenize(unit.text)) {
            if (t.type === "word") wordIndex = t.wordIndex;
            else if (wordIndex >= 0 && /[,;]/.test(t.text)) gapHasComma.add(wordIndex);
          }
          const commas = unit.commas ?? [];
          if (new Set(commas).size !== commas.length) fail(file, `${where} lists a comma position twice`);
          for (const k of commas) {
            if (k > ws.length - 2) fail(file, `${where} comma position ${k} is not between two words`);
            if (gapHasComma.has(k)) fail(file, `${where} comma position ${k} already has a comma in the text`);
          }

          const servedWords = ws.map((w, i) => {
            const key = lexKey(w, unit.senses?.[String(i)]);
            const entry = lookup(key);
            if (!entry) fail(file, `${where}: no lexicon entry "${key}"`);
            if (entry.pos !== "PROPN") {
              if (!introducedBy.has(entry.lemma)) fail(file, `${where}: lemma "${entry.lemma}" ("${w}") is not introduced here or in a required course`);
              usedLemmas.add(entry.lemma);
            }
            usedLex.add(key);
            return { ...entry, text: w, audio: addAudio(language, w.toLowerCase()) };
          });
          builtUnits.push({
            id: unit.id, rev: unit.rev, stage: unit.stage, text: unit.text, translation: unit.translation, distractors: unit.distractors,
            variants: unit.variants ?? [], commas, language, courseId: course.id, lessonId: lesson.id,
            audio: addAudio(language, unit.text), words: servedWords,
          });
        }
        built.push({ lesson, units: builtUnits });
      }
      const unused = Object.keys(course.lexicon).filter((k) => !usedLex.has(k));
      if (unused.length) fail(file, `unused lexicon entries: ${unused.join(", ")}`);
      const untaught = course.introduces.filter((l) => !usedLemmas.has(l));
      if (untaught.length) fail(file, `introduces lemmas it never uses: ${untaught.join(", ")}`);

      for (const locale of LOCALES) {
        const s = supportLocale(language, locale);
        const lessons = built.map(({ lesson, units }) => ({
          id: lesson.id, title: lesson.title, grammarFocus: lesson.grammarFocus[s]!,
          units: units.map((u): ServedUnit => ({
            ...u, translation: u.translation?.[s], distractors: u.distractors?.[s], words: u.words.map((w) => ({ ...w, gloss: w.gloss[s]! })),
          })),
        }));
        locales[locale].courses.push({
          id: course.id, language, level: course.level, order: course.order, title: course.title, description: course.description[s]!,
          track: course.track, requires: course.requires, lessons,
        });
        for (const l of lessons) for (const u of l.units) locales[locale].units.set(u.id, u);
      }
    }
  }

  const audioJobs = [...jobs.values()];
  const missing = audioJobs.filter((j) => !existsSync(join(audioDir, j.file)));
  if (missing.length) {
    const msg = `${missing.length} of ${audioJobs.length} audio files missing in ${audioDir} (run npm run content:audio), e.g. "${missing[0].text}"`;
    if (opts.requireAudio) throw new Error(msg);
    console.warn(`WARNING: ${msg}`);
  }
  for (const l of LOCALES) locales[l].courses.sort((a, b) => a.language.localeCompare(b.language) || a.order - b.order);
  return { locales, audioJobs };
}

function z_message(err: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}
