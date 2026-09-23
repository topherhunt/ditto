import { A, useParams } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import type { Catalog, MistakeEntry, Mode, ReviewOut } from "../../../shared/api.ts";
import { PATHS, type Language, type ServedUnit } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { Exercise } from "../components/Exercise.tsx";
import type { Outcome } from "../practice.ts";
import { me } from "../session.ts";
import { useLang } from "./lang.ts";

type Deck = { title: string; units: ServedUnit[]; start: number };

async function loadDeck(mode: Mode, lang: Language, lessonId: string | undefined): Promise<Deck> {
  if (mode === "review") return { title: "Review", units: (await api.get<ReviewOut>(`/api/review?lang=${lang}`)).units, start: 0 };
  if (mode === "mistakes")
    return { title: "Practice mistakes", units: (await api.get<MistakeEntry[]>(`/api/mistakes?lang=${lang}`)).map((m) => m.unit), start: 0 };
  const cat = await api.get<Catalog>(`/api/catalog?lang=${lang}`);
  const lesson = cat.courses.flatMap((c) => c.lessons).find((l) => l.id === lessonId);
  if (!lesson) throw new Error(`Unknown lesson ${lessonId}`);
  if (!cat.unlocked.includes(lesson.id)) throw new Error(`Lesson "${lesson.title}" is locked: finish the lessons before it first`);
  const path = me()!.prefs[lang].path;
  const units = lesson.units.filter((u) => (PATHS[path] as readonly string[]).includes(u.stage));
  const next = cat.progress[lesson.id]?.[path]?.nextIndex ?? 0;
  return { title: lesson.title, units, start: next < units.length ? next : 0 };
}

export function Practice(props: { mode: Mode }) {
  const lang = useLang();
  const params = useParams();
  const [deck] = createResource(() => [props.mode, lang(), params.lessonId] as const, ([m, l, id]) => loadDeck(m, l, id));
  return (
    <Show when={deck()} keyed>
      {(d) => <Session deck={d} mode={props.mode} lang={lang()} />}
    </Show>
  );
}

function Session(props: { deck: Deck; mode: Mode; lang: Language }) {
  const [index, setIndex] = createSignal(props.deck.start);
  const [tally, setTally] = createSignal<Record<Outcome, number>>({ clean: 0, hinted: 0, corrected: 0, revealed: 0 });
  const current = () => props.deck.units[index()];
  const prefs = () => me()!.prefs[props.lang];

  return (
    <div class="d-flex flex-column gap-3">
      <div class="d-flex align-items-baseline gap-2">
        <h1 class="h4 mb-0 me-auto">{props.deck.title}</h1>
        <span class="qa-position text-body-secondary small">{Math.min(index() + 1, props.deck.units.length)} / {props.deck.units.length}</span>
      </div>
      <div class="progress" style={{ height: "4px" }}>
        <div class="progress-bar" style={{ width: `${(100 * index()) / Math.max(props.deck.units.length, 1)}%` }} />
      </div>
      <Show
        when={current()}
        keyed
        fallback={
          <div class="qa-session-done card"><div class="card-body d-flex flex-column gap-2">
            <h2 class="h5">{props.deck.units.length === 0 ? "Nothing to practice right now." : "Done!"}</h2>
            <Show when={props.deck.units.length > 0}>
              <p class="mb-0">
                {tally().clean} perfect, {tally().hinted} with hints, {tally().corrected} corrected, {tally().revealed} revealed.
              </p>
            </Show>
            <div class="d-flex gap-2">
              <A href={`/${props.lang}`} class="qa-back btn btn-primary">Back to lessons</A>
              <Show when={props.mode === "learn"}>
                <button type="button" class="qa-restart btn btn-outline-primary" onClick={() => setIndex(0)}>Practice again</button>
              </Show>
            </div>
          </div></div>
        }
      >
        {(unit) => (
          <Exercise
            unit={unit}
            prefs={prefs()}
            mode={props.mode}
            onFinished={(o) => setTally((t) => ({ ...t, [o]: t[o] + 1 }))}
            onNext={() => setIndex((i) => i + 1)}
          />
        )}
      </Show>
    </div>
  );
}
