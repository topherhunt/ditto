import { A, useParams } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { MASTER_WAIT_MS, type AttemptOut, type CompareRow, type LessonOut, type LevelTestOut, type MistakeEntry, type Prefs, type ReviewOut } from "../../../shared/api.ts";
import { PATHS, type Language, type ServedUnit } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { Exercise } from "../components/Exercise.tsx";
import { TypeCrumb } from "../components/TypeCrumb.tsx";
import { Stars } from "../components/Stars.tsx";
import { Tada } from "../components/Tada.tsx";
import { t } from "../i18n/index.ts";
import type { Outcome, SessionMode } from "../practice.ts";
import { me } from "../session.ts";
import { displayName } from "../social.ts";
import { useLang } from "./lang.ts";

/** `seen`: ids of the units the learner has already finished, which study-first doesn't show again. */
type Deck = { title: string; units: ServedUnit[]; start: number; lessonId: string | null; seen: string[] };

async function loadDeck(mode: SessionMode, lang: Language, lessonId: string | undefined, level: string | undefined): Promise<Deck> {
  if (mode === "test") {
    const { units } = await api.get<LevelTestOut>(`/api/level-test?lang=${lang}&level=${encodeURIComponent(level!)}`);
    return { title: t("test.title", { level: level! }), units, start: 0, lessonId: null, seen: [] };
  }
  if (mode === "review") return { title: t("practice.review"), units: (await api.get<ReviewOut>(`/api/review?lang=${lang}`)).units, start: 0, lessonId: null, seen: [] };
  if (mode === "mistakes") {
    const units = (await api.get<MistakeEntry[]>(`/api/mistakes?lang=${lang}`)).map((m) => m.unit);
    return { title: t("practice.mistakes"), units, start: 0, lessonId: null, seen: [] };
  }
  const lesson = await api.get<LessonOut>(`/api/lessons/${encodeURIComponent(lessonId!)}?lang=${lang}`);
  if (!lesson.playable) throw new Error(t("practice.locked", { title: lesson.title }));
  if (mode === "master") {
    if (!lesson.stars) throw new Error(t("practice.masterNeedsLesson", { title: lesson.title }));
    const wait = Date.parse(lesson.stars.practicedAt) + MASTER_WAIT_MS - Date.now();
    if (wait > 0) throw new Error(t("practice.masterWait", { title: lesson.title, hours: Math.ceil(wait / 3_600_000) }));
    const units = lesson.units.filter((u) => u.stage === "sentence");
    return { title: t("practice.masterTitle", { title: lesson.title }), units, start: 0, lessonId: lesson.id, seen: [] };
  }
  const path = me()!.prefs[lang].path;
  const units = lesson.units.filter((u) => (PATHS[path] as readonly string[]).includes(u.stage));
  const next = lesson.progress[path]?.nextIndex ?? 0;
  return { title: lesson.title, units, start: next < units.length ? next : 0, lessonId: lesson.id, seen: lesson.seen };
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

/** The stars the run just ended earned, once its last attempt is saved, and how to earn more. */
function EarnedStars(props: { saves: Promise<unknown>[] }) {
  const [stars] = createResource(async () => {
    const last = (await Promise.allSettled(props.saves)).at(-1);
    return last?.status === "fulfilled" ? (last.value as AttemptOut).stars : null;
  });
  return (
    <Show when={stars()}>
      {(s) => (
        <div class="qa-earned d-flex flex-column gap-1">
          <div class="d-flex align-items-center gap-2">
            <Stars n={s().earned} class="fs-3" />
            <span>{t("stars.earned", { n: s().earned })}</span>
          </div>
          <Show when={s().best > s().earned}><div class="qa-earned-best small">{t("stars.best", { n: s().best })}</div></Show>
          <Show when={s().best < 3}><div class="qa-stars-how small text-body-secondary">{t("stars.how", { hours: MASTER_WAIT_MS / 3_600_000 })}</div></Show>
        </div>
      )}
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
        <Tada />
        <h2 class="qa-test-passed h5">{t("test.passed", { level: props.level })}</h2>
        <p class="mb-0">{t("test.passedBody", { level: props.level })}</p>
        <Show when={saved.error}>{(e) => <div class="alert alert-danger mb-0">{t("exercise.saveFailed", { error: (e() as Error).message })}</div>}</Show>
      </Show>
      <div class="d-flex gap-2">
        <A href={`/${props.lang}/type`} class="qa-back btn btn-primary" ref={(el) => queueMicrotask(() => el.focus())}>{t("practice.back")}</A>
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
  /** Master takes just the sentences, with no help of any kind. */
  const prefs = (): Prefs => props.mode === "master"
    ? { ...me()!.prefs[props.lang], path: "sentences", hints: "none", studyFirst: false }
    : me()!.prefs[props.lang];
  const seen = new Set(props.deck.seen);
  /** Any item not clean; a level test ends there. */
  const missed = () => Object.values(tally()).reduce((a, b) => a + b) > tally().clean;

  return (
    <div class="d-flex flex-column gap-3">
      <Show when={props.mode === "review"}><TypeCrumb lang={props.lang} /></Show>
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
              <Tada />
            </Show>
            <h2 class="h5">{props.deck.units.length === 0 ? t("practice.nothing") : t("practice.done")}</h2>
            <Show when={props.deck.units.length > 0}>
              <p class="mb-0">{t("practice.tally", tally())}</p>
            </Show>
            <Show when={props.deck.units.length > 0 && props.deck.lessonId} keyed>
              {(id) => (
                <>
                  <EarnedStars saves={saves} />
                  <Comparison lessonId={id} saves={saves} />
                </>
              )}
            </Show>
            <div class="d-flex gap-2">
              {/* Focused so Enter goes straight back. */}
              <A href={`/${props.lang}/type`} class="qa-back btn btn-primary" ref={(el) => queueMicrotask(() => el.focus())}>{t("practice.back")}</A>
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
            study={props.mode === "learn" && prefs().studyFirst && !seen.has(unit.id)}
            onFinished={(o, saved) => {
              seen.add(unit.id);
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
