import { A } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import type { Catalog } from "../../../shared/api.ts";
import { LANGUAGE_NAMES, PATHS, type ServedLesson } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { me } from "../session.ts";
import { useLang } from "./lang.ts";

export function Home() {
  const lang = useLang();
  const [catalog] = createResource(lang, (l) => api.get<Catalog>(`/api/catalog?lang=${l}`));
  const path = () => me()!.prefs[lang()].path;
  const pathUnits = (lesson: ServedLesson) => lesson.units.filter((u) => (PATHS[path()] as readonly string[]).includes(u.stage)).length;

  return (
    <Show when={catalog()}>
      {(cat) => (
        <div class="d-flex flex-column gap-4">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <h1 class="h3 mb-0 me-auto">{LANGUAGE_NAMES[lang()]}</h1>
            <A href={`/${lang()}/review`} class="qa-review-link btn btn-primary">
              Review <span class="qa-due-count badge text-bg-light">{cat().dueCount}</span>
            </A>
            <A href={`/${lang()}/notebook`} class="qa-notebook-link btn btn-outline-primary">
              Notebook <span class="qa-mistakes-count badge text-bg-primary">{cat().mistakesCount}</span>
            </A>
          </div>
          <For each={cat().courses} fallback={<p class="text-body-secondary">No courses yet.</p>}>
            {(course) => (
              <section class="qa-course card">
                <div class="card-body">
                  <div class="d-flex align-items-baseline gap-2">
                    <h2 class="h5 mb-1">{course.title}</h2>
                    <span class="badge text-bg-secondary">{course.level}</span>
                  </div>
                  <p class="text-body-secondary small">{course.description}</p>
                  <ul class="list-group">
                    <For each={course.lessons}>
                      {(lesson) => {
                        const progress = () => cat().progress[lesson.id]?.[path()];
                        const total = () => pathUnits(lesson);
                        const label = () => (!progress() ? "Start" : progress()!.nextIndex >= total() ? "Again" : "Continue");
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
                            <A href={`/${lang()}/lesson/${lesson.id}`} class="qa-lesson-start btn btn-sm btn-success">{label()}</A>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </div>
              </section>
            )}
          </For>
        </div>
      )}
    </Show>
  );
}
