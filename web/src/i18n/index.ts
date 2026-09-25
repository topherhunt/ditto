import { createEffect, createRoot, createSignal } from "solid-js";
import { LOCALES, type Language, type Locale } from "../../../shared/content.ts";
import { en, type Dictionary, type Key } from "./en.ts";
import { es419 } from "./es-419.ts";
import { it } from "./it.ts";
import { nl } from "./nl.ts";

const DICTIONARIES: Record<Locale, Dictionary> = { en, "es-419": es419, nl, it };

/** Each locale's name in its own language, for the pickers. */
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", "es-419": "Español (Latinoamérica)", nl: "Nederlands", it: "Italiano" };

const STORAGE_KEY = "locale";

/** Before sign-in: the last locale used on this device, else the browser's first language we have, else English. */
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch { /* storage unavailable: use the browser language */ }
  for (const tag of navigator.languages) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "es") return "es-419";
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return "en";
}

export const [locale, setLocale] = createSignal<Locale>(initialLocale());

createRoot(() =>
  createEffect(() => {
    document.documentElement.lang = locale();
    try { localStorage.setItem(STORAGE_KEY, locale()); } catch { /* storage unavailable */ }
  }),
);

/** The current locale's string for `key`, with each `{name}` replaced from `vars`. */
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  return DICTIONARIES[locale()][key].replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in vars)) throw new Error(`t("${key}"): missing variable {${name}}`);
    return String(vars[name]);
  });
}

export const languageName = (l: Language) => t(`language.${l}`);

/** A mistake category from the grader or the explainer, e.g. `missing_word`. */
export function categoryName(c: string): string {
  const key = `category.${c}`;
  if (!(key in en)) throw new Error(`Unknown mistake category "${c}"`);
  return t(key as Key);
}
