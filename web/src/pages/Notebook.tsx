import { A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import type { ExplanationOut, MistakeEntry } from "../../../shared/api.ts";
import { grade } from "../../../shared/grader.ts";
import { words } from "../../../shared/tokenize.ts";
import { api } from "../api.ts";
import { SentenceDiff } from "../components/WordDiff.tsx";
import { useLang } from "./lang.ts";

function Entry(props: { entry: MistakeEntry; onRemove: () => void }) {
  const [explanation, setExplanation] = createSignal<ExplanationOut | null>(props.entry.explanation);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const diff = () => {
    const a = props.entry.lastAnswer;
    return a && words(a).length ? grade(words(a), props.entry.unit.text, props.entry.unit.variants, "free").words : null;
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
        <button type="button" class="qa-mistake-play btn btn-sm btn-outline-primary" onClick={() => new Audio(props.entry.unit.audio).play()}>▶</button>
        <span class="qa-mistake-text fw-semibold me-auto">{props.entry.unit.text}</span>
        <span class="small text-body-secondary text-nowrap">missed {props.entry.wrongCount}×</span>
        <button type="button" class="qa-mistake-remove btn btn-sm btn-outline-secondary" onClick={props.onRemove}>Remove</button>
      </div>
      <Show when={props.entry.unit.translation}><div class="small text-body-secondary fst-italic">{props.entry.unit.translation}</div></Show>
      <Show when={diff()}>{(d) => <div class="small">You wrote: <SentenceDiff words={d()} /></div>}</Show>
      <div class="d-flex flex-wrap gap-1">
        <For each={props.entry.categories}>{(c) => <span class="badge text-bg-light">{c.replaceAll("_", " ")}</span>}</For>
        <Show when={props.entry.cleanStreak > 0}><span class="badge text-bg-success">{props.entry.cleanStreak} clean in a row</span></Show>
      </div>
      <Show
        when={explanation()}
        fallback={
          <Show when={diff()}>
            <div>
              <button type="button" class="qa-why btn btn-sm btn-outline-info" disabled={loading()} onClick={explain}>{loading() ? "Thinking…" : "Why?"}</button>
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
        <h1 class="h4 mb-0 me-auto">Mistakes notebook</h1>
        <Show when={entries()?.length}>
          <A href={`/${lang()}/mistakes/practice`} class="qa-mistakes-practice btn btn-primary">Practice these</A>
        </Show>
      </div>
      <p class="small text-body-secondary mb-0">An entry leaves the notebook after two clean attempts in a row.</p>
      <Show when={entries()}>
        {(list) => (
          <ul class="list-group">
            <For each={list()} fallback={<li class="qa-notebook-empty list-group-item text-body-secondary">No mistakes. Nice.</li>}>
              {(e) => <Entry entry={e} onRemove={() => remove(e.unit.id)} />}
            </For>
          </ul>
        )}
      </Show>
    </div>
  );
}
