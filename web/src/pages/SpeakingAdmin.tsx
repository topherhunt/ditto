import { createResource, For, Show } from "solid-js";
import type { AdminSpeakReport, AdminSpendOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { usd } from "../spend.ts";

// Admin-only, so English-only: these strings are not in the i18n dictionaries.

function SpeakReport(props: { report: AdminSpeakReport }) {
  const r = () => props.report;
  return (
    <li class="qa-admin-speak-report list-group-item d-flex flex-column gap-1">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="badge text-bg-secondary text-uppercase">{r().language}</span>
        <span class="fw-semibold">{r().reporter.username ?? r().reporter.email}</span>
        <span class="small text-body-secondary me-auto">{new Date(r().reportedAt).toLocaleString()}</span>
        <span class={`badge ${r().passed ? "text-bg-success" : "text-bg-danger"}`}>{r().passed ? "passed" : "failed"}</span>
      </div>
      <Show when={r().note}><div class="qa-admin-speak-note">"{r().note}"</div></Show>
      <div class="small"><span class="text-body-secondary">Partner:</span> {r().partnerLine}</div>
      <div class="small"><span class="text-body-secondary">Target:</span> {r().target}</div>
      <div class="small"><span class="text-body-secondary">Transcript:</span> {r().transcript}</div>
      <div class="small"><span class="text-body-secondary">Coach:</span> {r().verdict.feedback}</div>
    </li>
  );
}

export function SpeakingAdmin() {
  const [spend] = createResource(() => api.get<AdminSpendOut>("/api/admin/spend?days=30"));
  const [reports] = createResource(() => api.get<AdminSpeakReport[]>("/api/admin/speak-reports"));
  return (
    <div class="d-flex flex-column gap-4">
      <h1 class="h3 mb-0">Speaking</h1>
      <section>
        <h2 class="h5">AI spend, last 30 days</h2>
        <Show when={spend()}>
          {(s) => (
            <Show when={s().users.length} fallback={<p class="text-body-secondary">No spend.</p>}>
              <table class="table table-sm">
                <thead><tr><th>User</th><th class="text-end">Total</th><th>By day (UTC)</th></tr></thead>
                <tbody>
                  <For each={s().users}>
                    {(u) => (
                      <tr class="qa-admin-spend-user">
                        <td>{u.username ?? u.email}</td>
                        <td class="text-end">{usd(u.total)}</td>
                        <td class="small">{s().days.filter((d) => d in u.byDay).map((d) => `${d}: ${usd(u.byDay[d])}`).join(", ")}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          )}
        </Show>
      </section>
      <section>
        <h2 class="h5">Reported judgments</h2>
        <Show when={reports()}>
          {(rs) => (
            <Show when={rs().length} fallback={<p class="text-body-secondary">No reports.</p>}>
              <ul class="list-group"><For each={rs()}>{(r) => <SpeakReport report={r} />}</For></ul>
            </Show>
          )}
        </Show>
      </section>
    </div>
  );
}
