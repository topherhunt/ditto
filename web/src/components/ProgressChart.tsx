import { createSignal, For, Show } from "solid-js";
import { t } from "../i18n/index.ts";
import { shortDate } from "../social.ts";

const H = 140;
const PAD = { left: 34, right: 8, top: 10, bottom: 22 };

/** A line of percentages (0 to 100), one per day ending today, that never falls; `start` is the first day's date, `dots` flags days with activity and `goal` names the level at 100%. The drawing is as wide as its box so the 11px labels keep their size. */
export function ProgressChart(props: { pcts: number[]; dots: boolean[]; start: Date; goal: string; label: string }) {
  const [width, setWidth] = createSignal(360);
  const W = width;
  const x = (i: number) => PAD.left + (i / (props.pcts.length - 1)) * (W() - PAD.left - PAD.right);
  const y = (pct: number) => H - PAD.bottom - (pct / 100) * (H - PAD.top - PAD.bottom);
  const line = () => props.pcts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p)}`).join(" ");
  const label = { "font-size": "11", fill: "var(--bs-secondary-color)" };
  return (
    <svg class="qa-dash-chart w-100" style={{ height: `${H}px` }} role="img" aria-label={props.label}
      ref={(el) => { new ResizeObserver(() => setWidth(el.clientWidth || 360)).observe(el); }}>
      <line x1={PAD.left} y1={y(0)} x2={W() - PAD.right} y2={y(0)} stroke="var(--bs-border-color)" />
      <line x1={PAD.left} y1={y(100)} x2={W() - PAD.right} y2={y(100)} stroke="var(--bs-border-color)" stroke-dasharray="4 3" />
      <text x={PAD.left - 6} y={y(100) + 4} text-anchor="end" {...label}>{props.goal}</text>
      <text x={PAD.left - 6} y={y(0) + 4} text-anchor="end" {...label}>0</text>
      <path d={`${line()} L${x(props.pcts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--bs-success)" fill-opacity=".15" />
      <path d={line()} fill="none" stroke="var(--bs-success)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <For each={props.pcts}>
        {(p, i) => <Show when={props.dots[i()] || i() === props.pcts.length - 1}><circle cx={x(i())} cy={y(p)} r="4" fill="var(--bs-success)" /></Show>}
      </For>
      <text x={PAD.left} y={H - 4} {...label}>{shortDate(props.start.toISOString())}</text>
      <text x={W() - PAD.right} y={H - 4} text-anchor="end" {...label}>{t("graph.today")}</text>
    </svg>
  );
}
