import type { HelpTopic, LearnerLevel, Prefs } from "../../shared/api.ts";
import { LANGUAGES, SUPPORT_LOCALES, type Language, type Locale, type PracticePath } from "../../shared/content.ts";
import { api } from "./api.ts";
import { me, refetchMe } from "./session.ts";

const LAST_LANG_KEY = "lastLanguage";

export const LANGUAGE_FLAGS: Record<Language, string> = { en: "🇺🇸", el: "🇬🇷", es: "🇲🇽", fr: "🇫🇷", it: "🇮🇹", nl: "🇳🇱", ga: "🇮🇪" };

/** The courses to offer a speaker of `locale`: ones with translations into it, minus its own language. */
export const learnable = (locale: Locale) => LANGUAGES.filter((l) => l !== locale && SUPPORT_LOCALES[l].includes(locale));

/** The course last picked on this device, signed in or not. */
export function storedLanguage(): Language | null {
  try {
    const l = localStorage.getItem(LAST_LANG_KEY);
    if (l && (LANGUAGES as readonly string[]).includes(l)) return l as Language;
  } catch { /* storage unavailable */ }
  return null;
}

export function rememberLanguage(l: Language) {
  try { localStorage.setItem(LAST_LANG_KEY, l); } catch { /* storage unavailable */ }
}

/** The dictation path a self-rated level starts on: beginners from single words, stronger learners past them. */
const LEVEL_PATH: Record<LearnerLevel, PracticePath> = { A1: "full", A2: "full", B1: "chunks", B2: "sentences" };

/** Saves the learner's answer to "how much do you know?" along with the practice defaults it implies: beginners study each item before typing it. */
export async function saveLevel(lang: Language, level: LearnerLevel) {
  const prefs: Prefs = { ...me()!.prefs[lang], level, path: LEVEL_PATH[level], studyFirst: level === "A1" };
  await api.put("/api/prefs", { language: lang, prefs });
  await refetchMe();
}

/** Remembers that the learner dismissed an activity's help in this course, so it opens by itself only once per course. */
export async function markHelpSeen(lang: Language, topic: HelpTopic) {
  const prefs = me()!.prefs[lang];
  if (prefs.helpSeen.includes(topic)) return;
  await api.put("/api/prefs", { language: lang, prefs: { ...prefs, helpSeen: [...prefs.helpSeen, topic] } });
  await refetchMe();
}

/** The course the nav points at: the one last picked on this device if the learner still studies it, else their first. */
export function homeLanguage(learning: Language[]): Language {
  if (learning.length === 0) throw new Error("homeLanguage: the learner studies no language yet");
  const l = storedLanguage();
  return l && learning.includes(l) ? l : learning[0];
}
