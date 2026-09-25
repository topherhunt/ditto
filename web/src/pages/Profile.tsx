import { A, useNavigate, useParams } from "@solidjs/router";
import { createResource, For, Match, Show, Switch } from "solid-js";
import type { ActivityWindow, LeaderboardWindow, Profile as ProfileOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { ProgressGraph } from "../components/ProgressGraph.tsx";
import { languageName, t } from "../i18n/index.ts";
import { displayName, lessonCount, shortDate } from "../social.ts";

const ACTIVITY_KEYS = {
  day: "profile.activity.day", week: "profile.activity.week", month: "profile.activity.month", year: "profile.activity.year",
} as const satisfies Record<ActivityWindow, string>;
const LESSONS_KEYS = { day: "profile.lessonsDay", week: "profile.lessonsWeek", month: "profile.lessonsMonth" } as const satisfies Record<LeaderboardWindow, string>;

function activityText(a: ProfileOut["activity"]) {
  if (a === null) return t("profile.noLessons");
  if ("lastCompletedAt" in a) return t("profile.lastCompleted", { date: shortDate(a.lastCompletedAt) });
  return t(ACTIVITY_KEYS[a.window], { lessons: lessonCount(a.lessons) });
}

/** Anyone's activity volume; their studies and contact details only for themselves and friends. `/people/me` is the signed-in learner. */
export function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const [profile, { refetch }] = createResource(() => params.id, (id) => api.get<ProfileOut>(`/api/profile/${id}`));

  async function unfriend(p: ProfileOut) {
    if (!confirm(t("profile.unfriendConfirm", { name: displayName(p.person) }))) return;
    await api.post(`/api/friends/${p.person.id}/unfriend`);
    navigate("/friends");
  }
  /** Sends a request, or accepts theirs. */
  async function befriend(p: ProfileOut) {
    await api.post("/api/friends/requests", { userId: p.person.id });
    await refetch();
  }

  return (
    <Show when={profile()}>
      {(p) => (
        <div class="qa-profile d-flex flex-column gap-4">
          <div class="d-flex align-items-center gap-3">
            <Show when={p().details?.picture}>{(src) => <img src={src()} alt="" class="rounded-circle" width="56" height="56" referrerpolicy="no-referrer" />}</Show>
            <div class="me-auto">
              <h1 class="qa-profile-name h3 mb-0">{displayName(p().person)}</h1>
              <Show when={p().details}>{(d) => <div class="small text-body-secondary">{d().name} · {d().email}</div>}</Show>
            </div>
            <Switch>
              <Match when={p().relation === "friends"}>
                <button type="button" class="qa-unfriend btn btn-sm btn-outline-danger" onClick={() => unfriend(p())}>{t("profile.unfriend")}</button>
              </Match>
              <Match when={p().relation === "none"}>
                <button type="button" class="qa-profile-befriend btn btn-sm btn-success" onClick={() => befriend(p())}>{t("profile.addFriend")}</button>
              </Match>
              <Match when={p().relation === "incoming"}>
                <button type="button" class="qa-profile-befriend btn btn-sm btn-success" onClick={() => befriend(p())}>{t("profile.acceptRequest")}</button>
              </Match>
              <Match when={p().relation === "outgoing"}><span class="qa-profile-sent small text-body-secondary">{t("profile.requestSent")}</span></Match>
              <Match when={p().relation === "blocked"}><span class="small text-body-secondary">{t("profile.blockedThem")}</span></Match>
            </Switch>
          </div>
          <div class="d-flex flex-column gap-3">
            <p class="qa-activity fs-5 mb-0">{activityText(p().activity)}</p>
            <div class="row g-2">
              <For each={Object.keys(LESSONS_KEYS) as LeaderboardWindow[]}>
                {(w) => (
                  <div class="col-4">
                    <div class="border rounded p-2 h-100">
                      <div class={`qa-profile-lessons-${w} fs-4 fw-semibold`}>{p().lessons[w]}</div>
                      <div class="small text-body-secondary">{t(LESSONS_KEYS[w])}</div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
          <Show when={p().details} fallback={
            <Show when={p().relation !== "blocked"}><p class="qa-profile-private text-body-secondary mb-0">{t("profile.private")}</p></Show>
          }>
            {(d) => (
              <>
                <Show when={d().accuracy.dictation !== null}>
                  <p class="qa-accuracy text-body-secondary mb-0">
                    {t("profile.accuracy", { lessons: lessonCount(d().accuracy.lessons), n: d().accuracy.lessons, dictation: d().accuracy.dictation! })}
                    <Show when={d().accuracy.meaning !== null}>{t("profile.accuracyMeaning", { meaning: d().accuracy.meaning! })}</Show>
                  </p>
                </Show>
                <For each={d().languages}>
                  {(l) => (
                    <section class="qa-profile-language card">
                      <div class="card-body d-flex flex-column gap-3">
                        <div>
                          <h2 class="h5 mb-1">{languageName(l.language)}</h2>
                          <div class="qa-level text-body-secondary">
                            {l.module ? t("profile.module", { number: l.module.number, of: l.module.of, title: l.module.title }) : t("profile.allDone")}
                            <Show when={l.optionalDone > 0}>
                              {" · "}{t(l.optionalDone === 1 ? "profile.optionalDone.one" : "profile.optionalDone.other", { n: l.optionalDone })}
                            </Show>
                          </div>
                        </div>
                        <Show when={l.completions.length > 0}>
                          <ProgressGraph completions={l.completions} levelsDone={l.levelsDone} />
                        </Show>
                        <div>
                          <h3 class="h6">{t("profile.recent")}</h3>
                          <ul class="list-group">
                            <For each={l.recent}>
                              {(r) => (
                                <li class="qa-recent list-group-item d-flex align-items-center gap-3">
                                  <div class="me-auto">
                                    <div class="fw-semibold">{r.lessonTitle}{r.completed ? " ✓" : ""}</div>
                                    <div class="small text-body-secondary">{r.courseTitle} · {shortDate(r.lastAt)}</div>
                                  </div>
                                  <A href={`/${l.language}/lesson/${r.lessonId}`} class="qa-play btn btn-sm btn-success">{t("profile.play")}</A>
                                </li>
                              )}
                            </For>
                          </ul>
                        </div>
                      </div>
                    </section>
                  )}
                </For>
              </>
            )}
          </Show>
        </div>
      )}
    </Show>
  );
}
