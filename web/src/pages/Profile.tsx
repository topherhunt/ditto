import { A, useNavigate, useParams } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import type { ActivityWindow, Profile as ProfileOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { ProgressGraph } from "../components/ProgressGraph.tsx";
import { languageName, t } from "../i18n/index.ts";
import { lessonCount, shortDate } from "../social.ts";

const ACTIVITY_KEYS = {
  day: "profile.activity.day", week: "profile.activity.week", month: "profile.activity.month", year: "profile.activity.year",
} as const satisfies Record<ActivityWindow, string>;

function activityText(a: ProfileOut["activity"]) {
  if (a === null) return t("profile.noLessons");
  if ("lastCompletedAt" in a) return t("profile.lastCompleted", { date: shortDate(a.lastCompletedAt) });
  return t(ACTIVITY_KEYS[a.window], { lessons: lessonCount(a.lessons) });
}

/** A learner's progress, shown to themselves and their friends. `/people/me` is the signed-in learner. */
export function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const [profile] = createResource(() => params.id, (id) => api.get<ProfileOut>(`/api/profile/${id}`));

  async function unfriend(p: ProfileOut) {
    if (!confirm(t("profile.unfriendConfirm", { name: p.person.name }))) return;
    await api.post(`/api/friends/${p.person.id}/unfriend`);
    navigate("/friends");
  }

  return (
    <Show when={profile()}>
      {(p) => (
        <div class="qa-profile d-flex flex-column gap-4">
          <div class="d-flex align-items-center gap-3">
            <Show when={p().person.picture}>{(src) => <img src={src()} alt="" class="rounded-circle" width="56" height="56" referrerpolicy="no-referrer" />}</Show>
            <div class="me-auto">
              <h1 class="qa-profile-name h3 mb-0">{p().person.name}</h1>
              <div class="small text-body-secondary">{p().person.email}</div>
            </div>
            <Show when={!p().isMe}>
              <button type="button" class="qa-unfriend btn btn-sm btn-outline-danger" onClick={() => unfriend(p())}>{t("profile.unfriend")}</button>
            </Show>
          </div>
          <div>
            <p class="qa-activity fs-5 mb-1">{activityText(p().activity)}</p>
            <Show when={p().accuracy.dictation !== null}>
              <p class="qa-accuracy text-body-secondary mb-0">
                {t("profile.accuracy", { lessons: lessonCount(p().accuracy.lessons), n: p().accuracy.lessons, dictation: p().accuracy.dictation! })}
                <Show when={p().accuracy.meaning !== null}>{t("profile.accuracyMeaning", { meaning: p().accuracy.meaning! })}</Show>
              </p>
            </Show>
          </div>
          <For each={p().languages}>
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
        </div>
      )}
    </Show>
  );
}
