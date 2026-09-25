import { createSignal, For, Show } from "solid-js";
import type { Prefs } from "../../../shared/api.ts";
import { LOCALES, type Locale } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { languageName, LOCALE_LABELS, t } from "../i18n/index.ts";
import { me, refetchMe } from "../session.ts";
import { useLang } from "./lang.ts";

export function Settings() {
  const lang = useLang();
  const [status, setStatus] = createSignal<string | null>(null);
  const prefs = () => me()!.prefs[lang()];
  const saving = async (request: () => Promise<unknown>) => {
    setStatus(t("settings.saving"));
    try {
      await request();
      await refetchMe();
      setStatus(t("settings.saved"));
    } catch (e) {
      setStatus(t("settings.saveFailed", { error: (e as Error).message }));
    }
  };
  const save = (patch: Partial<Prefs>) => saving(() => api.put("/api/prefs", { language: lang(), prefs: { ...prefs(), ...patch } }));
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }}>
      <h1 class="h4 mb-0">{t("settings.title")}</h1>
      <label class="form-label mb-0">
        {t("settings.interface")}
        <select class="qa-settings-locale form-select" value={me()!.locale}
          onChange={(e) => saving(() => api.put("/api/locale", { locale: e.currentTarget.value as Locale }))}>
          <For each={LOCALES}>{(l) => <option value={l}>{LOCALE_LABELS[l]}</option>}</For>
        </select>
      </label>
      <h2 class="h5 mb-0 mt-2">{t("settings.course", { language: languageName(lang()) })}</h2>
      <label class="form-label mb-0">
        {t("settings.path")}
        <select class="qa-settings-path form-select" value={prefs().path} onChange={(e) => save({ path: e.currentTarget.value as Prefs["path"] })}>
          <option value="full">{t("settings.pathFull")}</option>
          <option value="chunks">{t("settings.pathChunks")}</option>
          <option value="sentences">{t("settings.pathSentences")}</option>
        </select>
      </label>
      <label class="form-label mb-0">
        {t("settings.hints")}
        <select class="qa-settings-hints form-select" value={prefs().hints} onChange={(e) => save({ hints: e.currentTarget.value as Prefs["hints"] })}>
          <option value="letters">{t("settings.hintsLetters")}</option>
          <option value="initial">{t("settings.hintsInitial")}</option>
          <option value="none">{t("settings.hintsNone")}</option>
        </select>
      </label>
      <label class="form-label mb-0">
        {t("settings.autoplay")}
        <select class="qa-settings-autoplay form-select" value={prefs().autoplay} onChange={(e) => save({ autoplay: Number(e.currentTarget.value) })}>
          <option value="0">{t("settings.autoplay0")}</option>
          <option value="1">{t("settings.autoplay1")}</option>
          <option value="2">{t("settings.autoplay2")}</option>
          <option value="3">{t("settings.autoplay3")}</option>
        </select>
      </label>
      <label class="form-label mb-0">
        {t("settings.rate")}
        <select class="qa-settings-rate form-select" value={prefs().rate} onChange={(e) => save({ rate: Number(e.currentTarget.value) })}>
          <option value="1">{t("settings.rateNormal")}</option>
          <option value="0.9">0.9×</option>
          <option value="0.75">0.75×</option>
        </select>
      </label>
      <Show when={status()}>{(s) => <div class="qa-settings-status small text-body-secondary">{s()}</div>}</Show>
    </div>
  );
}
