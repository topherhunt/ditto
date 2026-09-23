import { createSignal, Show } from "solid-js";
import type { Prefs } from "../../../shared/api.ts";
import { LANGUAGE_NAMES } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { me, refetchMe } from "../session.ts";
import { useLang } from "./lang.ts";

export function Settings() {
  const lang = useLang();
  const [status, setStatus] = createSignal<string | null>(null);
  const prefs = () => me()!.prefs[lang()];
  const save = async (patch: Partial<Prefs>) => {
    setStatus("Saving…");
    try {
      await api.put("/api/prefs", { language: lang(), prefs: { ...prefs(), ...patch } });
      await refetchMe();
      setStatus("Saved");
    } catch (e) {
      setStatus(`Could not save: ${(e as Error).message}`);
    }
  };
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }}>
      <h1 class="h4 mb-0">{LANGUAGE_NAMES[lang()]} settings</h1>
      <label class="form-label mb-0">
        Practice path
        <select class="qa-settings-path form-select" value={prefs().path} onChange={(e) => save({ path: e.currentTarget.value as Prefs["path"] })}>
          <option value="full">Full: words, phrases, chunks, sentences</option>
          <option value="chunks">Chunks and sentences</option>
          <option value="sentences">Sentences only</option>
        </select>
      </label>
      <label class="form-label mb-0">
        Hints
        <select class="qa-settings-hints form-select" value={prefs().hints} onChange={(e) => save({ hints: e.currentTarget.value as Prefs["hints"] })}>
          <option value="letters">First letter and word length</option>
          <option value="initial">First letter only</option>
          <option value="none">None: one free text box</option>
        </select>
      </label>
      <label class="form-label mb-0">
        Autoplay
        <select class="qa-settings-autoplay form-select" value={prefs().autoplay} onChange={(e) => save({ autoplay: Number(e.currentTarget.value) })}>
          <option value="0">Off</option>
          <option value="1">Once</option>
          <option value="2">Twice</option>
          <option value="3">Three times</option>
        </select>
      </label>
      <label class="form-label mb-0">
        Playback speed
        <select class="qa-settings-rate form-select" value={prefs().rate} onChange={(e) => save({ rate: Number(e.currentTarget.value) })}>
          <option value="1">Normal</option>
          <option value="0.9">0.9×</option>
          <option value="0.75">0.75×</option>
        </select>
      </label>
      <Show when={status()}>{(s) => <div class="qa-settings-status small text-body-secondary">{s()}</div>}</Show>
    </div>
  );
}
