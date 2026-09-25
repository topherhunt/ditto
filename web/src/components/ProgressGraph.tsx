import { For } from "solid-js";
import { t } from "../i18n/index.ts";
import { lessonCount, shortDate } from "../social.ts";

const W = 600;
const H = 160;
const PAD = { left: 28, right: 8, top: 10, bottom: 22 };
const DAY = 86_400_000;

/** Cumulative lessons completed over time: a step up per lesson, flat while idle, with a marker where each level was finished. */
export function ProgressGraph(props: { completions: string[]; levelsDone: { level: string; at: string }[] }) {
  const times = () => props.completions.map((c) => new Date(c).getTime());
  const now = Date.now();
  const start = () => times()[0] - Math.max(DAY, (now - times()[0]) * 0.03);
  const x = (t: number) => PAD.left + ((t - start()) / (now - start())) * (W - PAD.left - PAD.right);
  const y = (n: number) => H - PAD.bottom - (n / times().length) * (H - PAD.top - PAD.bottom);
  const path = () => `M${x(start())},${y(0)} ${times().map((t, i) => `H${x(t)} V${y(i + 1)}`).join(" ")} H${x(now)}`;
  return (
    <svg class="qa-graph w-100" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("graph.label", { lessons: lessonCount(times().length) })}>
      <line x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} stroke="var(--bs-border-color)" />
      <text x={PAD.left - 6} y={y(times().length) + 4} text-anchor="end" font-size="11" fill="var(--bs-secondary-color)">{times().length}</text>
      <text x={PAD.left - 6} y={y(0) + 4} text-anchor="end" font-size="11" fill="var(--bs-secondary-color)">0</text>
      <For each={props.levelsDone}>
        {(l) => (
          <g class="qa-graph-level">
            <line x1={x(new Date(l.at).getTime())} y1={PAD.top} x2={x(new Date(l.at).getTime())} y2={y(0)} stroke="var(--bs-success)" stroke-dasharray="4 3" />
            <text x={x(new Date(l.at).getTime()) - 4} y={PAD.top + 10} text-anchor="end" font-size="11" fill="var(--bs-success)">{l.level} ✓</text>
          </g>
        )}
      </For>
      <path d={path()} fill="none" stroke="var(--bs-primary)" stroke-width="2.5" stroke-linejoin="round" />
      <text x={PAD.left} y={H - 4} font-size="11" fill="var(--bs-secondary-color)">{shortDate(new Date(start()).toISOString())}</text>
      <text x={W - PAD.right} y={H - 4} text-anchor="end" font-size="11" fill="var(--bs-secondary-color)">{t("graph.today")}</text>
    </svg>
  );
}
