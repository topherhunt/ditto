import { A, useParams } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import type { Catalog, CompareRow, LevelTestOut, MistakeEntry, ReviewOut } from "../../../shared/api.ts";
import { PATHS, type Language, type ServedUnit } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { Exercise } from "../components/Exercise.tsx";
import { t } from "../i18n/index.ts";
import type { Outcome, SessionMode } from "../practice.ts";
import { me } from "../session.ts";
import { displayName } from "../social.ts";
import { useLang } from "./lang.ts";

type Deck = { title: string; units: ServedUnit[]; start: number; lessonId: string | null };

async function loadDeck(mode: SessionMode, lang: Language, lessonId: string | undefined, level: string | undefined): Promise<Deck> {
  if (mode === "test") {
    const { units } = await api.get<LevelTestOut>(`/api/level-test?lang=${lang}&level=${encodeURIComponent(level!)}`);
    return { title: t("test.title", { level: level! }), units, start: 0, lessonId: null };
  }
  if (mode === "review") return { title: t("practice.review"), units: (await api.get<ReviewOut>(`/api/review?lang=${lang}`)).units, start: 0, lessonId: null };
  if (mode === "mistakes") {
    const units = (await api.get<MistakeEntry[]>(`/api/mistakes?lang=${lang}`)).map((m) => m.unit);
    return { title: t("practice.mistakes"), units, start: 0, lessonId: null };
  }
  const cat = await api.get<Catalog>(`/api/catalog?lang=${lang}`);
  const lesson = cat.courses.flatMap((c) => c.lessons).find((l) => l.id === lessonId);
  if (!lesson) throw new Error(`Unknown lesson ${lessonId}`);
  if (!cat.unlocked.includes(lesson.id) && !(lesson.id in cat.viaFriends))
    throw new Error(t("practice.locked", { title: lesson.title }));
  const path = me()!.prefs[lang].path;
  const units = lesson.units.filter((u) => (PATHS[path] as readonly string[]).includes(u.stage));
  const next = cat.progress[lesson.id]?.[path]?.nextIndex ?? 0;
  return { title: lesson.title, units, start: next < units.length ? next : 0, lessonId: lesson.id };
}

const minutes = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** How the learner's latest run of the lesson compares with friends who played it; hidden without friends. */
function Comparison(props: { lessonId: string; saves: Promise<unknown>[] }) {
  const [rows] = createResource(async () => {
    await Promise.allSettled(props.saves);
    return api.get<CompareRow[]>(`/api/lessons/${props.lessonId}/compare`);
  });
  return (
    <Show when={rows() && rows()!.length > 1}>
      <table class="qa-compare table table-sm mb-0">
        <thead><tr><th /><th class="text-end">{t("compare.accuracy")}</th><th class="text-end">{t("compare.meaning")}</th><th class="text-end">{t("compare.hints")}</th><th class="text-end">{t("compare.time")}</th></tr></thead>
        <tbody>
          <For each={rows()}>
            {(r) => (
              <tr class="qa-compare-row" classList={{ "fw-semibold": r.isMe }}>
                <td>{r.isMe ? t("compare.you") : displayName(r.person)}</td>
                <td class="text-end">{r.dictation}%</td>
                <td class="text-end">{r.meaning === null ? "--" : `${r.meaning}%`}</td>
                <td class="text-end">{r.hints}</td>
                <td class="text-end">{minutes(r.durationMs)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </Show>
  );
}

export function Practice(props: { mode: SessionMode }) {
  const lang = useLang();
  const params = useParams();
  const [deck, { refetch }] = createResource(() => [props.mode, lang(), params.lessonId, params.level] as const, ([m, l, id, level]) => loadDeck(m, l, id, level));
  return (
    <Show when={deck()} keyed>
      {(d) => <Session deck={d} mode={props.mode} lang={lang()} level={params.level} onRetry={refetch} />}
    </Show>
  );
}

/** A level test's end: passed only when every item was clean, which also records the pass. */
function TestResult(props: { lang: Language; level: string; passed: boolean; right: number; total: number; onRetry: () => void }) {
  const [saved] = createResource(() => props.passed || undefined, () => api.post("/api/level-test/pass", { language: props.lang, level: props.level }));
  return (
    <div class="qa-test-result card"><div class="card-body d-flex flex-column gap-2">
      <Show when={props.passed} fallback={
        <>
          <h2 class="qa-test-failed h5">{t("test.failed")}</h2>
          <p class="mb-0">{t("test.failedBody", { right: props.right, total: props.total })}</p>
        </>
      }>
        <div class="text-center" style={{ "font-size": "5rem" }}><span class="qa-tada tilt" aria-hidden="true">🎉</span></div>
        <h2 class="qa-test-passed h5">{t("test.passed", { level: props.level })}</h2>
        <p class="mb-0">{t("test.passedBody", { level: props.level })}</p>
        <Show when={saved.error}>{(e) => <div class="alert alert-danger mb-0">{t("exercise.saveFailed", { error: (e() as Error).message })}</div>}</Show>
      </Show>
      <div class="d-flex gap-2">
        <A href={`/${props.lang}`} class="qa-back btn btn-primary" ref={(el) => queueMicrotask(() => el.focus())}>{t("practice.back")}</A>
        <Show when={!props.passed}>
          <button type="button" class="qa-test-retry btn btn-outline-primary" onClick={() => props.onRetry()}>{t("test.retry")}</button>
        </Show>
      </div>
    </div></div>
  );
}

function Session(props: { deck: Deck; mode: SessionMode; lang: Language; level: string | undefined; onRetry: () => void }) {
  const [index, setIndex] = createSignal(props.deck.start);
  const [tally, setTally] = createSignal<Record<Outcome, number>>({ clean: 0, hinted: 0, corrected: 0, revealed: 0 });
  const saves: Promise<unknown>[] = [];
  const current = () => props.deck.units[index()];
  const prefs = () => me()!.prefs[props.lang];
  /** Any item not clean; a level test ends there. */
  const missed = () => Object.values(tally()).reduce((a, b) => a + b) > tally().clean;

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
        fallback={props.mode === "test" ? (
          <TestResult lang={props.lang} level={props.level!} passed={props.deck.units.length > 0 && !missed()}
            right={tally().clean} total={props.deck.units.length} onRetry={props.onRetry} />
        ) : (
          <div class="qa-session-done card"><div class="card-body d-flex flex-column gap-2">
            <Show when={props.deck.units.length > 0}>
              <div class="text-center" style={{ "font-size": "5rem" }}><span class="qa-tada tilt" aria-hidden="true">🎉</span></div>
            </Show>
            <h2 class="h5">{props.deck.units.length === 0 ? t("practice.nothing") : t("practice.done")}</h2>
            <Show when={props.deck.units.length > 0}>
              <p class="mb-0">{t("practice.tally", tally())}</p>
            </Show>
            <Show when={props.deck.units.length > 0 && props.deck.lessonId} keyed>
              {(id) => <Comparison lessonId={id} saves={saves} />}
            </Show>
            <div class="d-flex gap-2">
              {/* Focused so Enter goes straight back. */}
              <A href={`/${props.lang}`} class="qa-back btn btn-primary" ref={(el) => queueMicrotask(() => el.focus())}>{t("practice.back")}</A>
              <Show when={props.mode === "learn"}>
                <button type="button" class="qa-restart btn btn-outline-primary" onClick={() => setIndex(0)}>{t("practice.again")}</button>
              </Show>
            </div>
          </div></div>
        )}
      >
        {(unit) => (
          <Exercise
            unit={unit}
            prefs={prefs()}
            mode={props.mode}
            onFinished={(o, saved) => {
              setTally((n) => ({ ...n, [o]: n[o] + 1 }));
              saves.push(saved);
            }}
            onNext={() => setIndex((i) => (props.mode === "test" && missed() ? props.deck.units.length : i + 1))}
          />
        )}
      </Show>
    </div>
  );
}
