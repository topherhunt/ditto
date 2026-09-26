import { createResource, createSignal, For, Show } from "solid-js";
import { REPORT_DECISIONS, REPORT_STATUSES, type AdminReport, type ReportDecision, type ReportStatus } from "../../../shared/api.ts";
import { api } from "../api.ts";

// Admin-only, so English-only: these strings are not in the i18n dictionaries.
const DECISION_LABELS: Record<ReportDecision, string> = {
  dismiss: "Dismiss", fix_audio: "Fix audio", fix_text: "Fix text", fix_translation: "Fix translation", accept_answer: "Accept answer", discuss: "Discuss",
};
const STATUS_LABELS: Record<ReportStatus, string> = { new: "New", triaged: "Triaged", closed: "Closed" };

/** One clip at a time, so comparing reported and current audio never overlaps. */
const player = new Audio();

function Clip(props: { url: string; label: string; qa: string }) {
  const [error, setError] = createSignal<string | null>(null);
  const play = () => {
    setError(null);
    player.src = props.url;
    player.play().catch((e: Error) => setError(`${props.url}: ${e.message}`));
  };
  return (
    <span class="d-inline-flex align-items-center gap-2">
      <button type="button" class={`${props.qa} btn btn-sm btn-outline-primary`} onClick={play}>▶ {props.label}</button>
      <Show when={error()}>{(m) => <span class="qa-clip-missing small text-danger">Can't play {m()}</span>}</Show>
    </span>
  );
}

function Report(props: { report: AdminReport; onChange: () => void }) {
  const r = () => props.report;
  const [note, setNote] = createSignal(r().adminNote ?? "");
  const [reviewNote, setReviewNote] = createSignal(r().reviewNote ?? "");
  const [error, setError] = createSignal<string | null>(null);
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      props.onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const currentClip = () => r().current?.audioUrl;
  return (
    <li class="qa-admin-report list-group-item d-flex flex-column gap-2" data-silent>
      <div class="d-flex flex-wrap align-items-center gap-2 small">
        <span class="badge text-bg-secondary">{r().kind}</span>
        <span class="text-body-secondary">{r().reporter.username ?? r().reporter.email} · {r().createdAt.slice(0, 16).replace("T", " ")} · {r().voice}</span>
      </div>
      {/* The reporter's own words are what triage decides on, so they lead. */}
      <div class="qa-reporter-says border-start border-4 border-warning bg-warning-subtle rounded-end px-3 py-2">
        <Show when={r().answer}><div>Answer they want accepted: <q class="qa-admin-answer fw-semibold">{r().answer}</q></div></Show>
        <Show when={r().note} fallback={<Show when={!r().answer}><div class="text-body-secondary fst-italic">No comment</div></Show>}>
          <div class="qa-admin-note fs-6 fw-semibold" style={{ "white-space": "pre-wrap" }}>{r().note}</div>
        </Show>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <Clip url={r().audioUrl} label="Reported clip" qa="qa-play-reported" />
        <Show when={currentClip() && currentClip() !== r().audioUrl}>
          <Clip url={currentClip()!} label="Current clip" qa="qa-play-current" />
        </Show>
      </div>

      <Show when={r().status !== "closed"}>
        <textarea class="qa-triage-note form-control form-control-sm" rows="2" placeholder="Your note (optional)"
          value={note()} onInput={(e) => setNote(e.currentTarget.value)} />
        <div class="d-flex flex-wrap gap-1">
          <For each={REPORT_DECISIONS}>
            {(d) => (
              <button type="button" class={`qa-decide-${d} btn btn-sm`}
                classList={{ "btn-primary": r().decision === d, "btn-outline-secondary": r().decision !== d }}
                onClick={() => act(() => api.put(`/api/admin/reports/${r().id}/triage`, { decision: d, note: note() }))}>
                {DECISION_LABELS[d]}
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={r().status === "triaged"}>
        <div class="qa-review border-top pt-2 d-flex flex-column gap-2">
          <div class="small text-body-secondary">
            Review of the fix{r().review ? `: ${r().review}` : ""}
          </div>
          <textarea class="qa-review-note form-control form-control-sm" rows="2" placeholder="What's still wrong (required to reject)"
            value={reviewNote()} onInput={(e) => setReviewNote(e.currentTarget.value)} />
          <div class="d-flex gap-1">
            <For each={["approved", "rejected"] as const}>
              {(v) => (
                <button type="button" class={`qa-review-${v} btn btn-sm`}
                  classList={{ "btn-success": r().review === v && v === "approved", "btn-danger": r().review === v && v === "rejected", "btn-outline-secondary": r().review !== v }}
                  disabled={v === "rejected" && !reviewNote().trim()}
                  onClick={() => act(() => api.put(`/api/admin/reports/${r().id}/review`, { review: v, note: reviewNote() }))}>
                  {v === "approved" ? "Approve" : "Reject"}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={r().status === "closed"}>
        <div class="d-flex align-items-center gap-2 small">
          <span class="qa-resolution">{DECISION_LABELS[r().decision!]}: {r().resolution}{r().adminNote ? ` (${r().adminNote})` : ""}</span>
          <button type="button" class="qa-reopen btn btn-sm btn-outline-secondary ms-auto" onClick={() => act(() => api.post(`/api/admin/reports/${r().id}/reopen`))}>Reopen</button>
        </div>
      </Show>
      <Show when={error()}>{(m) => <div class="alert alert-danger py-1 mb-0 small">{m()}</div>}</Show>
    </li>
  );
}

/** Reports on one unit, oldest first, so several people flagging the same item read as one case. */
function byUnit(reports: AdminReport[]): AdminReport[][] {
  const groups = new Map<string, AdminReport[]>();
  for (const r of reports) groups.set(r.unitId, [...(groups.get(r.unitId) ?? []), r]);
  return [...groups.values()];
}

function download(reports: AdminReport[]) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `reports-triaged-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const [status, setStatus] = createSignal<ReportStatus>("new");
  const [reports, { refetch }] = createResource(status, (s) => api.get<AdminReport[]>(`/api/admin/reports?status=${s}`));
  return (
    <div class="d-flex flex-column gap-3">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <h1 class="h4 mb-0 me-auto">Problem reports</h1>
        <div class="btn-group btn-group-sm" role="group">
          <For each={REPORT_STATUSES}>
            {(s) => (
              <button type="button" class={`qa-reports-${s} btn btn-outline-primary`} classList={{ active: status() === s }} onClick={() => setStatus(s)}>
                {STATUS_LABELS[s]}
              </button>
            )}
          </For>
        </div>
        <Show when={status() === "triaged" && reports()?.length}>
          <button type="button" class="qa-reports-download btn btn-sm btn-outline-secondary" onClick={() => download(reports()!)}>Download JSON</button>
        </Show>
      </div>
      <Show when={reports()}>
        {(list) => (
          <For each={byUnit(list())} fallback={<p class="qa-reports-empty text-body-secondary">No {status()} reports.</p>}>
            {(group) => {
              const first = group[0];
              const cur = first.current;
              const changed = !cur || cur.rev !== first.unitRev || cur.text !== first.text;
              return (
                <div class="qa-report-group card">
                  <div class="card-header d-flex flex-column gap-1">
                    <div class="d-flex flex-wrap align-items-baseline gap-2">
                      <span class="badge text-bg-light text-uppercase">{first.language}</span>
                      <span class="qa-report-text fw-semibold">{first.text}</span>
                      <span class="small text-body-secondary ms-auto">{first.unitId} rev {first.unitRev}</span>
                    </div>
                    <Show when={cur?.translation}><div class="small text-body-secondary fst-italic">{cur!.translation}</div></Show>
                    <Show when={changed}>
                      <div class="qa-report-changed small text-warning-emphasis">
                        {cur ? `Changed since reported: now rev ${cur.rev}, “${cur.text}”` : "This unit no longer exists"}
                      </div>
                    </Show>
                  </div>
                  <ul class="list-group list-group-flush">
                    <For each={group}>{(r) => <Report report={r} onChange={refetch} />}</For>
                  </ul>
                </div>
              );
            }}
          </For>
        )}
      </Show>
    </div>
  );
}
