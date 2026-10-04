import { useLocation, useNavigate } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import type { LearnerLevel } from "../../../shared/api.ts";
import { NATIVE_LOCALES, type Language, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { LOCALE_LABELS, t } from "../i18n/index.ts";
import { homeLanguage, rememberLanguage, saveLevel } from "../learning.ts";
import { logout, me, refetchMe } from "../session.ts";
import { LearnPicker } from "./LearnPicker.tsx";
import { RequestLanguagePopup } from "./RequestLanguage.tsx";
import { LevelPicker } from "./LevelPicker.tsx";
import { UsernameForm } from "./UsernameForm.tsx";

/** A new account's one screen: how much of the course it knows (plus which course, if the homepage didn't ask) and a username. */
export function Setup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [picked, setPicked] = createSignal<Language | null>(me()!.learning.length ? homeLanguage(me()!.learning) : null);
  const [level, setLevel] = createSignal<LearnerLevel | null>(null);
  const needsCourse = me()!.learning.length === 0;

  const before = async () => {
    const lang = picked();
    if (!lang) throw new Error(t("setup.pickCourse"));
    if (needsCourse) {
      await api.put("/api/learning", { languages: [lang] });
      rememberLanguage(lang);
    }
    await saveLevel(lang, level()!);
  };

  return (
    <div class="qa-choose-username container py-5" style={{ "max-width": "28rem" }}>
      <h1 class="h4">{t("setup.title")}</h1>
      <p class="text-body-secondary">{t("setup.intro")}</p>
      <LocalePicker />
      <UsernameForm initial={null} submitLabel={t("username.continue")} hint={t("username.intro")} before={before}
        onSaved={() => { if (location.pathname === "/") navigate(`/${picked()}`); }}>
        <Show when={needsCourse}>
          <div class="mb-3">
            <h2 class="h6">{t("welcome.learnQ")}</h2>
            <LearnPicker locale={me()!.locale} chosen={picked()} onChoose={setPicked} />
          </div>
        </Show>
        <Show when={picked()} keyed>
          {(lang) => <div class="mb-3"><LevelPicker lang={lang} chosen={level()} onChoose={setLevel} /></div>}
        </Show>
      </UsernameForm>
      <button type="button" class="qa-logout btn btn-link btn-sm px-0 mt-3" onClick={logout}>{t("nav.signOut")}</button>
    </div>
  );
}

/** The select value that opens the language request instead of choosing a language. */
const OTHER = "other";

/** Saves on change, so the rest of the screen switches language right away. */
function LocalePicker() {
  const [error, setError] = createSignal<string | null>(null);
  const [requesting, setRequesting] = createSignal(false);
  const choose = async (locale: Locale) => {
    setError(null);
    try {
      await api.put("/api/locale", { locale });
      await refetchMe();
    } catch (e) {
      setError(t("settings.saveFailed", { error: (e as Error).message }));
    }
  };
  return (
    <div class="mb-3">
      <label class="form-label small mb-0 d-block">
        {t("settings.yourLanguage")}
        <select class="qa-choose-locale form-select form-select-sm" value={me()!.locale} onChange={(e) => {
          if (e.currentTarget.value === OTHER) { e.currentTarget.value = me()!.locale; setRequesting(true); } else void choose(e.currentTarget.value as Locale);
        }}>
          <For each={NATIVE_LOCALES}>{(l) => <option value={l}>{LOCALE_LABELS[l]}</option>}</For>
          <option disabled>──────────</option>
          <option value={OTHER} class="qa-choose-locale-other">{t("request.menu")}</option>
        </select>
        <Show when={error()}>{(m) => <div class="qa-choose-locale-error text-danger small">{m()}</div>}</Show>
      </label>
      <RequestLanguagePopup open={requesting()} onClose={() => setRequesting(false)} />
    </div>
  );
}
