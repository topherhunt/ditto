import { A, useParams } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { QUIZ_MODES, type Config, type QuizDeckDetailOut, type QuizQuestionOut, type QuizSessionOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { PlayButton } from "../components/PlayButton.tsx";
import { deckName, MasteryBar, MasteryChart, ratingClass, SessionSummary } from "../components/QuizCharts.tsx";
import { locale, t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";
import { Loading } from "../components/Loading.tsx";
import { routes } from "../routes.ts";

export function useDeck() {
  const params = useParams();
  const [detail] = createResource(() => params.deckId, (id) => api.get<QuizDeckDetailOut>(`/api/quiz/decks/${id}`));
  return detail;
}

/** Whether question audio is on: it renders through the conversation partner's voice. */
export function useSpeak() {
  const [config] = createResource(() => api.get<Config>("/api/config"));
  return () => config()?.speak === true;
}

/** A play button for one field of a question, when audio is on. */
export function Say(props: { on: boolean; deckId: string; questionId: string; field: string }) {
  return (
    <Show when={props.on}>
      <PlayButton url={`/api/quiz/decks/${props.deckId}/say?question=${props.questionId}&field=${props.field}`} class={`qa-quiz-say-${props.field} p-0 ms-1 align-baseline`} />
    </Show>
  );
}

function Back(props: { href: string; label: string }) {
  return <A href={props.href} class="qa-quiz-back small text-decoration-none">← {props.label}</A>;
}

export function QuizDeck() {
  const lang = useLang();
  const detail = useDeck();
  return (
    <Show when={detail()} fallback={<Loading />}>
      {(d) => {
        const at = () => ({ lang: lang(), deckId: d().deck.id });
        return (
          <div class="qa-quiz-deck-home d-flex flex-column gap-3">
            <Back href={routes.quiz({ lang: lang() })} label={t("quiz.allDecks")} />
            <h1 class="h3 mb-0">{deckName(d().deck)}</h1>
            <div class="row text-center g-2">
              <Count n={d().deck.due} label={t("quiz.due")} qa="due" color="text-danger" />
              <Count n={d().deck.fresh} label={t("quiz.fresh")} qa="fresh" />
              <Count n={d().deck.total} label={t("quiz.total")} qa="total" />
            </div>
            <MasteryBar mastery={d().deck.mastery} total={d().deck.total} />
            <MasteryChart sessions={d().sessions} total={d().deck.total} />
            <Show when={d().deck.due === 0 && d().deck.fresh === 0}>
              <p class="qa-quiz-caught-up text-success text-center mb-0">{t("quiz.caughtUp")}</p>
            </Show>
            <A href={routes.quizStudy({ ...at(), mode: "spaced" })} class="qa-quiz-mode-spaced btn btn-success btn-lg">
              <div class="fw-bold">{t("quiz.mode.spaced")}</div>
              <div class="small">{t("quiz.mode.spacedDesc")}</div>
            </A>
            <h2 class="h6 text-body-secondary mb-0">{t("quiz.otherOptions")}</h2>
            <div class="list-group">
              <For each={QUIZ_MODES.filter((m) => m !== "spaced")}>
                {(mode) => (
                  <A href={routes.quizStudy({ ...at(), mode })} class={`qa-quiz-mode-${mode} list-group-item list-group-item-action`}>
                    <div class="fw-medium">{t(`quiz.mode.${mode}`)}</div>
                    <div class="small text-body-secondary">{t(`quiz.mode.${mode}Desc`)}</div>
                  </A>
                )}
              </For>
              <A href={routes.quizBrowse(at())} class="qa-quiz-browse list-group-item list-group-item-action">
                <div class="fw-medium">{t("quiz.browse")}</div>
                <div class="small text-body-secondary">{t("quiz.browseDesc")}</div>
              </A>
            </div>
            <A href={routes.quizStats(at())} class="qa-quiz-stats-link btn btn-outline-primary">{t("quiz.stats")}</A>
          </div>
        );
      }}
    </Show>
  );
}

function Count(props: { n: number; label: string; qa: string; color?: string }) {
  return (
    <div class="col">
      <div class={`qa-quiz-count-${props.qa} fs-3 fw-bold ${props.color ?? ""}`}>{props.n}</div>
      <div class="small text-body-secondary">{props.label}</div>
    </div>
  );
}

export function QuizBrowse() {
  const lang = useLang();
  const detail = useDeck();
  const speak = useSpeak();
  const [index, setIndex] = createSignal(0);
  return (
    <Show when={detail()} fallback={<Loading />}>
      {(d) => {
        const q = () => d().questions[index()];
        const say = (field: string) => <Say on={speak()} deckId={d().deck.id} questionId={q().id} field={field} />;
        return (
          <div class="qa-quiz-browse-page d-flex flex-column gap-3">
            <Back href={routes.quizDeck({ lang: lang(), deckId: d().deck.id })} label={deckName(d().deck)} />
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="qa-quiz-prev btn btn-outline-primary" disabled={index() === 0} onClick={() => setIndex(index() - 1)}>{t("quiz.previous")}</button>
              <span class="qa-quiz-position small text-body-secondary mx-auto">{index() + 1} / {d().questions.length}</span>
              <button type="button" class="qa-quiz-next btn btn-outline-primary" disabled={index() === d().questions.length - 1} onClick={() => setIndex(index() + 1)}>{t("quiz.next")}</button>
            </div>
            <p class="qa-quiz-question fs-5 mb-0" dir="auto">{q().question}{say("question")}</p>
            <div class="qa-quiz-correct alert alert-success mb-0 py-2" dir="auto">{q().correct}{say("correct")}</div>
            <For each={q().wrong}>
              {(w, i) => <div class="qa-quiz-wrong alert alert-danger mb-0 py-2 text-decoration-line-through" dir="auto">{w}{say(`wrong${i()}`)}</div>}
            </For>
            <p class="qa-quiz-explanation text-body-secondary" dir="auto">{q().explanation}{say("explanation")}</p>
          </div>
        );
      }}
    </Show>
  );
}

export function QuizStats() {
  const lang = useLang();
  const detail = useDeck();
  return (
    <Show when={detail()} fallback={<Loading />}>
      {(d) => (
        <div class="qa-quiz-stats d-flex flex-column gap-3">
          <Back href={routes.quizDeck({ lang: lang(), deckId: d().deck.id })} label={deckName(d().deck)} />
          <h1 class="h3 mb-0">{t("quiz.stats")}</h1>
          <MasteryBar mastery={d().deck.mastery} total={d().deck.total} />
          <MasteryChart sessions={d().sessions} total={d().deck.total} />
          <details>
            <summary class="small text-body-secondary">{t("quiz.questionDetail")}</summary>
            <div class="table-responsive">
              <table class="qa-quiz-question-table table table-sm small">
                <thead><tr><th>{t("quiz.col.question")}</th><th>{t("quiz.col.state")}</th><th>{t("quiz.col.stability")}</th><th>{t("quiz.col.next")}</th></tr></thead>
                <tbody><For each={d().questions}>{(q) => <QuestionRow q={q} />}</For></tbody>
              </table>
            </div>
          </details>
          <h2 class="h5 mb-0">{t("quiz.history")}</h2>
          <Show when={d().sessions.length} fallback={<p class="qa-quiz-no-sessions text-body-secondary">{t("quiz.noSessions")}</p>}>
            <div class="list-group">
              <For each={d().sessions}>
                {(s) => (
                  <A href={routes.quizSession({ lang: lang(), deckId: d().deck.id, sessionId: String(s.id) })} class="qa-quiz-session list-group-item list-group-item-action d-flex justify-content-between">
                    <span>{dateTime(s.startedAt)}</span>
                    <span class="text-body-secondary">{t("quiz.answeredN", { n: s.answered })}</span>
                  </A>
                )}
              </For>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}

function QuestionRow(props: { q: QuizQuestionOut }) {
  const days = (n: number) => t("quiz.days", { n });
  const stability = () => {
    const c = props.q.card;
    if (!c) return "--";
    return c.stability >= 1 ? days(Math.round(c.stability)) : `<${days(1)}`;
  };
  const next = () => {
    const c = props.q.card;
    if (!c) return "--";
    const n = Math.round((new Date(c.due).getTime() - Date.now()) / 86_400_000);
    return n <= 0 ? t("quiz.today") : days(n);
  };
  return (
    <tr>
      <td dir="auto">{props.q.title}</td>
      <td>{t(`quiz.state.${props.q.card?.mastery ?? "new"}`)}</td>
      <td>{stability()}</td>
      <td>{next()}</td>
    </tr>
  );
}

const dateTime = (iso: string) => new Date(iso).toLocaleString(locale(), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function QuizSession() {
  const lang = useLang();
  const params = useParams();
  const [session] = createResource(() => params.sessionId, (id) => api.get<QuizSessionOut>(`/api/quiz/sessions/${id}`));
  return (
    <Show when={session()} fallback={<Loading />}>
      {(s) => (
        <div class="qa-quiz-session-detail d-flex flex-column gap-3">
          <Back href={routes.quizStats({ lang: lang(), deckId: s().deckId })} label={t("quiz.stats")} />
          <div>
            <h1 class="h3 mb-0">{t("quiz.sessionDetail")}</h1>
            <p class="text-body-secondary mb-0">{dateTime(s().startedAt)}</p>
          </div>
          <SessionSummary s={s()} />
          <details>
            <summary class="small text-body-secondary">{t("quiz.questionDetail")}</summary>
            <div class="table-responsive">
              <table class="qa-quiz-answer-table table table-sm small">
                <thead><tr><th>{t("quiz.col.question")}</th><th>{t("quiz.col.rating")}</th><th>{t("quiz.summary.time")}</th></tr></thead>
                <tbody>
                  <For each={s().answers}>
                    {(a) => (
                      <tr>
                        <td dir="auto">{a.title}</td>
                        <td class={ratingClass(a.rating)}>{t(`quiz.rating.${a.rating}`)}</td>
                        <td>{(a.responseMs / 1000).toFixed(1)}s</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </Show>
  );
}
