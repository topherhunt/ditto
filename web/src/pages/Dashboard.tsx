import { A, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { LEARNER_LEVELS, QUIZ_GRADUATE_SHARE, SPEAK_LANGUAGES, type ActivityOut, type Catalog, type Config, type ConversationsOut, type QuizHomeOut } from "../../../shared/api.ts";
import type { Language } from "../../../shared/content.ts";
import { api } from "../api.ts";
import { LevelPicker } from "../components/LevelPicker.tsx";
import { TestOutButton } from "../components/TestOutButton.tsx";
import { dayKey, deckName } from "../components/QuizCharts.tsx";
import { lessonDone, levelDone, levels, nextLesson } from "../curriculum.ts";
import { languageName, locale, t } from "../i18n/index.ts";
import { isIosSafari, isStandalone } from "../install.ts";
import { LANGUAGE_FLAGS, learnable, rememberLanguage, saveLevel } from "../learning.ts";
import { me, refetchMe } from "../session.ts";
import { useLang } from "./lang.ts";

const CALENDAR_WEEKS = 5;
type Counts = { type: number; talk: number; quiz: number };
const itemsOf = (c: Counts | undefined) => (c ? c.type + c.talk + c.quiz : 0);
/** One level of a ladder: `pct` is the way to it, meaningful only for the level after the highest achieved one. */
type Rung = { level: string; achieved: boolean; pct: number };
/** `icon`: a card button's Bootstrap icon, a play arrow unless set. */
type Go = { href: string; label: string; icon?: string };
type Tip = { qa: string; text: string; go?: Go };

/** A course's home: what to do next, how the learner has been doing, and the ways to practice. */
export function Dashboard() {
  const lang = useLang();
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const talkOn = () => config()!.speak && (SPEAK_LANGUAGES as readonly string[]).includes(lang());
  const quizOn = () => config()!.quiz.includes(lang());
  const [catalog] = createResource(lang, (l) => api.get<Catalog>(`/api/catalog?lang=${l}`));
  const [activity] = createResource(lang, (l) => api.get<ActivityOut>(`/api/activity?lang=${l}`));
  const [quiz] = createResource(() => config() && quizOn() && lang(), (l) => api.get<QuizHomeOut>(`/api/quiz?lang=${l}`));
  const [talk] = createResource(() => config() && talkOn() && lang(), (l) => api.get<ConversationsOut>(`/api/conversations?lang=${l}`));
  const ready = () => config() && catalog() && activity() && (!quizOn() || quiz()) && (!talkOn() || talk());
  const level = () => me()!.prefs[lang()].level;
  const [levelError, setLevelError] = createSignal<string | null>(null);
  const [rerating, setRerating] = createSignal(false);

  /** Items per local day: the server counts per UTC hour so the day boundary is the learner's own. */
  const byDay = () => {
    const days = new Map<string, Counts>();
    for (const h of activity()!.hours) {
      const key = dayKey(new Date(`${h.hour}:00:00Z`));
      const c = days.get(key) ?? { type: 0, talk: 0, quiz: 0 };
      c.type += h.type;
      c.talk += h.talk;
      c.quiz += h.quiz;
      days.set(key, c);
    }
    return days;
  };

  /** The one thing to do next: a first lesson, then due reviews, then each activity not yet done today. */
  const tip = (): Tip => {
    const cat = catalog()!;
    const next = nextLesson(cat);
    const today = byDay().get(dayKey(new Date()));
    const lesson = next && { href: `/${lang()}/type/lesson/${next.id}`, label: t("home.start") };
    if (next && Object.keys(cat.progress).length === 0) return { qa: "first", text: t("dash.coach.first", { title: next.title }), go: lesson! };
    if (cat.reviewCount > 0) return { qa: "review", text: t("dash.coach.review", { n: cat.reviewCount }), go: { href: `/${lang()}/type/review`, label: t("home.review") } };
    if (next && !today?.type) return { qa: "lesson", text: t("dash.coach.lesson", { title: next.title }), go: { ...lesson!, label: t("home.continue") } };
    if (talkOn() && !today?.talk) return { qa: "talk", text: t("dash.coach.talk"), go: { href: `/${lang()}/talk`, label: t("activity.talk") } };
    if (quizOn() && !today?.quiz) return { qa: "quiz", text: t("dash.coach.quiz"), go: { href: `/${lang()}/quiz`, label: t("activity.quiz") } };
    return { qa: "done", text: t("dash.coach.done") };
  };

  const typeLadder = (): Rung[] => levels(catalog()!).map(([l, courses]) => {
    const main = courses.filter((c) => c.track === "main").flatMap((c) => c.lessons);
    const done = main.filter((x) => lessonDone(catalog()!, x.id)).length;
    return { level: l, achieved: catalog()!.passedLevels.includes(l) || levelDone(catalog()!, courses), pct: main.length ? Math.floor((100 * done) / main.length) : 0 };
  });
  const quizLadder = (): Rung[] => quiz()!.levels.map((l) => ({
    level: l.level, achieved: l.passed !== null, pct: Math.min(100, Math.floor((100 * l.graduated) / (l.total * QUIZ_GRADUATE_SHARE))),
  }));
  /** The lowest typing level below the learner's own rating that they haven't finished or tested out of. */
  const testOut = () => {
    const self = level();
    if (!self) return null;
    const rank = (l: string) => (LEARNER_LEVELS as readonly string[]).indexOf(l);
    return typeLadder().find((r) => !r.achieved && rank(r.level) >= 0 && rank(r.level) < rank(self)) ?? null;
  };

  const lessonsDone = () => catalog()!.courses.flatMap((c) => c.lessons).filter((l) => lessonDone(catalog()!, l.id)).length;
  const lessonsTotal = () => catalog()!.courses.reduce((n, c) => n + c.lessons.length, 0);
  const quizCount = (k: "graduated" | "total") => quiz()!.levels.reduce((n, l) => n + l[k], 0);

  /** Each card's way in: the specific next thing in that activity, else its page. */
  const typeGo = (): Go => {
    const next = nextLesson(catalog()!);
    if (!next) return { href: `/${lang()}/type`, label: t("dash.go.lessonsDone"), icon: "bi-list-ul" };
    const started = next.id in catalog()!.progress;
    return { href: `/${lang()}/type/lesson/${next.id}`, label: t(started ? "dash.go.lessonContinue" : "dash.go.lessonStart", { title: next.title }) };
  };
  /** A new topic, not the last conversation: the talk page picks topics and lists past conversations. */
  const talkGo = (): Go => ({ href: `/${lang()}/talk`, label: t(talk()!.conversations.length ? "dash.go.talkNew" : "dash.go.talkFirst") });
  /** The lowest unfinished level's first deck with questions due, else with new ones. */
  const quizGo = (): Go => {
    const level = quiz()!.levels.find((l) => l.unlocked && l.passed === null);
    const decks = quiz()!.decks.filter((d) => d.level === level?.level);
    const deck = decks.find((d) => d.due > 0) ?? decks.find((d) => d.fresh > 0);
    return deck
      ? { href: `/${lang()}/quiz/${deck.id}`, label: t("dash.go.quizDeck", { deck: deckName(deck) }) }
      : { href: `/${lang()}/quiz`, label: t("dash.go.quizAll"), icon: "bi-list-ul" };
  };

  return (
    <Show when={ready()}>
      <div class="qa-dashboard d-flex flex-column gap-4">
        <Show when={!me()!.installHintDismissed && isIosSafari() && !isStandalone()}><InstallHint /></Show>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <LanguageSwitcher lang={lang()} />
        </div>

        <Show when={level() && !rerating()} fallback={
          <div class="qa-dash-level-question card border-primary">
            <div class="card-body">
              <p>{t("dash.levelIntro")}</p>
              <LevelPicker lang={lang()} chosen={level()} onChoose={(l) => {
                setLevelError(null);
                saveLevel(lang(), l).then(() => setRerating(false), (e: Error) => setLevelError(e.message));
              }} />
              <Show when={levelError()}>{(m) => <div class="text-danger small mt-2">{m()}</div>}</Show>
            </div>
          </div>
        }>
          <div class="qa-dash-coach card border-success">
            <div class="card-body d-flex flex-column gap-3">
              <div class="coach-grid">
                <div class="coach-text d-flex align-items-start gap-3">
                  <span class="fs-2 flex-shrink-0" aria-hidden="true">🧭</span>
                  <div>
                    <div class="small text-body-secondary">{t("dash.coach.heading")}</div>
                    <div class={`qa-dash-coach-${tip().qa} fw-semibold`}>{tip().text}</div>
                  </div>
                </div>
                <Show when={tip().go}>{(go) => <A href={go().href} class="qa-dash-coach-go coach-go btn btn-success">{go().label}</A>}</Show>
                <div class="coach-level small text-end">
                  <span class="text-body-secondary">{t("dash.yourLevel", { level: level()! })}</span>{" "}
                  <button type="button" class="qa-dash-level-change btn btn-link btn-sm p-0 align-baseline" onClick={() => setRerating(true)}>{t("dash.levelChange")}</button>
                </div>
              </div>
              <Show when={testOut()}>
                {(r) => (
                  <div class="qa-dash-testout border-top pt-3 d-flex flex-wrap align-items-center gap-2">
                    <span class="small me-auto">{t("dash.testOut", { self: level()!, level: r().level })}</span>
                    <TestOutButton kind="type" href={`/${lang()}/type/test/${r().level}`} level={r().level} label={t("home.testOut", { level: r().level })} class="qa-dash-testout-go btn-sm" />
                  </div>
                )}
              </Show>
            </div>
          </div>
        </Show>

        <section class="qa-dash-progress card">
          <div class="card-body row g-4">
            <div class="col-md-5">
              <h2 class="h6">{t("dash.practiceHeading")}</h2>
              <Calendar byDay={byDay()} />
              <Streak byDay={byDay()} />
            </div>
            <div class="col-md-7 d-flex flex-column gap-3">
              <h2 class="h6 mb-0">{t("dash.levelHeading")}</h2>
              <Ladder qa="type" label={t("activity.type")} rungs={typeLadder()} />
              <Show when={quizOn()}><Ladder qa="quiz" label={t("activity.quiz")} rungs={quizLadder()} /></Show>
            </div>
          </div>
        </section>

        <section>
          <h2 class="h5 mb-3">{t("dash.waysHeading")}</h2>
          <div class="row g-3">
            <Way qa="type" icon="bi-keyboard" body={t("welcome.type.body")} href={`/${lang()}/type`} go={typeGo()}
              stat={t("dash.stat.type", { done: lessonsDone(), total: lessonsTotal() })} />
            <Way qa="talk" icon="bi-mic" body={t("welcome.talk.body")} href={talkOn() ? `/${lang()}/talk` : undefined} go={talkOn() ? talkGo() : undefined}
              stat={talkOn() ? t("dash.stat.talk", { n: talk()!.conversations.length }) : undefined} />
            <Way qa="quiz" icon="bi-patch-question" body={t("quiz.intro")} href={quizOn() ? `/${lang()}/quiz` : undefined} go={quizOn() ? quizGo() : undefined}
              stat={quizOn() ? t("dash.stat.quiz", { done: quizCount("graduated"), total: quizCount("total") }) : undefined} />
          </div>
        </section>
      </div>
    </Show>
  );
}

/** Invites an iOS Safari learner to add Ditto to their home screen; closing it is remembered on their account. */
function InstallHint() {
  const [error, setError] = createSignal<string | null>(null);
  const dismiss = () => api.post("/api/install-hint/dismiss").then(refetchMe, (e: Error) => setError(e.message));
  return (
    <div class="qa-install-hint alert alert-info d-flex flex-wrap align-items-center gap-2 mb-0" role="alert">
      <span class="me-auto">{t("install.alert")}</span>
      <A href="/add-to-home" class="qa-install-hint-show btn btn-info btn-sm">{t("install.show")}</A>
      <button type="button" class="qa-install-hint-dismiss btn-close" aria-label={t("install.dismiss")} onClick={() => void dismiss()} />
      <Show when={error()}>{(m) => <div class="text-danger small w-100">{m()}</div>}</Show>
    </div>
  );
}

/** The dashboard's title, doubling as the course switcher: the current language's flag and name open a menu of the learner's courses, plus the others they could start; starting one adds it and opens its dashboard, which asks their level. */
function LanguageSwitcher(props: { lang: Language }) {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let root: HTMLDivElement | undefined;
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (root && !root.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener("click", closeOnOutsideClick);
  onCleanup(() => document.removeEventListener("click", closeOnOutsideClick));
  const learning = () => me()!.learning;
  const others = () => learnable(me()!.locale).filter((l) => !learning().includes(l));
  const go = (l: Language) => {
    rememberLanguage(l);
    setOpen(false);
    navigate(`/${l}`);
  };
  const add = async (l: Language) => {
    setError(null);
    try {
      await api.put("/api/learning", { languages: [...learning(), l] });
      await refetchMe();
      go(l);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const item = (l: Language, onClick: () => void) => (
    <li>
      <button type="button" class={`qa-dash-lang-${l} dropdown-item`} classList={{ active: l === props.lang }} onClick={onClick}>
        {LANGUAGE_FLAGS[l]} {languageName(l)}
      </button>
    </li>
  );
  return (
    <div class="dropdown me-auto" ref={root}>
      <h1 class="qa-dash-title h3 mb-0">
        <button type="button" class="qa-dash-lang btn btn-outline-primary dropdown-toggle" aria-expanded={open()} onClick={() => setOpen(!open())}
          style={{ "--bs-btn-color": "var(--bs-body-color)", "--bs-btn-font-size": "inherit", "--bs-btn-font-weight": "inherit" }}>
          {LANGUAGE_FLAGS[props.lang]} {languageName(props.lang)}
        </button>
      </h1>
      <ul class="dropdown-menu" classList={{ show: open() }} data-bs-popper="static">
        <For each={learning()}>{(l) => item(l, () => go(l))}</For>
        <Show when={others().length}>
          <li><hr class="dropdown-divider" /></li>
          <li><h6 class="dropdown-header">{t("dash.addLanguage")}</h6></li>
          <For each={others()}>{(l) => item(l, () => void add(l))}</For>
        </Show>
      </ul>
      <Show when={error()}>{(m) => <div class="text-danger small">{m()}</div>}</Show>
    </div>
  );
}

/** The last few weeks, Monday first, one square per day shaded by how much was practiced. */
function Calendar(props: { byDay: Map<string, Counts> }) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - 7 * (CALENDAR_WEEKS - 1));
  const days = Array.from({ length: CALENDAR_WEEKS * 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const weekday = new Intl.DateTimeFormat(locale(), { weekday: "narrow" });
  const shade = (n: number) => (n === 0 ? "bg-body-secondary" : `bg-success ${n < 10 ? "bg-opacity-25" : n < 30 ? "bg-opacity-50" : n < 60 ? "bg-opacity-75" : ""}`);
  return (
    <div class="qa-dash-calendar mb-2" style={{ display: "grid", "grid-template-columns": "repeat(7, 1fr)", gap: "3px", "max-width": "15rem" }}>
      <For each={days.slice(0, 7)}>{(d) => <div class="small text-body-secondary text-center">{weekday.format(d)}</div>}</For>
      <For each={days}>
        {(d) => {
          const key = dayKey(d);
          const n = itemsOf(props.byDay.get(key));
          return (
            <div class="ratio ratio-1x1">
              <div class={`qa-dash-day rounded-1 ${d > now ? "" : shade(n)}`} classList={{ "qa-dash-day-active": n > 0, "border border-2 border-primary": key === dayKey(now) }}
                data-day={key} title={d > now ? undefined : t("dash.dayItems", { date: d.toLocaleDateString(locale()), n })} />
            </div>
          );
        }}
      </For>
    </div>
  );
}

/** Consecutive days practiced up to today, or up to yesterday while today is still open. */
function Streak(props: { byDay: Map<string, Counts> }) {
  const streak = () => {
    const d = new Date();
    if (!itemsOf(props.byDay.get(dayKey(d)))) d.setDate(d.getDate() - 1);
    let n = 0;
    for (; itemsOf(props.byDay.get(dayKey(d))); d.setDate(d.getDate() - 1)) n++;
    return n;
  };
  const activeDays = () => Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return itemsOf(props.byDay.get(dayKey(d)));
  }).filter(Boolean).length;
  return (
    <div class="small">
      <div class="qa-dash-streak fw-semibold">{streak() ? t("dash.streak", { n: streak() }) : t("dash.streakNone")}</div>
      <div class="qa-dash-active-days text-body-secondary">{t("dash.activeDays", { n: activeDays() })}</div>
    </div>
  );
}

/** Levels as segments of one bar: achieved ones full, the next one filled as far as the learner has come. */
function Ladder(props: { qa: string; label: string; rungs: Rung[] }) {
  const top = () => props.rungs.findLastIndex((r) => r.achieved);
  const next = () => props.rungs[top() + 1] as Rung | undefined;
  const status = () => {
    const n = next();
    if (!n) return t("dash.level.all", { level: props.rungs[props.rungs.length - 1].level });
    if (top() < 0) return t("dash.level.toward", { pct: n.pct, next: n.level });
    return t("dash.level.reached", { level: props.rungs[top()].level, pct: n.pct, next: n.level });
  };
  return (
    <Show when={props.rungs.length}>
      <div class={`qa-dash-ladder qa-dash-ladder-${props.qa}`}>
        <div class="small text-body-secondary mb-1">{props.label}</div>
        <div class="d-flex gap-1">
          <For each={props.rungs}>
            {(r, i) => {
              const fill = () => (r.achieved ? 100 : i() === top() + 1 ? r.pct : 0);
              return (
                <div class="flex-fill">
                  <div class="progress" style={{ height: "0.5rem" }} role="progressbar" aria-label={r.level} aria-valuenow={fill()} aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar bg-success" style={{ width: `${fill()}%` }} />
                  </div>
                  <div class="small text-center mt-1" classList={{ "fw-semibold": i() === top() + 1, "text-success": r.achieved }}>
                    {r.achieved ? "✓ " : ""}{r.level}
                  </div>
                </div>
              );
            }}
          </For>
        </div>
        <div class={`qa-dash-ladder-status small mt-1`}>{status()}</div>
      </div>
    </Show>
  );
}

/**
 * One activity: what it is, how far the learner has come in it, and an invitation to its next step. `href` (the activity's page,
 * linked from the heading) and `go` are unset where the course lacks the activity.
 */
function Way(props: { qa: "type" | "talk" | "quiz"; icon: string; body: string; href?: string; go?: Go; stat?: string }) {
  const title = () => <><i class={`bi ${props.icon} me-2 text-primary`} aria-hidden="true" />{t(`activity.${props.qa}`)}</>;
  return (
    <div class="col-md-4">
      <div class={`qa-dash-way qa-dash-way-${props.qa} card h-100`} classList={{ "opacity-50": !props.href }}>
        <div class="card-body d-flex flex-column gap-2">
          <h3 class="h5 mb-0">
            <Show when={props.href} fallback={title()}>
              {(href) => <A href={href()} class={`qa-dash-way-link-${props.qa} link-body-emphasis text-decoration-none`}>{title()}</A>}
            </Show>
          </h3>
          <p class="small mb-0">{props.body}</p>
          <Show when={props.stat}>{(s) => <div class="qa-dash-way-stat small text-body-secondary">{s()}</div>}</Show>
          <div class="mt-auto pt-2 text-center">
            <Show when={props.go} fallback={<span class="small text-body-secondary">{t("dash.notYet")}</span>}>
              {(go) => <A href={go().href} class={`qa-dash-start-${props.qa} btn btn-primary`}>
                <i class={`bi ${go().icon ?? "bi-play-fill"} me-1`} aria-hidden="true" />{go().label}
              </A>}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
