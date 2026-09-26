import { A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import type { ExplanationOut, MistakeEntry } from "../../../shared/api.ts";
import { grade } from "../../../shared/grader.ts";
import { words } from "../../../shared/tokenize.ts";
import { api } from "../api.ts";
import { SentenceDiff } from "../components/WordDiff.tsx";
import { categoryName, t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";

function Entry(props: { entry: MistakeEntry; onRemove: () => void }) {
  const [explanation, setExplanation] = createSignal<ExplanationOut | null>(props.entry.explanation);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const diff = () => {
    const a = props.entry.lastAnswer;
    if (!a || !words(a).length) return null;
    // A passing answer means only the meaning was missed: nothing to diff or explain.
    const r = grade({ mode: "free", text: a }, props.entry.unit);
    return r.passed ? null : r;
  };
  const explain = async () => {
    setLoading(true);
    setError(null);
    try {
      setExplanation(await api.post<ExplanationOut>("/api/explain", { unitId: props.entry.unit.id, answer: props.entry.lastAnswer }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <li class="qa-mistake list-group-item d-flex flex-column gap-2">
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="qa-mistake-play btn btn-sm btn-outline-primary" onClick={() => new Audio(props.entry.unit.audio[Math.floor(Math.random() * props.entry.unit.audio.length)]).play()}>▶</button>
        <span class="qa-mistake-text fw-semibold me-auto">{props.entry.unit.text}</span>
        <span class="small text-body-secondary text-nowrap">{t("notebook.missed", { n: props.entry.wrongCount })}</span>
        <button type="button" class="qa-mistake-remove btn btn-sm btn-outline-secondary" onClick={props.onRemove}>{t("notebook.remove")}</button>
      </div>
      <Show when={props.entry.unit.translation}><div class="small text-body-secondary fst-italic">{props.entry.unit.translation}</div></Show>
      <Show when={diff()}>{(d) => <div class="small">{t("notebook.youWrote")} <SentenceDiff result={d()} /></div>}</Show>
      <div class="d-flex flex-wrap gap-1">
        <For each={props.entry.categories}>{(c) => <span class="qa-mistake-category badge text-bg-light">{categoryName(c)}</span>}</For>
        <Show when={props.entry.cleanStreak > 0}><span class="badge text-bg-success">{t("notebook.streak", { n: props.entry.cleanStreak })}</span></Show>
      </div>
      <Show
        when={explanation()}
        fallback={
          <Show when={diff()}>
            <div>
              <button type="button" class="qa-why btn btn-sm btn-outline-info" disabled={loading()} onClick={explain}>{loading() ? t("exercise.thinking") : t("notebook.why")}</button>
            </div>
          </Show>
        }
      >
        {(ex) => (
          <div class="qa-explanation alert alert-info mb-0 small">
            <strong>{ex().summary}</strong> {ex().details}
          </div>
        )}
      </Show>
      <Show when={error()}>{(m) => <div class="alert alert-warning mb-0 small">{m()}</div>}</Show>
    </li>
  );
}

export function Notebook() {
  const lang = useLang();
  const [entries, { mutate }] = createResource(lang, (l) => api.get<MistakeEntry[]>(`/api/mistakes?lang=${l}`));
  const remove = async (unitId: string) => {
    await api.del(`/api/mistakes/${unitId}`);
    mutate((list) => list!.filter((e) => e.unit.id !== unitId));
  };
  return (
    <div class="d-flex flex-column gap-3">
      <div class="d-flex align-items-center gap-2">
        <h1 class="h4 mb-0 me-auto">{t("notebook.title")}</h1>
        <Show when={entries()?.length}>
          <A href={`/${lang()}/mistakes/practice`} class="qa-mistakes-practice btn btn-primary">{t("notebook.practice")}</A>
        </Show>
      </div>
      <p class="small text-body-secondary mb-0">{t("notebook.rule")}</p>
      <Show when={entries()}>
        {(list) => (
          <ul class="list-group">
            <For each={list()} fallback={<li class="qa-notebook-empty list-group-item text-body-secondary">{t("notebook.empty")}</li>}>
              {(e) => <Entry entry={e} onRemove={() => remove(e.unit.id)} />}
            </For>
          </ul>
        )}
      </Show>
    </div>
  );
}
