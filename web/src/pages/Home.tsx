import { A } from "@solidjs/router";
import { createResource, createSignal, For, Match, Show, Switch } from "solid-js";
import { MASTER_WAIT_MS, type Catalog } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { ScrollUpButton } from "../components/ScrollButtons.tsx";
import { ActivityHeader } from "../components/ActivityHeader.tsx";
import { PracticeSettingsPanel } from "../components/LanguagePrefs.tsx";
import { Popup } from "../components/Popup.tsx";
import { ReviewButton } from "../components/ReviewButton.tsx";
import { Stars } from "../components/Stars.tsx";
import { TestOutButton } from "../components/TestOutButton.tsx";
import { lessonDone, levelDone, levels, nextLesson, pathUnits } from "../curriculum.ts";
import { t } from "../i18n/index.ts";
import { me } from "../session.ts";
import { displayName } from "../social.ts";
import { useLang } from "./lang.ts";

export function Home() {
  const lang = useLang();
  const [catalog] = createResource(lang, (l) => api.get<Catalog>(`/api/catalog?lang=${l}`));
  const path = () => me()!.prefs[lang()].path;
  /** Level or course id -> folded, for ones the learner opened or closed by hand; the rest fold once done (a level also once passed). */
  const [toggled, setToggled] = createSignal<Record<string, boolean>>({});
  const fresh = () => Object.keys(catalog()!.progress).length === 0;

  return (
    <Show when={catalog()}>
      {(cat) => (
        <div class="d-flex flex-column gap-4">
          <ScrollUpButton />
          <ActivityHeader activity="type" lang={lang()} fresh={fresh()} />
          <div class="qa-home-prefs"><PracticeSettingsPanel lang={lang()} /></div>
          <div class="d-flex flex-wrap justify-content-center gap-2">
            <Show when={nextLesson(cat())}>
              {(lesson) => (
                <A href={`/${lang()}/type/lesson/${lesson().id}`} class="qa-next-lesson btn btn-success">
                  <span aria-hidden="true">▶</span> {t("home.next", { title: lesson().title })}
                </A>
              )}
            </Show>
            {/* A first-timer sees just the way in; these fill up once they practice. */}
            <Show when={!fresh()}>
              <ReviewButton lang={lang()} count={cat().reviewCount} next={nextLesson(cat())} />
            </Show>
          </div>
          <For each={levels(cat())} fallback={<p class="text-body-secondary">{t("home.noCourses")}</p>}>
            {([level, courses]) => {
              const passed = () => cat().passedLevels.includes(level);
              const folded = () => toggled()[level] ?? (passed() || levelDone(cat(), courses));
              return (
                <div class="qa-level d-flex flex-column gap-3" classList={{ "qa-level-folded": folded() }}>
                  <div class="d-flex flex-wrap align-items-center gap-2">
                    <h2 class="h4 mb-0">
                      <button type="button" class="qa-level-toggle btn btn-link p-0 fs-4 fw-medium text-reset text-decoration-none" aria-expanded={!folded()}
                        onClick={() => setToggled((m) => ({ ...m, [level]: !folded() }))}>
                        <span aria-hidden="true" class="small">{folded() ? "▸" : "▾"}</span> {level}
                      </button>
                    </h2>
                    <Show when={passed()}><span class="qa-level-passed badge text-bg-success">{t("home.testedOut")}</span></Show>
                    <Show when={!passed() && !levelDone(cat(), courses)}>
                      <TestOutButton kind="type" href={`/${lang()}/type/test/${level}`} level={level} label={t("home.testOut", { level })} class="qa-level-test btn-sm ms-auto" />
                    </Show>
                  </div>
                  <Show when={!folded()}>
                    <For each={courses}>
                      {(course) => {
                        const open = () => cat().unlocked.includes(course.id);
                        const titleOf = (id: string) => cat().courses.find((c) => c.id === id)!.title;
                        /** A locked course lists only the lessons friends have started. */
                        const listed = () => (open() ? course.lessons : course.lessons.filter((l) => l.id in cat().viaFriends));
                        /** Only a finished course folds. */
                        const done = () => course.lessons.every((l) => lessonDone(cat(), l.id));
                        const folded = () => done() && (toggled()[course.id] ?? true);
                        return (
                          <section class={`qa-course qa-course-${course.id} card`} classList={{ "qa-course-locked opacity-50": !open(), "qa-course-folded": folded() }}>
                            <div class="card-body">
                              <div class="d-flex align-items-baseline gap-2">
                                <h3 class="h5 mb-0">
                                  <Show when={done()} fallback={course.title}>
                                    <button type="button" class="qa-course-toggle btn btn-link p-0 fs-5 fw-medium text-reset text-decoration-none" aria-expanded={!folded()}
                                      onClick={() => setToggled((m) => ({ ...m, [course.id]: !folded() }))}>
                                      <span aria-hidden="true" class="small">{folded() ? "▸" : "▾"}</span> {course.title}
                                    </button>
                                  </Show>
                                </h3>
                                <Show when={course.track === "optional"}><span class="qa-course-optional badge text-bg-info">{t("home.optional")}</span></Show>
                                <Show when={!open()}><span class="badge text-bg-secondary">{t("home.locked")}</span></Show>
                              </div>
                              <Show when={!folded()}>
                                <p class="text-body-secondary small mt-1 mb-0">
                                  {course.description}
                                  <Show when={!open()}> -- {t("home.after", { courses: course.requires.map(titleOf).join(", ") })}</Show>
                                </p>
                              </Show>
                              <Show when={!folded() && listed().length > 0}>
                                <ul class="list-group list-group-flush border-top mx-n3 mt-3">
                                  <For each={listed()}>
                                    {(lesson) => {
                                      const progress = () => cat().progress[lesson.id]?.[path()];
                                      const total = () => pathUnits(lesson, path());
                                      const stars = () => cat().stars[lesson.id];
                                      /** Hours until Master opens; 0 once it has. */
                                      const masterWait = () => Math.max(0, Math.ceil((Date.parse(stars().practicedAt) + MASTER_WAIT_MS - Date.now()) / 3_600_000));
                                      /** A finished lesson is practiced again from the top, so only a run underway continues. */
                                      const underway = () => !!progress() && progress()!.nextIndex < total();
                                      const [ask, setAsk] = createSignal<"master" | "cooldown" | null>(null);
                                      const label = () => t(underway() ? "home.continue" : stars() ? "home.practice" : "home.start");
                                      return (
                                        <li class="qa-lesson lesson-row list-group-item">
                                          <div class="lesson-text min-w-0">
                                            <div class="fw-semibold">{lesson.title}</div>
                                            <div class="small text-body-secondary">{lesson.grammarFocus.join(" · ")}</div>
                                          </div>
                                          <div class="qa-lesson-actions lesson-actions d-flex flex-nowrap flex-shrink-0 align-items-center justify-content-end text-nowrap">
                                            <Switch fallback={<button type="button" class="qa-lesson-locked btn btn-sm btn-outline-secondary" disabled>{t("home.locked")}</button>}>
                                              <Match when={cat().unlocked.includes(lesson.id)}>
                                                <A href={`/${lang()}/type/lesson/${lesson.id}`} class="qa-lesson-start btn btn-sm"
                                                    classList={{ "btn-success": stars()?.stars !== 3, "btn-outline-success": stars()?.stars === 3 }}>{label()}</A>
                                                <Show when={stars()?.stars !== undefined && stars().stars < 3 && masterWait() === 0}>
                                                  <button type="button" class="qa-lesson-master btn btn-sm btn-gold" onClick={() => setAsk("master")}>{t("home.master")}</button>
                                                </Show>
                                                <Show when={stars()?.stars !== undefined && stars().stars < 3 && masterWait() > 0}>
                                                  <button type="button" class="qa-lesson-master-locked btn btn-sm btn-link text-danger p-0 fs-5" aria-label={t("home.masterCooldownTitle")}
                                                    onClick={() => setAsk("cooldown")}><i class="bi bi-hourglass-split" aria-hidden="true" /></button>
                                                </Show>
                                              </Match>
                                              <Match when={cat().viaFriends[lesson.id]}>
                                                {(friends) => {
                                                  const names = () => friends().map(displayName);
                                                  return (
                                                  <A href={`/${lang()}/type/lesson/${lesson.id}`} class="qa-lesson-friend btn btn-sm btn-outline-success text-nowrap">
                                                    {label()} <span class="small">{t("home.via", { name: names()[0] })}{names().length > 1 ? ` +${names().length - 1}` : ""}</span>
                                                  </A>
                                                  );
                                                }}
                                              </Match>
                                            </Switch>
                                            <Show when={!stars()}>
                                              <span class="qa-lesson-progress small text-body-secondary text-nowrap">
                                                {Math.min(progress()?.nextIndex ?? 0, total())} / {total()}
                                              </span>
                                            </Show>
                                            <Show when={stars()}>{(s) => <Stars n={s().stars} class="qa-lesson-stars" />}</Show>
                                          </div>
                                          <Popup open={ask() === "master"} onClose={() => setAsk(null)} title={t("home.masterIntroTitle")} titleIcon="trophy-fill" titleIconClass="gold-shimmer" class="qa-master-popup"
                                            footer={<>
                                              <A href={`/${lang()}/type/lesson/${lesson.id}`} class="qa-master-more btn btn-outline-success">{t("home.masterMore")}</A>
                                              <A href={`/${lang()}/type/lesson/${lesson.id}/master`} class="qa-master-ready btn btn-gold"><i class="bi bi-play-fill me-1" aria-hidden="true" />{t("home.masterReady")}</A>
                                            </>}>
                                            {t("home.masterIntro")}
                                          </Popup>
                                          <Popup open={ask() === "cooldown"} onClose={() => setAsk(null)} title={t("home.masterCooldownTitle")} class="qa-cooldown-popup"
                                            footer={<button type="button" class="qa-cooldown-ok btn btn-primary" onClick={() => setAsk(null)}>{t("home.masterCooldownOk")}</button>}>
                                            <Show when={stars()}>{masterWait() === 1 ? t("home.masterCooldownOne") : t("home.masterCooldown", { hours: masterWait() })}</Show>
                                          </Popup>
                                        </li>
                                      );
                                    }}
                                  </For>
                                </ul>
                              </Show>
                            </div>
                          </section>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      )}
    </Show>
  );
}
