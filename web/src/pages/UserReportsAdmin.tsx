import { A } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import { USER_REPORT_ACTIONS, type AdminUserReport, type Person, type UserReportReason, type UserReportResolution } from "../../../shared/api.ts";
import { api } from "../api.ts";

// Admin-only, so English-only: these strings are not in the i18n dictionaries.

const REASONS: Record<UserReportReason, string> = {
  username: "Username", board_post: "Board post", requests: "Unwanted friend requests", other: "Other",
};
const RESOLUTIONS: Record<UserReportResolution, string> = {
  took_down_post: "Took down the board post", cleared_username: "Cleared the username", dismissed: "Dismissed",
};
const Who = (props: { person: Person }) =>
  <A href={`/admin/users/${props.person.id}`}>{props.person.username ?? <em>no username</em>}</A>;

/** Learners reporting other learners, open ones first. The reporter has already blocked the reported account. */
export function UserReportsAdmin() {
  const [reports, { refetch }] = createResource(() => api.get<AdminUserReport[]>("/api/admin/user-reports"));
  async function act(r: AdminUserReport, action: keyof typeof USER_REPORT_ACTIONS) {
    await api.post(`/api/admin/user-reports/${r.id}/${action}`);
    await refetch();
  }

  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h3 mb-0">People reports</h1>
      <p class="text-body-secondary mb-0">
        Taking down a post or clearing a username also resolves the other open reports about it. A cleared username makes them pick a new one.
      </p>
      <Show when={reports()}>
        {(list) => (
          <Show when={list().length > 0} fallback={<p class="qa-user-reports-empty mb-0">No reports.</p>}>
            <ul class="list-group">
              <For each={list()}>
                {(r) => (
                  <li class="qa-user-report list-group-item d-flex flex-column gap-2" classList={{ "text-body-secondary": r.resolvedAt !== null }}>
                    <div class="d-flex flex-wrap gap-2 align-items-baseline">
                      <span class="badge text-bg-danger">{REASONS[r.reason]}</span>
                      <span><Who person={r.reported} /> reported by <Who person={r.reporter} /></span>
                      <span class="small text-body-secondary ms-auto">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="small">
                      Username then: <strong>{r.username ?? "none"}</strong>
                      <Show when={r.blurb !== null}>{" · "}Board post then: <q>{r.blurb}</q></Show>
                      <Show when={r.onBoard && r.blurbNow !== r.blurb}>{" · "}Board post now: <q>{r.blurbNow ?? ""}</q></Show>
                    </div>
                    <Show when={r.note}><p class="mb-0">{r.note}</p></Show>
                    <Show when={r.resolution} fallback={
                      <div class="d-flex flex-wrap gap-2">
                        <Show when={r.onBoard}>
                          <button type="button" class="qa-take-down btn btn-sm btn-outline-danger" onClick={() => act(r, "take-down")}>Take down board post</button>
                        </Show>
                        <Show when={r.reported.username !== null}>
                          <button type="button" class="qa-clear-username btn btn-sm btn-outline-danger" onClick={() => act(r, "clear-username")}>Clear username</button>
                        </Show>
                        <button type="button" class="qa-dismiss btn btn-sm btn-outline-secondary" onClick={() => act(r, "dismiss")}>Dismiss</button>
                      </div>
                    }>
                      {(res) => <div class="qa-user-report-resolution small">{RESOLUTIONS[res()]} {new Date(r.resolvedAt!).toLocaleString()}</div>}
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        )}
      </Show>
    </div>
  );
}
