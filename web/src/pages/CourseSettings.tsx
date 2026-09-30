import { A } from "@solidjs/router";
import { LanguagePrefs } from "../components/LanguagePrefs.tsx";
import { TypeCrumb } from "../components/TypeCrumb.tsx";
import { languageInSentence, t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";

/** How dictation works for one language: the only place its practice prefs are edited. */
export function CourseSettings() {
  const lang = useLang();
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }} data-silent>
      <div class="d-flex flex-wrap column-gap-4">
        <TypeCrumb lang={lang()} class="qa-course-settings-back" />
        <A href="/settings" class="qa-course-settings-account small"><i class="bi bi-gear me-1" aria-hidden="true" />{t("settings.account")}</A>
      </div>
      <h1 class="qa-course-settings-title h4 mb-0">{t("settings.course", { language: languageInSentence(lang()) })}</h1>
      <LanguagePrefs lang={lang()} />
    </div>
  );
}
