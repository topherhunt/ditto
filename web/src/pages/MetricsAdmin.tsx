import { createResource, For, Show } from "solid-js";
import { METRICS_KEEP_DAYS, type AdminMetricsOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { usd } from "../spend.ts";

// Admin-only, so English-only: these strings are not in the i18n dictionaries. What is collected and why: docs/metrics.md.

const DAYS = 30;
const rps = (requests: number) => (requests / 3600).toFixed(3);

export function MetricsAdmin() {
  const [m] = createResource(() => api.get<AdminMetricsOut>(`/api/admin/metrics?days=${DAYS}`));
  return (
    <div class="d-flex flex-column gap-4">
      <div>
        <h1 class="h4 mb-1">Metrics</h1>
        <p class="small text-body-secondary mb-0">
          Last {DAYS} UTC days. Engaged time counts a visible page used within the last minute; admin pages aren't counted.
          Per-learner rows become anonymous totals after {METRICS_KEEP_DAYS} days.
        </p>
      </div>
      <Show when={m()}>
        {(m) => (
          <>
            <section>
              <h2 class="h6 text-body-secondary text-uppercase">Days</h2>
              <div class="table-responsive">
                <table class="table table-sm small">
                  <thead><tr>
                    <th>Day</th><th class="text-end">Active learners</th><th class="text-end">Peak concurrent</th><th class="text-end">Engaged min</th>
                    <th class="text-end">AI spend</th><th class="text-end">Requests</th><th class="text-end">5xx</th>
                  </tr></thead>
                  <tbody>
                    <For each={m().days} fallback={<tr><td colspan={7} class="text-body-secondary">No data yet.</td></tr>}>
                      {(d) => (
                        <tr class="qa-metrics-day">
                          <td>{d.day}</td><td class="text-end">{d.activeUsers}</td><td class="text-end">{d.peakConcurrent}</td>
                          <td class="text-end">{d.engagedMinutes}</td><td class="text-end">{usd(d.spendUsd)}</td>
                          <td class="text-end">{d.requests}</td><td class="text-end" classList={{ "text-danger": d.errors5xx > 0 }}>{d.errors5xx}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h2 class="h6 text-body-secondary text-uppercase">Engaged time by activity</h2>
              <table class="table table-sm small">
                <thead><tr><th>Activity</th><th>Language</th><th class="text-end">Minutes</th><th class="text-end">Learner-days</th><th class="text-end">Min per learner-day</th></tr></thead>
                <tbody>
                  <For each={m().activities} fallback={<tr><td colspan={5} class="text-body-secondary">No engaged time yet.</td></tr>}>
                    {(a) => (
                      <tr class="qa-metrics-activity">
                        <td>{a.activity}</td><td>{a.language ?? "--"}</td><td class="text-end">{a.minutes}</td>
                        <td class="text-end">{a.learnerDays}</td><td class="text-end">{(a.minutes / a.learnerDays).toFixed(1)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </section>
            <section>
              <h2 class="h6 text-body-secondary text-uppercase">Last 48 hours</h2>
              <table class="table table-sm small">
                <thead><tr><th>Hour (UTC)</th><th class="text-end">Requests</th><th class="text-end">Avg req/s</th><th class="text-end">5xx</th><th class="text-end">Peak concurrent</th></tr></thead>
                <tbody>
                  <For each={m().hours}>
                    {(h) => (
                      <tr class="qa-metrics-hour">
                        <td>{h.hour.replace("T", " ")}:00</td><td class="text-end">{h.requests}</td><td class="text-end">{rps(h.requests)}</td>
                        <td class="text-end" classList={{ "text-danger": h.errors5xx > 0 }}>{h.errors5xx}</td><td class="text-end">{h.peakConcurrent}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </section>
            <section>
              <h2 class="h6 text-body-secondary text-uppercase">Routes</h2>
              <div class="table-responsive">
                <table class="table table-sm small">
                  <thead><tr><th>Route</th><th class="text-end">Requests</th><th class="text-end">4xx</th><th class="text-end">5xx</th><th class="text-end">p95</th></tr></thead>
                  <tbody>
                    <For each={m().routes}>
                      {(r) => (
                        <tr class="qa-metrics-route">
                          <td class="font-monospace">{r.route}</td><td class="text-end">{r.requests}</td><td class="text-end">{r.errors4xx}</td>
                          <td class="text-end" classList={{ "text-danger": r.errors5xx > 0 }}>{r.errors5xx}</td><td class="text-end">{r.p95}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </Show>
    </div>
  );
}
