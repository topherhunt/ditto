import { A } from "@solidjs/router";
import { createResource, For, Match, Show, Switch } from "solid-js";
import type { Catalog } from "../../../shared/api.ts";
import { PATHS, type ServedCourse, type ServedLesson } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { languageName, t } from "../i18n/index.ts";
import { me } from "../session.ts";
import { displayName } from "../social.ts";
import { useLang } from "./lang.ts";

export function Home() {
  const lang = useLang();
  const [catalog] = createResource(lang, (l) => api.get<Catalog>(`/api/catalog?lang=${l}`));
  const path = () => me()!.prefs[lang()].path;
  const pathUnits = (lesson: ServedLesson) => lesson.units.filter((u) => (PATHS[path()] as readonly string[]).includes(u.stage)).length;
  /** Courses by level, main track before optional modules, each in course order. */
  const levels = (cat: Catalog) => {
    const byLevel = new Map<string, ServedCourse[]>();
    const sorted = [...cat.courses].sort((a, b) => a.level.localeCompare(b.level) || a.track.localeCompare(b.track) || a.order - b.order);
    for (const c of sorted) byLevel.set(c.level, [...(byLevel.get(c.level) ?? []), c]);
    return [...byLevel];
  };

  return (
    <Show when={catalog()}>
      {(cat) => (
        <div class="d-flex flex-column gap-4">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <h1 class="h3 mb-0 me-auto">{languageName(lang())}</h1>
            <A href={`/${lang()}/review`} class="qa-review-link btn btn-primary">
              {t("home.review")} <span class="qa-due-count badge text-bg-light">{cat().dueCount}</span>
            </A>
            <A href={`/${lang()}/notebook`} class="qa-notebook-link btn btn-outline-primary">
              {t("home.notebook")} <span class="qa-mistakes-count badge text-bg-primary">{cat().mistakesCount}</span>
            </A>
          </div>
          <For each={levels(cat())} fallback={<p class="text-body-secondary">{t("home.noCourses")}</p>}>
            {([level, courses]) => (
              <div class="qa-level d-flex flex-column gap-3">
                <h2 class="h4 mb-0">{level}</h2>
                <For each={courses}>
                  {(course) => {
                    const open = () => cat().unlocked.includes(course.id);
                    const titleOf = (id: string) => cat().courses.find((c) => c.id === id)!.title;
                    /** A locked course lists only the lessons friends have started. */
                    const listed = () => (open() ? course.lessons : course.lessons.filter((l) => l.id in cat().viaFriends));
                    return (
                      <section class="qa-course card" classList={{ "qa-course-locked opacity-50": !open() }}>
                        <div class="card-body">
                          <div class="d-flex align-items-baseline gap-2">
                            <h3 class="h5 mb-1">{course.title}</h3>
                            <Show when={course.track === "optional"}><span class="qa-course-optional badge text-bg-info">{t("home.optional")}</span></Show>
                            <Show when={!open()}><span class="badge text-bg-secondary">{t("home.locked")}</span></Show>
                          </div>
                          <p class="text-body-secondary small mb-0">
                            {course.description}
                            <Show when={!open()}> -- {t("home.after", { courses: course.requires.map(titleOf).join(", ") })}</Show>
                          </p>
                          <Show when={listed().length > 0}>
                            <ul class="list-group mt-3">
                              <For each={listed()}>
                                {(lesson) => {
                                  const progress = () => cat().progress[lesson.id]?.[path()];
                                  const total = () => pathUnits(lesson);
                                  const label = () => t(!progress() ? "home.start" : progress()!.nextIndex >= total() ? "home.again" : "home.continue");
                                  return (
                                    <li class="qa-lesson list-group-item d-flex align-items-center gap-3">
                                      <div class="me-auto">
                                        <div class="fw-semibold">{lesson.title}</div>
                                        <div class="small text-body-secondary">{lesson.grammarFocus.join(" · ")}</div>
                                      </div>
                                      <span class="qa-lesson-progress small text-body-secondary text-nowrap">
                                        {Math.min(progress()?.nextIndex ?? 0, total())} / {total()}
                                        {progress()?.completedAt ? " ✓" : ""}
                                      </span>
                                      <Switch fallback={<button type="button" class="qa-lesson-locked btn btn-sm btn-outline-secondary" disabled>{t("home.locked")}</button>}>
                                        <Match when={cat().unlocked.includes(lesson.id)}>
                                          <A href={`/${lang()}/lesson/${lesson.id}`} class="qa-lesson-start btn btn-sm btn-success">{label()}</A>
                                        </Match>
                                        <Match when={cat().viaFriends[lesson.id]}>
                                          {(friends) => {
                                            const names = () => friends().map(displayName);
                                            return (
                                            <A href={`/${lang()}/lesson/${lesson.id}`} class="qa-lesson-friend btn btn-sm btn-outline-success text-nowrap"
                                              title={t("home.unlockedBy", { names: names().join(", ") })}>
                                              {label()} <span class="small">{t("home.via", { name: names()[0] })}{names().length > 1 ? ` +${names().length - 1}` : ""}</span>
                                            </A>
                                            );
                                          }}
                                        </Match>
                                      </Switch>
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
              </div>
            )}
          </For>
        </div>
      )}
    </Show>
  );
}
