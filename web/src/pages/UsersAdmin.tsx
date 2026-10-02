import { A, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, createResource, For, Show, type JSX } from "solid-js";
import { ADMIN_RECENT_DAYS, type AdminUserDetail, type AdminUserRow, type Person } from "../../../shared/api.ts";
import { LANGUAGES } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { usd } from "../spend.ts";
import { AdminCrumb } from "../components/AdminCrumb.tsx";

// Admin-only, so English-only: these strings are not in the i18n dictionaries.

const DAY = 86_400_000;

function ago(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))}m ago`;
  if (ms < DAY) return `${Math.round(ms / 3_600_000)}h ago`;
  if (ms < 60 * DAY) return `${Math.round(ms / DAY)}d ago`;
  return new Date(iso).toLocaleDateString();
}
const When = (props: { at: string | null }) => <span title={props.at ? new Date(props.at).toLocaleString() : undefined}>{ago(props.at)}</span>;
const within = (iso: string | null, days: number) => iso !== null && Date.now() - new Date(iso).getTime() < days * DAY;

type Column = { key: string; label: string; value: (u: AdminUserRow) => string | number; cell: (u: AdminUserRow) => JSX.Element; numeric?: boolean };
const COLUMNS: Column[] = [
  { key: "created", label: "Registered", value: (u) => u.createdAt, cell: (u) => <When at={u.createdAt} /> },
  { key: "seen", label: "Last seen", value: (u) => u.lastSeenAt ?? "", cell: (u) => <When at={u.lastSeenAt} /> },
  { key: "practiced", label: "Last practiced", value: (u) => u.lastPracticedAt ?? "", cell: (u) => <When at={u.lastPracticedAt} /> },
  { key: "items", label: "Items", value: (u) => u.items, cell: (u) => u.items, numeric: true },
  { key: "active", label: `Active days (${ADMIN_RECENT_DAYS}d)`, value: (u) => u.activeDays, cell: (u) => u.activeDays, numeric: true },
  { key: "lessons", label: "Lessons", value: (u) => u.lessonsCompleted, cell: (u) => u.lessonsCompleted, numeric: true },
  { key: "friends", label: "Friends", value: (u) => u.friends, cell: (u) => u.friends, numeric: true },
  { key: "pending", label: "Pending sent", value: (u) => u.pendingSent, cell: (u) => u.pendingSent, numeric: true },
  { key: "blocked", label: "Blocked by", value: (u) => u.blockedBy, cell: (u) => u.blockedBy, numeric: true },
  { key: "reports", label: "Reports", value: (u) => u.reports, cell: (u) => u.reports, numeric: true },
  { key: "spend", label: `Spend (${ADMIN_RECENT_DAYS}d)`, value: (u) => u.spendRecent, cell: (u) => usd(u.spendRecent), numeric: true },
];

const ACTIVITY_FILTERS: Record<string, { label: string; test: (u: AdminUserRow) => boolean }> = {
  all: { label: "Any activity", test: () => true },
  "seen-1": { label: "Seen in the last day", test: (u) => within(u.lastSeenAt, 1) },
  "seen-7": { label: "Seen in the last 7 days", test: (u) => within(u.lastSeenAt, 7) },
  "seen-30": { label: "Seen in the last 30 days", test: (u) => within(u.lastSeenAt, 30) },
  lapsed: { label: "Not seen in 30 days", test: (u) => !within(u.lastSeenAt, 30) },
  "new-7": { label: "Registered in the last 7 days", test: (u) => within(u.createdAt, 7) },
  never: { label: "Never practiced", test: (u) => u.items === 0 },
};
const FLAG_FILTERS: Record<string, { label: string; test: (u: AdminUserRow) => boolean }> = {
  all: { label: "No flag filter", test: () => true },
  blocked: { label: "Blocked by someone", test: (u) => u.blockedBy > 0 },
  pending: { label: "Has pending requests", test: (u) => u.pendingSent > 0 },
  reports: { label: "Filed reports", test: (u) => u.reports > 0 },
  private: { label: "Private profile", test: (u) => !u.profilePublic },
  unnamed: { label: "No username", test: (u) => u.username === null },
};

/** Every account, filtered and sorted in the browser. Filters live in the query string so Back from a user keeps them. */
export function UsersAdmin() {
  const [users] = createResource(() => api.get<AdminUserRow[]>("/api/admin/users"));
  const [params, setParams] = useSearchParams<{ q?: string; activity?: string; flag?: string; lang?: string; sort?: string; dir?: string }>();
  const sortKey = () => params.sort ?? "created";
  const desc = () => params.dir !== "asc";

  const shown = createMemo(() => {
    const q = (params.q ?? "").trim().toLowerCase();
    const activity = ACTIVITY_FILTERS[params.activity ?? "all"] ?? ACTIVITY_FILTERS.all;
    const flag = FLAG_FILTERS[params.flag ?? "all"] ?? FLAG_FILTERS.all;
    const col = COLUMNS.find((c) => c.key === sortKey()) ?? COLUMNS[0];
    return (users() ?? [])
      .filter((u) => !q || [u.username ?? "", u.email, u.id].some((s) => s.toLowerCase().includes(q)))
      .filter((u) => !params.lang || u.learning.includes(params.lang as AdminUserRow["learning"][number]))
      .filter(activity.test)
      .filter(flag.test)
      .sort((a, b) => {
        const x = col.value(a), y = col.value(b);
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return desc() ? -cmp : cmp;
      });
  });
  const sortBy = (key: string) => setParams({ sort: key, dir: sortKey() === key && desc() ? "asc" : undefined });

  return (
    <div class="d-flex flex-column gap-3">
      <h1 class="h4 mb-0"><AdminCrumb>Users</AdminCrumb></h1>
      <Show when={users()}>
        {(all) => (
          <p class="qa-admin-users-summary mb-0 text-body-secondary">
            {all().length} accounts · {all().filter((u) => within(u.lastSeenAt, 7)).length} seen in the last 7 days
            · {all().filter((u) => within(u.createdAt, 7)).length} registered in the last 7 days
          </p>
        )}
      </Show>
      <div class="row g-2">
        <div class="col-12 col-md-4">
          <input type="search" class="qa-admin-users-search form-control form-control-sm" placeholder="Search username, email or id"
            value={params.q ?? ""} onInput={(e) => setParams({ q: e.currentTarget.value || undefined }, { replace: true })} />
        </div>
        <div class="col-6 col-md-3">
          <select class="qa-admin-users-activity form-select form-select-sm" value={params.activity ?? "all"}
            onChange={(e) => setParams({ activity: e.currentTarget.value === "all" ? undefined : e.currentTarget.value })}>
            <For each={Object.entries(ACTIVITY_FILTERS)}>{([k, f]) => <option value={k}>{f.label}</option>}</For>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <select class="qa-admin-users-flag form-select form-select-sm" value={params.flag ?? "all"}
            onChange={(e) => setParams({ flag: e.currentTarget.value === "all" ? undefined : e.currentTarget.value })}>
            <For each={Object.entries(FLAG_FILTERS)}>{([k, f]) => <option value={k}>{f.label}</option>}</For>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <select class="qa-admin-users-lang form-select form-select-sm" value={params.lang ?? ""}
            onChange={(e) => setParams({ lang: e.currentTarget.value || undefined })}>
            <option value="">Any language</option>
            <For each={LANGUAGES}>{(l) => <option value={l}>Learning {l}</option>}</For>
          </select>
        </div>
      </div>
      <Show when={users()}>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle small">
            <thead>
              <tr>
                <th>User</th>
                <th>Learning</th>
                <For each={COLUMNS}>
                  {(c) => (
                    <th class={`qa-admin-users-sort-${c.key} text-nowrap user-select-none`} classList={{ "text-end": c.numeric }} role="button" onClick={() => sortBy(c.key)}>
                      {c.label}{sortKey() === c.key ? (desc() ? " ▼" : " ▲") : ""}
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={shown()} fallback={<tr><td colspan={COLUMNS.length + 2} class="text-body-secondary">No matching users.</td></tr>}>
                {(u) => (
                  <tr class="qa-admin-user">
                    <td>
                      <A href={`/admin/users/${u.id}`} class="qa-admin-user-link fw-semibold">{u.username ?? "(no username)"}</A>
                      <Show when={!u.profilePublic}><span class="badge text-bg-secondary ms-1">private</span></Show>
                      <div class="qa-admin-user-email text-body-secondary">{u.email}</div>
                    </td>
                    <td class="text-uppercase">{u.learning.join(" ")}</td>
                    <For each={COLUMNS}>{(c) => <td class="text-nowrap" classList={{ "text-end": c.numeric }}>{c.cell(u)}</td>}</For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
}

const PeopleList = (props: { people: Person[] }) => (
  <Show when={props.people.length} fallback={<span class="text-body-secondary">none</span>}>
    <For each={props.people}>
      {(p, i) => <>{i() > 0 && ", "}<A href={`/admin/users/${p.id}`}>{p.username ?? p.id}</A></>}
    </For>
  </Show>
);

/** One account's usage, social graph and reports, with a link to the profile other learners see. */
export function UserAdmin() {
  const params = useParams();
  const [detail] = createResource(() => params.id, (id) => api.get<AdminUserDetail>(`/api/admin/users/${id}`));
  return (
    <Show when={detail()}>
      {(d) => {
        const u = () => d().user;
        return (
          <div class="d-flex flex-column gap-4">
            <div>
              <div class="small"><AdminCrumb><A href="/admin/users">Users</A></AdminCrumb></div>
              <div class="d-flex flex-wrap align-items-baseline gap-2 mt-1">
                <h1 class="qa-admin-user-name h4 mb-0">{u().username ?? "(no username)"}</h1>
                <span class="qa-admin-user-email text-body-secondary">{u().email}</span>
                <A href={`/people/${u().id}`} class="qa-admin-user-profile btn btn-sm btn-outline-primary ms-auto">View public profile</A>
              </div>
            </div>
            <dl class="row mb-0 small">
              <dt class="col-5 col-md-2">Public id</dt><dd class="col-7 col-md-4 font-monospace">{u().id}</dd>
              <dt class="col-5 col-md-2">Registered</dt><dd class="col-7 col-md-4">{new Date(u().createdAt).toLocaleString()}</dd>
              <dt class="col-5 col-md-2">Last seen</dt><dd class="col-7 col-md-4"><When at={u().lastSeenAt} /></dd>
              <dt class="col-5 col-md-2">Last practiced</dt><dd class="col-7 col-md-4"><When at={u().lastPracticedAt} /></dd>
              <dt class="col-5 col-md-2">Signed-in browsers</dt><dd class="col-7 col-md-4">{d().activeSessions}</dd>
              <dt class="col-5 col-md-2">UI language</dt><dd class="col-7 col-md-4">{u().locale}</dd>
              <dt class="col-5 col-md-2">Learning</dt><dd class="col-7 col-md-4 text-uppercase">{u().learning.join(" ") || "none"}</dd>
              <dt class="col-5 col-md-2">Profile</dt><dd class="col-7 col-md-4">{u().profilePublic ? "public" : "private"}</dd>
              <dt class="col-5 col-md-2">AI spend</dt>
              <dd class="col-7 col-md-4">{usd(u().spendTotal)} total, {usd(u().spendRecent)} in {ADMIN_RECENT_DAYS}d
                <Show when={d().spendByPurpose.length}> ({d().spendByPurpose.map((s) => `${s.purpose} ${usd(s.total)}`).join(", ")})</Show>
              </dd>
            </dl>

            <section>
              <h2 class="h6">Practice by language</h2>
              <Show when={d().languages.length} fallback={<p class="text-body-secondary small">No practice yet.</p>}>
                <table class="table table-sm small">
                  <thead><tr><th>Language</th><th class="text-end">Dictation</th><th class="text-end">Quiz</th><th class="text-end">Spoken</th><th class="text-end">Lessons</th><th class="text-end">Conversations</th><th>Levels passed</th><th>Quiz levels</th></tr></thead>
                  <tbody>
                    <For each={d().languages}>
                      {(l) => (
                        <tr class="qa-admin-user-language">
                          <td class="text-uppercase">{l.language}</td>
                          <td class="text-end">{l.type}</td><td class="text-end">{l.quiz}</td><td class="text-end">{l.talk}</td>
                          <td class="text-end">{l.lessonsCompleted}</td><td class="text-end">{l.conversations}</td>
                          <td>{l.levelsPassed.join(", ")}</td><td>{l.quizLevelsPassed.join(", ")}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </Show>
            </section>

            <section>
              <h2 class="h6">Active days, last {ADMIN_RECENT_DAYS} (UTC)</h2>
              <Show when={d().days.length} fallback={<p class="text-body-secondary small">None.</p>}>
                <table class="table table-sm small w-auto">
                  <thead><tr><th>Day</th><th class="text-end">Dictation</th><th class="text-end">Quiz</th><th class="text-end">Spoken</th></tr></thead>
                  <tbody>
                    <For each={d().days}>
                      {(x) => <tr class="qa-admin-user-day"><td>{x.day}</td><td class="text-end">{x.type}</td><td class="text-end">{x.quiz}</td><td class="text-end">{x.talk}</td></tr>}
                    </For>
                  </tbody>
                </table>
              </Show>
            </section>

            <section class="small">
              <h2 class="h6">Social</h2>
              <div>Friends ({d().friends.length}): <PeopleList people={d().friends} /></div>
              <div>Pending requests sent: {u().pendingSent}</div>
              <div class="qa-admin-user-blocked-by">Blocked by: <PeopleList people={d().blockedBy} /></div>
              <div>Has blocked: <PeopleList people={d().blocked} /></div>
            </section>

            <section>
              <h2 class="h6">Reports filed ({d().reports.length})</h2>
              <Show when={d().reports.length} fallback={<p class="text-body-secondary small">None.</p>}>
                <ul class="list-group small">
                  <For each={d().reports}>
                    {(r) => (
                      <li class="qa-admin-user-report list-group-item">
                        <span class="badge text-bg-light me-2">{r.kind}</span>
                        <span class="text-body-secondary me-2">{new Date(r.createdAt).toLocaleString()}</span>
                        <span class="fw-semibold">{r.note}</span>
                        <div class="text-body-secondary">{r.text}</div>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>
          </div>
        );
      }}
    </Show>
  );
}
