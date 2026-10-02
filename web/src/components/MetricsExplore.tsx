import { useSearchParams } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { EXPLORE_GROUPS, EXPLORE_METRICS, type AdminExploreOut, type ExploreGroup, type ExploreMetric } from "../../../shared/api.ts";
import { api } from "../api.ts";

// Admin-only, so English-only: these strings are not in the i18n dictionaries. What is collected and why: docs/metrics.md.

type Params = { days?: string; grain?: string; by?: string; metric?: string; area?: string; activity?: string; language?: string; learner?: string };

const METRIC_LABELS: Record<ExploreMetric, string> = { minutes: "Engaged minutes", learners: "Active learners", perLearner: "Minutes per learner" };
const GROUP_LABELS: Record<ExploreGroup, string> = { none: "Nothing (total)", area: "Area (Type, Talk, Quiz)", activity: "Activity", language: "Language", learner: "Learner" };
/** After clicking a series, the dimension that splits what is left. */
const DRILL: Record<Exclude<ExploreGroup, "none">, { filter: keyof Params; next: ExploreGroup }> = {
  area: { filter: "area", next: "activity" }, activity: { filter: "activity", next: "language" },
  language: { filter: "language", next: "activity" }, learner: { filter: "learner", next: "activity" },
};
/** Okabe-Ito, which stays distinguishable for colour-blind readers; "other" is grey. */
const COLORS = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"];
const OTHER_COLOR = "#8a8f98";
const languageName = new Intl.DisplayNames("en", { type: "language" });

const W = 640, H = 240, LEFT = 40, BOTTOM = 22, TOP = 8;

/** The smallest 1, 2 or 5 times a power of ten that is at least `n`. */
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  return ([1, 2, 5, 10].find((m) => m * p >= n) ?? 10) * p;
}

type Tip = { x: number; y: number; text: string };

/** Stacked bars (series add up) or one line per series (they don't). Hovering or tapping a bar section or point names it in a tooltip. */
function Chart(props: { data: AdminExploreOut; stacked: boolean; label: (s: AdminExploreOut["series"][number]) => string; unit: string; weekly: boolean }) {
  const [tip, setTip] = createSignal<Tip | null>(null);
  const n = () => props.data.buckets.length;
  const colorOf = (i: number, key: string) => (key === "other" ? OTHER_COLOR : COLORS[i % COLORS.length]);
  const top = () => {
    const per = props.data.buckets.map((_, b) => props.data.series.map((s) => s.values[b]));
    return niceCeil(Math.max(0, ...per.map((v) => (props.stacked ? v.reduce((a, c) => a + c, 0) : Math.max(0, ...v)))));
  };
  const x = (i: number) => LEFT + ((i + 0.5) * (W - LEFT)) / n();
  const y = (v: number) => TOP + (1 - v / top()) * (H - TOP - BOTTOM);
  const band = () => (W - LEFT) / n();
  const ticks = () => [0, top() / 2, top()];
  const labelAt = () => [0, Math.floor((n() - 1) / 2), n() - 1].filter((v, i, all) => all.indexOf(v) === i);
  const show = (s: AdminExploreOut["series"][number], b: number, atY: number): Tip => ({
    x: x(b), y: atY,
    text: `${props.label(s)}: ${s.values[b]} ${props.unit}, ${props.weekly ? "week of " : ""}${props.data.buckets[b]}`,
  });
  const hover = (t: () => Tip) => ({ onPointerEnter: () => setTip(t()), onPointerDown: () => setTip(t()), onPointerLeave: () => setTip(null) });
  return (
    <div class="position-relative">
      <svg viewBox={`0 0 ${W} ${H}`} class="qa-explore-chart w-100" role="img" aria-label="Chart of the table below" style={{ "max-height": "320px" }}>
        <For each={ticks()}>
          {(t) => (
            <>
              <line x1={LEFT} x2={W} y1={y(t)} y2={y(t)} stroke="currentColor" stroke-opacity="0.15" />
              <text x={LEFT - 6} y={y(t) + 4} text-anchor="end" font-size="11" fill="currentColor" fill-opacity="0.7">{t}</text>
            </>
          )}
        </For>
        <For each={labelAt()}>
          {(i) => <text x={x(i)} y={H - 6} text-anchor="middle" font-size="11" fill="currentColor" fill-opacity="0.7">{props.data.buckets[i].slice(5)}</text>}
        </For>
        <Show
          when={props.stacked}
          fallback={
            <For each={props.data.series}>
              {(s, si) => (
                <>
                  <polyline fill="none" stroke-width="2" stroke={colorOf(si(), s.key)} points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
                  <For each={s.values}>
                    {(v, i) => <circle class="qa-explore-point" cx={x(i())} cy={y(v)} r={Math.max(4, Math.min(8, band() / 2))} fill={colorOf(si(), s.key)} fill-opacity="0" {...hover(() => show(s, i(), y(v)))} />}
                  </For>
                </>
              )}
            </For>
          }
        >
          <For each={props.data.buckets}>
            {(_, b) => {
              const segments = () => {
                let below = 0;
                return props.data.series.map((s, si) => {
                  const from = below;
                  below += s.values[b()];
                  return { s, si, from, to: below };
                });
              };
              return (
                <For each={segments()}>
                  {(seg) => (
                    <Show when={seg.to > seg.from}>
                      <rect
                        class="qa-explore-bar" x={x(b()) - band() * 0.4} width={band() * 0.8} y={y(seg.to)} height={y(seg.from) - y(seg.to)}
                        fill={colorOf(seg.si, seg.s.key)} {...hover(() => show(seg.s, b(), y(seg.to)))}
                      />
                    </Show>
                  )}
                </For>
              );
            }}
          </For>
        </Show>
      </svg>
      <Show when={tip()}>
        {(t) => (
          <div
            class="qa-explore-tip position-absolute pe-none text-nowrap small bg-dark text-white border border-secondary rounded px-2 py-1 shadow"
            style={{ left: `${Math.min(Math.max((t().x / W) * 100, 15), 85)}%`, top: `${(t().y / H) * 100}%`, transform: "translate(-50%, calc(-100% - 6px))" }}
          >
            {t().text}
          </div>
        )}
      </Show>
    </div>
  );
}

/** A day or week chart of engaged time that you split by area, activity, language or learner, and drill into by tapping a series. */
export function MetricsExplore() {
  const [params, setParams] = useSearchParams<Params>();
  const days = () => params.days ?? "30";
  const grain = () => params.grain ?? "day";
  const by = () => (params.by ?? "activity") as ExploreGroup;
  const metric = () => (params.metric ?? "minutes") as ExploreMetric;
  const filters = () => (["area", "activity", "language", "learner"] as const).filter((f) => params[f]);
  const query = () => {
    const q = new URLSearchParams({ days: days(), grain: grain(), by: by(), metric: metric() });
    for (const f of filters()) q.set(f, params[f]!);
    return q.toString();
  };
  const [data] = createResource(query, (q) => api.get<AdminExploreOut>(`/api/admin/metrics/explore?${q}`));

  /** Labels follow the response's own grouping: right after a click, `by()` is ahead of the data still on screen. */
  const labelOf = (d: AdminExploreOut, s: AdminExploreOut["series"][number]) =>
    s.key === "other" || d.by === "learner" ? s.label
    : d.by === "language" ? (s.key ? (languageName.of(s.key) ?? s.key) : "(no language)")
    : d.by === "area" ? s.key[0].toUpperCase() + s.key.slice(1)
    : s.label;
  const filterLabel = (f: "area" | "activity" | "language" | "learner") => {
    const v = params[f]!;
    return f === "language" ? (languageName.of(v) ?? v) : f === "learner" ? (data()?.learner?.username ?? "(no username)") : v;
  };
  const drill = (key: string) => {
    const g = by();
    if (g === "none" || (g === "language" && key === "")) return;
    const { filter, next } = DRILL[g];
    setParams({ [filter]: key, by: next });
  };
  /** Minutes add up across series; learner counts and per-learner averages don't, so those get lines unless there is only one series. */
  const stacked = (d: AdminExploreOut) => metric() === "minutes" || d.series.length === 1;
  const unit = () => (metric() === "learners" ? "learners" : metric() === "minutes" ? "min" : "min per learner");
  const select = (label: string, value: () => string, key: keyof Params, options: [string, string][]) => (
    <label class="small text-body-secondary d-flex flex-column">
      {label}
      <select class={`qa-explore-${key} form-select form-select-sm`} value={value()} onChange={(e) => setParams({ [key]: e.currentTarget.value })}>
        <For each={options}>{([v, text]) => <option value={v} selected={v === value()}>{text}</option>}</For>
      </select>
    </label>
  );
  return (
    <section class="qa-explore">
      <h2 class="h6 text-body-secondary text-uppercase">Explore engaged time</h2>
      <div class="d-flex flex-wrap gap-3 mb-2">
        {select("Show", metric, "metric", EXPLORE_METRICS.map((m) => [m, METRIC_LABELS[m]]))}
        {select("Split by", by, "by", EXPLORE_GROUPS.map((g) => [g, GROUP_LABELS[g]]))}
        {select("Per", grain, "grain", [["day", "Day"], ["week", "Week"]])}
        {select("Range", days, "days", [["7", "7 days"], ["30", "30 days"], ["90", "90 days"]])}
      </div>
      <Show when={filters().length > 0}>
        <div class="d-flex flex-wrap gap-2 mb-2">
          <For each={filters()}>
            {(f) => (
              <button type="button" class={`qa-explore-filter-${f} btn btn-sm btn-outline-secondary`} onClick={() => setParams({ [f]: undefined })}>
                {f}: {filterLabel(f)} <i class="bi bi-x-lg" aria-hidden="true" />
                <span class="visually-hidden">Remove filter</span>
              </button>
            )}
          </For>
        </div>
      </Show>
      <Show when={data()}>
        {(d) => (
          <Show when={d().series.length > 0} fallback={<p class="text-body-secondary">No engaged time matches.</p>}>
            <Chart data={d()} stacked={stacked(d())} label={(s) => labelOf(d(), s)} unit={unit()} weekly={grain() === "week"} />
            <p class="small text-body-secondary">
              {stacked(d()) ? "Bars stack to the total." : "One line per series; a learner active in two series counts in both."} Hover or tap a bar or point for its value.
              {grain() === "week" ? " Weeks start on Monday (UTC), and the first and last can be partial." : " Days are UTC."}
              {by() !== "none" && " Tap a row to zoom into it."}
              {by() === "learner" && " Per-learner time is kept 90 days."}
            </p>
            <table class="table table-sm small">
              <thead><tr><th>{by() === "none" ? "" : GROUP_LABELS[by()].replace(/ \(.*/, "")}</th><th class="text-end">{unit()} (whole range)</th></tr></thead>
              <tbody>
                <For each={d().series}>
                  {(s, i) => (
                    <tr class="qa-explore-series" style={{ cursor: by() === "none" ? undefined : "pointer" }} onClick={() => drill(s.key)}>
                      <td>
                        <span class="d-inline-block rounded-1 me-2" style={{ width: "0.8em", height: "0.8em", background: s.key === "other" ? OTHER_COLOR : COLORS[i() % COLORS.length] }} />
                        {by() === "none" ? "All learners" : labelOf(d(), s)}
                      </td>
                      <td class="text-end">{s.total}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
            <details class="small">
              <summary class="text-body-secondary">Numbers per {grain()}</summary>
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead><tr><th>{grain() === "week" ? "Week of" : "Day"}</th><For each={d().series}>{(s) => <th class="text-end">{by() === "none" ? "All" : labelOf(d(), s)}</th>}</For></tr></thead>
                  <tbody>
                    <For each={[...d().buckets.keys()].reverse()}>
                      {(b) => (
                        <tr><td>{d().buckets[b]}</td><For each={d().series}>{(s) => <td class="text-end">{s.values[b]}</td>}</For></tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </details>
          </Show>
        )}
      </Show>
    </section>
  );
}
