import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { ACTIVITY_AREAS, type AdminTodayOut } from "../../../shared/api.ts";
import { api } from "../api.ts";

// Admin-only, so English-only: these strings are not in the i18n dictionaries. What is collected and why: docs/metrics.md.

type Range = "today" | "yesterday" | "7";
const RANGES: [Range, string][] = [["today", "Today"], ["yesterday", "Yesterday"], ["7", "Last 7 days"]];
/** Which of activity (the sub-page) and language comes first under each area. */
type Split = "activity" | "language";
const SPLITS: [Split, string][] = [["activity", "Sub-page"], ["language", "Language"]];

type Node = { label: string; seconds: number; learners: Set<string>; children: Node[] };
type Building = Omit<Node, "children"> & { children: Map<string, Building> };
const minutes = (seconds: number) => `${(seconds / 60).toFixed(seconds < 600 ? 1 : 0)} min`;
const languageName = new Intl.DisplayNames("en", { type: "language" });

/** Time per area, then activity and language in the order `split` gives, then learner, so each row opens into what it is made of. */
function buildTree(rows: AdminTodayOut["rows"], split: Split): Node[] {
  const make = (label: string): Building => ({ label, seconds: 0, learners: new Set(), children: new Map() });
  const root = make("");
  for (const r of rows) {
    // Learners are keyed by public id: two learners can both lack a username.
    const activity: [string, string] = [r.activity, r.activity];
    const language: [string, string] = [r.language ?? "", r.language ? (languageName.of(r.language) ?? r.language) : "(no language)"];
    const path: [string, string][] = [
      [ACTIVITY_AREAS[r.activity], ACTIVITY_AREAS[r.activity]], ...(split === "activity" ? [activity, language] : [language, activity]),
      [r.learner, r.username ?? "(no username)"],
    ];
    let node = root;
    for (const [key, label] of path) {
      const child = node.children.get(key) ?? node.children.set(key, make(label)).get(key)!;
      child.seconds += r.seconds;
      child.learners.add(r.learner);
      node = child;
    }
  }
  const finish = (n: Building): Node[] =>
    [...n.children.values()].sort((a, b) => b.seconds - a.seconds).map((c) => ({ ...c, children: finish(c) }));
  return finish(root);
}

function Row(props: { node: Node; max: number }) {
  const bar = () => (
    <div class="flex-grow-1">
      <div class="d-flex flex-wrap column-gap-3 align-items-baseline">
        <span class="fw-medium">{props.node.label}</span>
        <span class="ms-auto text-nowrap">{minutes(props.node.seconds)}</span>
        <Show when={props.node.children.length > 0}>
          <span class="text-body-secondary text-nowrap">{props.node.learners.size} {props.node.learners.size === 1 ? "learner" : "learners"}</span>
        </Show>
      </div>
      <div class="progress mt-1" style={{ height: "4px" }}>
        <div class="progress-bar" style={{ width: `${(props.node.seconds / props.max) * 100}%` }} />
      </div>
    </div>
  );
  return (
    <Show when={props.node.children.length > 0} fallback={<div class="qa-today-row d-flex py-1"><span class="today-caret-gap" />{bar()}</div>}>
      <details class="qa-today-row py-1">
        <summary class="d-flex align-items-start" style={{ cursor: "pointer" }}>
          <i class="today-caret bi bi-chevron-right text-body-secondary" aria-hidden="true" />
          {bar()}
        </summary>
        <div class="ps-3 border-start ms-1 mt-1">
          <For each={props.node.children}>{(child) => <Row node={child} max={props.max} />}</For>
        </div>
      </details>
    </Show>
  );
}

/** Who was actively engaged in a window and where their time went, opening from area down to learner. */
export function MetricsToday() {
  const [range, setRange] = createSignal<Range>("today");
  const [split, setSplit] = createSignal<Split>("activity");
  const [t] = createResource(range, (r) => api.get<AdminTodayOut>(`/api/admin/metrics/today?range=${r}`));
  const tree = createMemo(() => (t() ? buildTree(t()!.rows, split()) : []));
  const totalSeconds = () => tree().reduce((n, a) => n + a.seconds, 0);
  return (
    <section class="qa-today">
      <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
        <h2 class="h6 text-body-secondary text-uppercase mb-0 me-auto">Who was here and what they did</h2>
        <div class="btn-group btn-group-sm" role="group">
          <For each={RANGES}>
            {([value, label]) => (
              <button type="button" class={`qa-today-range-${value} btn btn-outline-secondary`} classList={{ active: range() === value }} onClick={() => setRange(value)}>{label}</button>
            )}
          </For>
        </div>
        <div class="btn-group btn-group-sm" role="group" aria-label="Split areas by">
          <For each={SPLITS}>
            {([value, label]) => (
              <button type="button" class={`qa-today-split-${value} btn btn-outline-secondary`} classList={{ active: split() === value }} onClick={() => setSplit(value)}>{label}</button>
            )}
          </For>
        </div>
      </div>
      <Show when={t()}>
        {(t) => (
          <>
            <p class="mb-1">
              <span class="qa-today-engaged fs-4 fw-semibold">{t().engagedLearners}</span>{" "}
              {t().engagedLearners === 1 ? "learner" : "learners"} actively engaged
              <span class="text-body-secondary"> · {minutes(totalSeconds())} in total</span>
            </p>
            <p class="small text-body-secondary">
              Actively engaged: at least {t().minSeconds / 60} minutes of engaged time on one UTC day
              {t().from === t().to ? ` (${t().from})` : ` (${t().from} to ${t().to})`}.
              {" "}{t().otherLearners} more {t().otherLearners === 1 ? "was" : "were"} here for less; their time is counted below.
              Tap a row to open it into {split() === "activity" ? "activity, language" : "language, activity"}, then learner.
            </p>
            <Show when={tree().length > 0} fallback={<p class="text-body-secondary">No engaged time in this window.</p>}>
              <For each={tree()}>{(area) => <Row node={area} max={tree()[0].seconds} />}</For>
            </Show>
          </>
        )}
      </Show>
    </section>
  );
}
