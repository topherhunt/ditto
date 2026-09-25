import { createSignal, For, Show } from "solid-js";
import type { Prefs } from "../../../shared/api.ts";
import { LANGUAGES, LOCALES, type Language, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { UsernameForm } from "../components/UsernameForm.tsx";
import { languageName, LOCALE_LABELS, t } from "../i18n/index.ts";
import { me, refetchMe } from "../session.ts";

/** A save-status line per section, so it shows next to the control that was changed. */
function createSaver() {
  const [status, setStatus] = createSignal<string | null>(null);
  const save = async (request: () => Promise<unknown>) => {
    setStatus(t("settings.saving"));
    try {
      await request();
      await refetchMe();
      setStatus(t("settings.saved"));
    } catch (e) {
      setStatus(t("settings.saveFailed", { error: (e as Error).message }));
    }
  };
  const Status = () => <Show when={status()}>{(s) => <div class="qa-settings-status small text-body-secondary">{s()}</div>}</Show>;
  return { save, setStatus, Status };
}

export function Settings() {
  const { save, setStatus, Status } = createSaver();
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }}>
      <h1 class="qa-settings-title h4 mb-0">{t("settings.title")}</h1>
      <div class="qa-settings-general d-flex flex-column gap-3">
        <label class="form-label mb-0">
          {t("settings.interface")}
          <select class="qa-settings-locale form-select" value={me()!.locale}
            onChange={(e) => save(() => api.put("/api/locale", { locale: e.currentTarget.value as Locale }))}>
            <For each={LOCALES}>{(l) => <option value={l}>{LOCALE_LABELS[l]}</option>}</For>
          </select>
        </label>
        <UsernameForm initial={me()!.username} submitLabel={t("username.save")} onSaved={() => setStatus(t("settings.saved"))} />
        <Status />
      </div>
      <For each={LANGUAGES}>{(lang) => <LanguageSettings lang={lang} />}</For>
    </div>
  );
}

function LanguageSettings(props: { lang: Language }) {
  const { save, Status } = createSaver();
  const prefs = () => me()!.prefs[props.lang];
  const savePrefs = (patch: Partial<Prefs>) => save(() => api.put("/api/prefs", { language: props.lang, prefs: { ...prefs(), ...patch } }));
  return (
    <details class={`qa-settings-lang-${props.lang} border rounded px-3 py-2`}>
      <summary class="h6 mb-0">{t("settings.course", { language: languageName(props.lang) })}</summary>
      <div class="d-flex flex-column gap-3 mt-3 mb-2">
        <label class="form-label mb-0">
          {t("settings.path")}
          <select class="qa-settings-path form-select" value={prefs().path} onChange={(e) => savePrefs({ path: e.currentTarget.value as Prefs["path"] })}>
            <option value="full">{t("settings.pathFull")}</option>
            <option value="chunks">{t("settings.pathChunks")}</option>
            <option value="sentences">{t("settings.pathSentences")}</option>
          </select>
        </label>
        <label class="form-label mb-0">
          {t("settings.hints")}
          <select class="qa-settings-hints form-select" value={prefs().hints} onChange={(e) => savePrefs({ hints: e.currentTarget.value as Prefs["hints"] })}>
            <option value="letters">{t("settings.hintsLetters")}</option>
            <option value="initial">{t("settings.hintsInitial")}</option>
            <option value="none">{t("settings.hintsNone")}</option>
          </select>
        </label>
        <label class="form-label mb-0">
          {t("settings.autoplay")}
          <select class="qa-settings-autoplay form-select" value={prefs().autoplay} onChange={(e) => savePrefs({ autoplay: Number(e.currentTarget.value) })}>
            <option value="0">{t("settings.autoplay0")}</option>
            <option value="1">{t("settings.autoplay1")}</option>
            <option value="2">{t("settings.autoplay2")}</option>
            <option value="3">{t("settings.autoplay3")}</option>
          </select>
        </label>
        <label class="form-label mb-0">
          {t("settings.rate")}
          <select class="qa-settings-rate form-select" value={prefs().rate} onChange={(e) => savePrefs({ rate: Number(e.currentTarget.value) })}>
            <option value="1">{t("settings.rateNormal")}</option>
            <option value="0.9">0.9×</option>
            <option value="0.75">0.75×</option>
          </select>
        </label>
        <Status />
      </div>
    </details>
  );
}
