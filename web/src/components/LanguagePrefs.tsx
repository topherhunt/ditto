import { A } from "@solidjs/router";
import { createEffect, createSignal, onCleanup, Show, type JSX } from "solid-js";
import type { Prefs } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { t } from "../i18n/index.ts";
import { me, refetchMe } from "../session.ts";

type SaveStatus = "saving" | "saved" | { error: string } | null;

/** A save-status line per section, so it shows next to the control that was changed. "Saved" clears after 3 seconds; errors stay. */
export function createSaver() {
  const [status, setStatus] = createSignal<SaveStatus>(null);
  createEffect(() => {
    if (status() !== "saved") return;
    const timer = setTimeout(() => setStatus(null), 3000);
    onCleanup(() => clearTimeout(timer));
  });
  const save = async (request: () => Promise<unknown>) => {
    setStatus("saving");
    try {
      await request();
      await refetchMe();
      setStatus("saved");
    } catch (e) {
      setStatus({ error: (e as Error).message });
    }
  };
  const text = (s: NonNullable<SaveStatus>) => (s === "saving" ? t("settings.saving") : s === "saved" ? t("settings.saved") : t("settings.saveFailed", s));
  const Status = () => <Show when={status()}>{(s) => <div class="qa-settings-status small text-body-secondary">{text(s())}</div>}</Show>;
  return { save, status, markSaved: () => setStatus("saved"), Status };
}

/** A labeled select: stacked under its label, or compact with an icon standing in for the label. */
function Field(props: { label: string; icon: string; compact: boolean; children: JSX.Element }) {
  return (
    <Show when={props.compact} fallback={<label class="form-label mb-0">{props.label}{props.children}</label>}>
      <label class="d-flex align-items-center gap-1 mb-0" title={props.label}>
        <i class={`bi ${props.icon} text-body-secondary`} aria-hidden="true" />
        <span class="visually-hidden">{props.label}</span>
        {props.children}
      </label>
    </Show>
  );
}

/** One language's practice prefs, saved on change. Compact fits them on one row, with short names for the long options. */
export function LanguagePrefs(props: { lang: Language; compact?: boolean }) {
  const { save, status, Status } = createSaver();
  const compact = () => !!props.compact;
  const prefs = () => me()!.prefs[props.lang];
  const savePrefs = (patch: Partial<Prefs>) => save(() => api.put("/api/prefs", { language: props.lang, prefs: { ...prefs(), ...patch } }));
  const select = (qa: string) => `${qa} form-select${compact() ? " form-select-sm w-auto" : ""}`;
  return (
    <div class={compact() ? "d-flex flex-wrap align-items-center gap-3" : "d-flex flex-column gap-3"}>
      <Field label={t("settings.path")} icon="bi-signpost-split" compact={compact()}>
        <select class={select("qa-settings-path")} value={prefs().path} onChange={(e) => savePrefs({ path: e.currentTarget.value as Prefs["path"] })}>
          <option value="full">{t(compact() ? "settings.pathFullShort" : "settings.pathFull")}</option>
          <option value="chunks">{t("settings.pathChunks")}</option>
          <option value="sentences">{t("settings.pathSentences")}</option>
        </select>
      </Field>
      <Field label={t("settings.hints")} icon="bi-lightbulb" compact={compact()}>
        <select class={select("qa-settings-hints")} value={prefs().hints} onChange={(e) => savePrefs({ hints: e.currentTarget.value as Prefs["hints"] })}>
          <option value="letters">{t(compact() ? "settings.hintsLettersShort" : "settings.hintsLetters")}</option>
          <option value="initial">{t(compact() ? "settings.hintsInitialShort" : "settings.hintsInitial")}</option>
          <option value="none">{t(compact() ? "settings.hintsNoneShort" : "settings.hintsNone")}</option>
        </select>
      </Field>
      <Field label={t("settings.autoplay")} icon="bi-play-circle" compact={compact()}>
        <select class={select("qa-settings-autoplay")} value={prefs().autoplay} onChange={(e) => savePrefs({ autoplay: Number(e.currentTarget.value) })}>
          <option value="0">{t("settings.autoplay0")}</option>
          <option value="1">{t("settings.autoplay1")}</option>
          <option value="2">{t("settings.autoplay2")}</option>
          <option value="3">{t("settings.autoplay3")}</option>
        </select>
      </Field>
      <Field label={t("settings.rate")} icon="bi-speedometer2" compact={compact()}>
        <select class={select("qa-settings-rate")} value={prefs().rate} onChange={(e) => savePrefs({ rate: Number(e.currentTarget.value) })}>
          <option value="1">{t("settings.rateNormal")}</option>
          <option value="0.9">0.9×</option>
          <option value="0.75">0.75×</option>
        </select>
      </Field>
      {/* In the row, the status takes the Settings link's place at the end while it shows. */}
      <Show when={compact()} fallback={<Status />}>
        <div class="ms-auto">
          <Show when={status()} fallback={<A href="/settings" class="qa-home-settings small">{t("nav.settings")}</A>}><Status /></Show>
        </div>
      </Show>
    </div>
  );
}
