import { For, Show } from "solid-js";
import { MASTERY_STATES, QUIZ_RATINGS, type Mastery, type MasteryState, type QuizDeckOut, type QuizRating, type QuizSessionSummary } from "../../../shared/api.ts";
import { locale, t } from "../i18n/index.ts";

const MASTERY_COLOR: Record<MasteryState, string> = { mastered: "success", review: "primary", learning: "warning", new: "secondary-bg" };
const RATING_COLOR: Record<QuizRating, string> = { easy: "success", good: "primary", hard: "warning", again: "danger" };
/** Stacking order, strongest first. */
const MASTERY_ORDER = [...MASTERY_STATES].reverse() as MasteryState[];
const RATING_ORDER = [...QUIZ_RATINGS].reverse() as QuizRating[];
const cssVar = (color: string) => `var(--bs-${color})`;
const bgClass = (color: string) => (color === "secondary-bg" ? "bg-body-secondary" : `bg-${color}`);

/** A local calendar day, `YYYY-MM-DD`. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Weighted: mastered counts fully, review two thirds, learning one third. */
export const progressPct = (m: Mastery, total: number) => Math.round(((m.mastered + m.review * 0.66 + m.learning * 0.33) / total) * 100);
export const deckName = (d: Pick<QuizDeckOut, "level" | "kind" | "num">) => `${d.level} ${t(`quiz.kind.${d.kind}`)} ${d.num}`;
export const duration =(s: number) => t("quiz.minSec", { m: Math.floor(s / 60), s: s % 60 });

export function Donut(props: { mastery: Mastery; total: number; size: number }) {
  const R = 20;
  const slices = () => {
    let angle = -Math.PI / 2;
    return MASTERY_ORDER.filter((m) => props.mastery[m] > 0).map((m) => {
      const sweep = (props.mastery[m] / props.total) * Math.PI * 2;
      const [x1, y1] = [24 + R * Math.cos(angle), 24 + R * Math.sin(angle)];
      angle += sweep;
      const [x2, y2] = [24 + R * Math.cos(angle), 24 + R * Math.sin(angle)];
      return { m, whole: props.mastery[m] === props.total, d: `M24,24 L${x1},${y1} A${R},${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2},${y2} Z` };
    });
  };
  const pct = () => progressPct(props.mastery, props.total);
  return (
    <svg class="qa-quiz-donut flex-shrink-0" width={props.size} height={props.size} viewBox="0 0 48 48" role="img" aria-label={t("quiz.progress", { pct: pct() })}>
      <For each={slices()}>
        {(s) => (s.whole
          ? <circle cx="24" cy="24" r={R} fill={cssVar(MASTERY_COLOR[s.m])} />
          : <path d={s.d} fill={cssVar(MASTERY_COLOR[s.m])} />)}
      </For>
      <circle cx="24" cy="24" r="13" fill="var(--bs-body-bg)" />
      <text x="24" y="25" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="700" fill="var(--bs-body-color)">{pct()}%</text>
    </svg>
  );
}

/** Answers per day; `peak` is shared by every deck's line so they compare. Empty until there is any practice. */
export function Sparkline(props: { counts: number[]; peak: number }) {
  const W = 80, H = 32, PAD = 2;
  const points = () => props.counts
    .map((v, i) => `${PAD + (i / (props.counts.length - 1)) * (W - 2 * PAD)},${PAD + (H - 2 * PAD) * (1 - v / props.peak)}`).join(" ");
  return (
    <svg class="qa-quiz-sparkline flex-shrink-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("quiz.activity")}>
      <Show when={props.peak > 0 && props.counts.some((c) => c > 0)}>
        <polyline points={points()} fill="none" stroke="var(--bs-danger)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      </Show>
    </svg>
  );
}

export function MasteryBar(props: { mastery: Mastery; total: number }) {
  return (
    <div class="qa-quiz-mastery">
      <div class="progress-stacked" style={{ height: "0.75rem" }}>
        <For each={MASTERY_ORDER}>
          {(m) => <div class="progress" style={{ width: `${(props.mastery[m] / props.total) * 100}%` }}><div class={`progress-bar ${bgClass(MASTERY_COLOR[m])}`} /></div>}
        </For>
      </div>
      <div class="d-flex flex-wrap gap-3 small mt-1">
        <For each={MASTERY_ORDER}>
          {(m) => (
            <span class={`qa-quiz-mastery-${m}`}>
              <i class="bi bi-circle-fill me-1" style={{ color: cssVar(MASTERY_COLOR[m]) }} aria-hidden="true" />{t(`quiz.state.${m}`)} {props.mastery[m]}
            </span>
          )}
        </For>
      </div>
    </div>
  );
}

/** Stacked mastery by day, from each day's last session, after a starting point where every question was new. */
export function MasteryChart(props: { sessions: QuizSessionSummary[]; total: number }) {
  const W = 560, H = 160, PAD = { left: 12, right: 12, top: 4, bottom: 20 };
  const points = () => {
    const byDay = new Map<string, Mastery>();
    for (const s of [...props.sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) byDay.set(dayKey(new Date(s.startedAt)), s.mastery);
    const days = [...byDay.keys()];
    if (!days.length) return [];
    const first = new Date(`${days[0]}T12:00:00`);
    first.setDate(first.getDate() - 1);
    return [{ day: dayKey(first), mastery: { new: props.total, learning: 0, review: 0, mastered: 0 } }, ...days.map((day) => ({ day, mastery: byDay.get(day)! }))];
  };
  const x = (i: number) => PAD.left + (i / (points().length - 1)) * (W - PAD.left - PAD.right);
  const y = (n: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - n / props.total);
  /** Each layer's top per point, stacked strongest at the bottom. */
  const tops = () => {
    const sums = points().map(() => 0);
    return MASTERY_ORDER.map((m) => points().map((p, i) => (sums[i] += p.mastery[m])));
  };
  const area = (li: number) => {
    const top = tops()[li];
    const bottom = li === 0 ? points().map(() => 0) : tops()[li - 1];
    return `M${top.map((v, i) => `${x(i)},${y(v)}`).join(" L")} L${bottom.map((v, i) => `${x(i)},${y(v)}`).reverse().join(" L")} Z`;
  };
  const label = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(locale(), { month: "numeric", day: "numeric" });
  const step = () => Math.ceil(points().length / 15);
  return (
    <Show when={points().length >= 2}>
      <svg class="qa-quiz-mastery-chart w-100" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("quiz.masteryChart")}>
        <For each={MASTERY_ORDER}>{(m, li) => <path d={area(li())} fill={cssVar(MASTERY_COLOR[m])} opacity="0.7" />}</For>
        <For each={points()}>
          {(p, i) => (
            <>
              <For each={MASTERY_ORDER}>
                {(m, li) => (
                  <Show when={p.mastery[m] > 0}>
                    <circle cx={x(i())} cy={y(tops()[li()][i()])} r="3" fill={cssVar(MASTERY_COLOR[m])}>
                      <title>{`${label(p.day)}: ${MASTERY_ORDER.filter((k) => p.mastery[k] > 0).map((k) => `${t(`quiz.state.${k}`)} ${p.mastery[k]}`).join(", ")}`}</title>
                    </circle>
                  </Show>
                )}
              </For>
              <Show when={i() % step() === 0 || i() === points().length - 1}>
                <text x={x(i())} y={H - 2} font-size="11" fill="var(--bs-secondary-color)"
                  text-anchor={i() === 0 ? "start" : i() === points().length - 1 ? "end" : "middle"}>{label(p.day)}</text>
              </Show>
            </>
          )}
        </For>
      </svg>
    </Show>
  );
}

export function SessionSummary(props: { s: QuizSessionSummary }) {
  const s = () => props.s;
  return (
    <div class="qa-quiz-summary d-flex flex-column gap-3">
      <div class="card"><div class="card-body">
        <Row label={t("quiz.summary.answered")} value={s().answered} qa="answered" />
        <Row label={t("quiz.summary.time")} value={duration(s().durationS)} qa="time" />
      </div></div>
      <div class="card"><div class="card-body">
        <div class="progress-stacked" style={{ height: "0.75rem" }}>
          <For each={RATING_ORDER}>
            {(r) => <div class="progress" style={{ width: `${(s().ratings[r] / s().answered) * 100}%` }}><div class={`progress-bar bg-${RATING_COLOR[r]}`} /></div>}
          </For>
        </div>
        <div class="d-flex flex-wrap gap-3 small mt-1">
          <For each={RATING_ORDER}>
            {(r) => (
              <span class={`qa-quiz-rated-${r}`}>
                <i class="bi bi-circle-fill me-1" style={{ color: cssVar(RATING_COLOR[r]) }} aria-hidden="true" />{t(`quiz.rating.${r}`)} {s().ratings[r]}
              </span>
            )}
          </For>
        </div>
      </div></div>
      <div class="card"><div class="card-body">
        <Row label={t("quiz.summary.newStarted")} value={s().newStarted} qa="new-started" />
        <Row label={t("quiz.summary.improved")} value={s().improved} qa="improved" />
        <Row label={t("quiz.summary.mastered")} value={s().mastered} qa="mastered" />
      </div></div>
    </div>
  );
}

function Row(props: { label: string; value: string | number; qa: string }) {
  return <div class="d-flex justify-content-between"><span class="text-body-secondary">{props.label}</span><span class={`qa-quiz-summary-${props.qa}`}>{props.value}</span></div>;
}

export const ratingClass = (r: QuizRating) => `text-${RATING_COLOR[r]}`;
