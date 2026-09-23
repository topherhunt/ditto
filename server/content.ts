import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CourseSchema, LANGUAGES, type Course, type Language, type ServedCourse, type ServedUnit } from "../shared/content.ts";
import { words } from "../shared/tokenize.ts";

export const VOICES: Record<Language, string> = {
  en: "en_US-amy-medium",
  it: "it_IT-paola-medium",
  nl: "nl_BE-nathalie-medium",
};

export type AudioJob = { language: Language; voice: string; text: string; file: string };

/** Content-addressed: identical text in one language shares a file; changing the voice re-renders everything. */
export function audioFile(language: Language, text: string): string {
  const hash = createHash("sha1").update(`${language}|${VOICES[language]}|${text.normalize("NFC")}`).digest("hex").slice(0, 20);
  return `${language}/${hash}.m4a`;
}

export type Content = {
  courses: ServedCourse[];
  units: Map<string, ServedUnit>;
  audioJobs: AudioJob[];
};

function fail(file: string, msg: string): never {
  throw new Error(`Invalid content in ${file}: ${msg}`);
}

function lexKey(word: string, sense: string | undefined): string {
  const key = word.toLowerCase();
  return sense ? `${key}#${sense}` : key;
}

export function loadContent(contentDir: string, audioDir: string, opts: { requireAudio: boolean }): Content {
  const courses: ServedCourse[] = [];
  const units = new Map<string, ServedUnit>();
  const jobs = new Map<string, AudioJob>();
  const lessonIds = new Set<string>();
  const courseIds = new Set<string>();

  const addAudio = (language: Language, text: string) => {
    const file = audioFile(language, text);
    if (!jobs.has(file)) jobs.set(file, { language, voice: VOICES[language], text, file });
    return `/audio/${file}`;
  };

  for (const language of LANGUAGES) {
    const dir = join(contentDir, "courses", language);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      const file = join(dir, name);
      const parsed = CourseSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
      if (!parsed.success) fail(file, z_message(parsed.error));
      const course: Course = parsed.data;
      if (course.language !== language) fail(file, `language "${course.language}" but stored under ${language}/`);
      if (courseIds.has(course.id)) fail(file, `duplicate course id ${course.id}`);
      courseIds.add(course.id);

      const usedLex = new Set<string>();
      const served: ServedCourse = { id: course.id, language, level: course.level, order: course.order, title: course.title, description: course.description, lessons: [] };
      for (const lesson of course.lessons) {
        if (lessonIds.has(lesson.id)) fail(file, `duplicate lesson id ${lesson.id}`);
        lessonIds.add(lesson.id);
        if (lesson.units.at(-1)!.stage !== "sentence") fail(file, `lesson ${lesson.id} must end with a sentence unit`);
        const servedUnits: ServedUnit[] = [];
        for (const unit of lesson.units) {
          if (units.has(unit.id)) fail(file, `duplicate unit id ${unit.id}`);
          if (language !== "en" && !unit.translation) fail(file, `unit ${unit.id} needs a translation`);
          const ws = words(unit.text);
          if (ws.length === 0) fail(file, `unit ${unit.id} has no words`);
          for (const idx of Object.keys(unit.senses ?? {}))
            if (Number(idx) >= ws.length) fail(file, `unit ${unit.id} sense index ${idx} is out of range`);
          const servedWords = ws.map((w, i) => {
            const key = lexKey(w, unit.senses?.[String(i)]);
            const entry = course.lexicon[key];
            if (!entry) fail(file, `unit ${unit.id}: no lexicon entry "${key}"`);
            usedLex.add(key);
            return { ...entry, text: w, audio: addAudio(language, w.toLowerCase()) };
          });
          const s: ServedUnit = {
            id: unit.id, rev: unit.rev, stage: unit.stage, text: unit.text, translation: unit.translation,
            variants: unit.variants ?? [], language, courseId: course.id, lessonId: lesson.id,
            audio: addAudio(language, unit.text), words: servedWords,
          };
          units.set(unit.id, s);
          servedUnits.push(s);
        }
        served.lessons.push({ id: lesson.id, title: lesson.title, grammarFocus: lesson.grammarFocus, units: servedUnits });
      }
      const unused = Object.keys(course.lexicon).filter((k) => !usedLex.has(k));
      if (unused.length) fail(file, `unused lexicon entries: ${unused.join(", ")}`);
      courses.push(served);
    }
  }

  const audioJobs = [...jobs.values()];
  const missing = audioJobs.filter((j) => !existsSync(join(audioDir, j.file)));
  if (missing.length) {
    const msg = `${missing.length} of ${audioJobs.length} audio files missing in ${audioDir} (run npm run content:audio), e.g. "${missing[0].text}"`;
    if (opts.requireAudio) throw new Error(msg);
    console.warn(`WARNING: ${msg}`);
  }
  courses.sort((a, b) => a.language.localeCompare(b.language) || a.order - b.order);
  return { courses, units, audioJobs };
}

function z_message(err: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}
