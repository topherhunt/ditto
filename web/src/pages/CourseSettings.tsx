import { A } from "@solidjs/router";
import { LanguagePrefs } from "../components/LanguagePrefs.tsx";
import { languageName, t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";

/** How dictation works for one language: the only place its practice prefs are edited. */
export function CourseSettings() {
  const lang = useLang();
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }} data-silent>
      <A href={`/${lang()}`} class="qa-course-settings-back small">← {languageName(lang())}</A>
      <h1 class="qa-course-settings-title h4 mb-0">{t("settings.course", { language: languageName(lang()) })}</h1>
      <LanguagePrefs lang={lang()} />
    </div>
  );
}
