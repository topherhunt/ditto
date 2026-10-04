import { A, useNavigate, useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, For, Match, on, onCleanup, Show, Switch } from "solid-js";
import {
  FRIEND_REQUESTS_PER_DAY, USER_REPORT_NOTE_MAX, USER_REPORT_REASONS, type LeaderboardWindow, type Profile as ProfileOut, type UserReportReason,
} from "../../../shared/api.ts";
import { api } from "../api.ts";
import { ProgressGraph } from "../components/ProgressGraph.tsx";
import { languageName, t } from "../i18n/index.ts";
import { LANGUAGE_FLAGS } from "../learning.ts";
import { me } from "../session.ts";
import { activityText, displayName, lessonCount, sendFriendRequest, shortDate } from "../social.ts";
import { Loading } from "../components/Loading.tsx";
import { routes } from "../routes.ts";

const LESSONS_KEYS = { day: "profile.lessonsDay", week: "profile.lessonsWeek", month: "profile.lessonsMonth" } as const satisfies Record<LeaderboardWindow, string>;

/** The username for anyone; the language and lesson counts unless the account is private; progress only for themselves and friends. `/people/me` is the signed-in learner. */
export function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const [profile, { refetch }] = createResource(() => params.id, (id) => api.get<ProfileOut>(`/api/profile/${id}`));

  async function unfriend(p: ProfileOut) {
    if (!confirm(t("profile.unfriendConfirm", { name: displayName(p.person) }))) return;
    await api.post(`/api/friends/${p.person.id}/unfriend`);
    navigate(routes.friends());
  }
  /** Sends a request, or accepts theirs. */
  const [limited, setLimited] = createSignal(false);
  async function befriend(p: ProfileOut) {
    if ((await sendFriendRequest(p.person.id)) === null) setLimited(true);
    else await refetch();
  }

  const [menuOpen, setMenuOpen] = createSignal(false);
  let menuRoot: HTMLDivElement | undefined;
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (menuRoot && !menuRoot.contains(e.target as Node)) setMenuOpen(false);
  };
  document.addEventListener("click", closeOnOutsideClick);
  onCleanup(() => document.removeEventListener("click", closeOnOutsideClick));
  async function setBlocked(p: ProfileOut, on: boolean) {
    setMenuOpen(false);
    if (on && !confirm(t("profile.blockConfirm", { name: displayName(p.person) }))) return;
    await api.post(`/api/friends/${p.person.id}/${on ? "block" : "unblock"}`);
    await refetch();
  }
  const [reporting, setReporting] = createSignal(false);
  const [reported, setReported] = createSignal(false);
  const [reason, setReason] = createSignal<UserReportReason>("username");
  const [note, setNote] = createSignal("");
  createEffect(on(() => params.id, () => { setReporting(false); setReported(false); setLimited(false); }, { defer: true }));
  async function report(p: ProfileOut) {
    await api.post(`/api/people/${p.person.id}/report`, { reason: reason(), note: note() });
    setReporting(false);
    setReported(true);
    await refetch();
  }

  return (
    <Show when={profile()} fallback={<Loading />}>
      {(p) => (
        <div class="qa-profile d-flex flex-column gap-4">
          <Show when={p().relation === "self"}>
            <div class="qa-profile-self-note alert alert-secondary small mb-0">
              {t(me()!.profilePublic ? "profile.selfPublic" : "profile.selfPrivate")}{" "}
              <A href={routes.settings()} class="alert-link">{t("profile.changeInSettings")}</A>
            </div>
          </Show>
          <div class="d-flex align-items-center gap-3">
            <div class="me-auto">
              <h1 class="qa-profile-name h3 mb-0">{displayName(p().person)}</h1>
              <Show when={p().summary?.language}>
                {(l) => <div class="qa-profile-studying text-body-secondary">{LANGUAGE_FLAGS[l()]} {languageName(l())}</div>}
              </Show>
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
              <Match when={p().relation === "blocked"}><span class="qa-profile-blocked small text-body-secondary">{t("profile.blockedThem")}</span></Match>
            </Switch>
            <Show when={p().relation !== "self"}>
              <div class="dropdown" ref={menuRoot}>
                <button type="button" class="qa-profile-menu btn btn-sm btn-outline-secondary" aria-label={t("profile.more")} aria-expanded={menuOpen()}
                  onClick={() => setMenuOpen(!menuOpen())}>
                  <i class="bi bi-three-dots" aria-hidden="true" />
                </button>
                <ul class="dropdown-menu dropdown-menu-end" classList={{ show: menuOpen() }} data-bs-popper="static">
                  <Show when={p().relation === "blocked"} fallback={
                    <li><button type="button" class="qa-profile-block dropdown-item" onClick={() => setBlocked(p(), true)}>
                      <i class="bi bi-slash-circle me-2" aria-hidden="true" />{t("profile.block")}
                    </button></li>
                  }>
                    <li><button type="button" class="qa-profile-unblock dropdown-item" onClick={() => setBlocked(p(), false)}>
                      <i class="bi bi-arrow-counterclockwise me-2" aria-hidden="true" />{t("profile.unblock")}
                    </button></li>
                  </Show>
                  <li><button type="button" class="qa-profile-report dropdown-item text-danger" onClick={() => { setMenuOpen(false); setReporting(true); }}>
                    <i class="bi bi-flag me-2" aria-hidden="true" />{t("profile.report")}
                  </button></li>
                </ul>
              </div>
            </Show>
          </div>
          <Show when={limited()}><p class="qa-friend-limit alert alert-info mb-0">{t("friends.limit", { n: FRIEND_REQUESTS_PER_DAY })}</p></Show>
          <Show when={reported()}><p class="qa-report-sent alert alert-success mb-0">{t("profile.reportSent")}</p></Show>
          <Show when={reporting()}>
            <form class="qa-report-form card card-body d-flex flex-column gap-2" onSubmit={(e) => { e.preventDefault(); void report(p()); }}>
              <h2 class="h6 mb-0">{t("profile.reportTitle", { name: displayName(p().person) })}</h2>
              <select class="qa-report-reason form-select" value={reason()} onChange={(e) => setReason(e.currentTarget.value as UserReportReason)}>
                <For each={USER_REPORT_REASONS}>{(r) => <option value={r}>{t(`profile.reason.${r}`)}</option>}</For>
              </select>
              <textarea class="qa-report-note form-control" rows={3} maxLength={USER_REPORT_NOTE_MAX} placeholder={t("profile.reportNote")}
                value={note()} onInput={(e) => setNote(e.currentTarget.value)} />
              <p class="small text-body-secondary mb-0">{t("profile.reportHint")}</p>
              <div class="d-flex gap-2">
                <button type="submit" class="qa-report-send btn btn-sm btn-danger">{t("profile.reportSend")}</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" onClick={() => setReporting(false)}>{t("profile.cancel")}</button>
              </div>
            </form>
          </Show>
          <Show when={p().summary} fallback={
            <Show when={p().relation !== "blocked"}><p class="qa-profile-hidden text-body-secondary mb-0">{t("profile.hidden")}</p></Show>
          }>
            {(s) => (
              <div class="d-flex flex-column gap-3">
                <p class="qa-activity fs-5 mb-0">{activityText(s().activity)}</p>
                <div class="row g-2">
                  <For each={Object.keys(LESSONS_KEYS) as LeaderboardWindow[]}>
                    {(w) => (
                      <div class="col-4">
                        <div class="border rounded p-2 h-100">
                          <div class={`qa-profile-lessons-${w} fs-4 fw-semibold`}>{s().lessons[w]}</div>
                          <div class="small text-body-secondary">{t(LESSONS_KEYS[w])}</div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </Show>
          <Show when={p().details} fallback={
            <Show when={p().summary && p().relation !== "blocked"}><p class="qa-profile-private text-body-secondary mb-0">{t("profile.private")}</p></Show>
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
                                  <A href={routes.typeLesson({ lang: l.language, lessonId: r.lessonId })} class="qa-play btn btn-sm btn-success">{t("profile.play")}</A>
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
