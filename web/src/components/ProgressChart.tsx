import { t } from "../i18n/index.ts";
import { shortDate } from "../social.ts";

const W = 360;
const H = 140;
const PAD = { left: 30, right: 8, top: 10, bottom: 22 };

/** A line of percentages (0 to 100), one per day ending today, that never falls; `start` is the first day's date. */
export function ProgressChart(props: { pcts: number[]; start: Date; label: string }) {
  const x = (i: number) => PAD.left + (i / (props.pcts.length - 1)) * (W - PAD.left - PAD.right);
  const y = (pct: number) => H - PAD.bottom - (pct / 100) * (H - PAD.top - PAD.bottom);
  const line = () => props.pcts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p)}`).join(" ");
  const label = { "font-size": "11", fill: "var(--bs-secondary-color)" };
  return (
    <svg class="qa-dash-chart w-100" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={props.label}>
      <line x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} stroke="var(--bs-border-color)" />
      <line x1={PAD.left} y1={y(100)} x2={W - PAD.right} y2={y(100)} stroke="var(--bs-border-color)" stroke-dasharray="4 3" />
      <text x={PAD.left - 6} y={y(100) + 4} text-anchor="end" {...label}>100%</text>
      <text x={PAD.left - 6} y={y(0) + 4} text-anchor="end" {...label}>0</text>
      <path d={`${line()} L${x(props.pcts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--bs-success)" fill-opacity=".15" />
      <path d={line()} fill="none" stroke="var(--bs-success)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx={x(props.pcts.length - 1)} cy={y(props.pcts[props.pcts.length - 1])} r="4" fill="var(--bs-success)" />
      <text x={PAD.left} y={H - 4} {...label}>{shortDate(props.start.toISOString())}</text>
      <text x={W - PAD.right} y={H - 4} text-anchor="end" {...label}>{t("graph.today")}</text>
    </svg>
  );
}
