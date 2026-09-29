import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import type { QuizQuestionOut, QuizRating, QuizSessionOut, QuizSessionStartOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { deckName, SessionSummary } from "../components/QuizCharts.tsx";
import { t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";
import { Say, useDeck, useSpeak } from "./QuizDeck.tsx";

const shuffle = <T,>(xs: T[]) => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export function QuizStudy() {
  const lang = useLang();
  const params = useParams();
  const navigate = useNavigate();
  const detail = useDeck();
  const speak = useSpeak();
  const [start] = createResource(() => [params.deckId, params.mode] as const,
    ([id, mode]) => api.post<QuizSessionStartOut>(`/api/quiz/decks/${id}/sessions`, { mode }));
  /** Missed question ids, asked again after the queue. */
  const [missed, setMissed] = createSignal<string[]>([]);
  const queue = () => [...start()!.queue, ...missed()];
  const [index, setIndex] = createSignal(0);
  const [results, setResults] = createSignal<boolean[]>([]);
  const [chosen, setChosen] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [finished, setFinished] = createSignal<number | null>(null);
  const [summary] = createResource(finished, (id) => api.get<QuizSessionOut>(`/api/quiz/sessions/${id}`));
  let shownAt = performance.now();

  const ready = () => detail() && start() ? { d: detail()!, s: start()! } : undefined;
  const current = createMemo((): QuizQuestionOut | undefined => {
    const r = ready();
    if (!r) return undefined;
    const id = queue()[index()];
    return id === undefined ? undefined : r.d.questions.find((q) => q.id === id)!;
  });
  /** Reshuffled per position, since a missed question can come straight back. */
  const options = createMemo(() => {
    index();
    const q = current();
    shownAt = performance.now();
    return q ? shuffle([q.correct, ...q.wrong]) : [];
  });
  const deckHref = () => `/${lang()}/quiz/${params.deckId}`;

  const answer = async (rating: QuizRating) => {
    setBusy(true);
    await api.post(`/api/quiz/sessions/${start()!.sessionId}/answers`, { questionId: current()!.id, rating, responseMs: Math.round(performance.now() - shownAt) });
    setBusy(false);
  };
  const choose = async (option: string) => {
    if (chosen() !== null) return;
    setChosen(option);
    const right = option === current()!.correct;
    setResults((rs) => [...rs, right]);
    if (!right) {
      setMissed((m) => [...m, current()!.id]);
      await answer("again");
    }
  };
  const next = () => {
    setChosen(null);
    if (index() + 1 < queue().length) setIndex(index() + 1);
    else finish();
  };
  const rate = async (rating: QuizRating) => {
    await answer(rating);
    next();
  };
  const finish = () => {
    if (results().length) setFinished(start()!.sessionId);
    else navigate(deckHref());
  };

  return (
    <Show when={ready()}>
      {(r) => (
        <Show when={finished() === null} fallback={
          <Show when={summary()}>
            {(s) => (
              <div class="qa-quiz-session-summary d-flex flex-column gap-3">
                <h1 class="h3 text-center mb-0">{t("quiz.summary")}</h1>
                <SessionSummary s={s()} />
                <A href={deckHref()} class="qa-quiz-back-to-deck btn btn-primary">{t("quiz.backToDeck")}</A>
              </div>
            )}
          </Show>
        }>
          <Show when={current()}>
            {(q) => {
              const say = (field: string) => <Say on={speak()} deckId={r().d.deck.id} questionId={q().id} field={field} />;
              const right = () => chosen() === q().correct;
              return (
                <div class="qa-quiz-study d-flex flex-column gap-3">
                  <div class="d-flex align-items-center gap-2">
                    <button type="button" class="qa-quiz-finish btn btn-link p-0 small text-decoration-none me-auto" disabled={busy()} onClick={finish}>← {deckName(r().d.deck)}</button>
                    <span class="qa-quiz-counter small text-body-secondary">
                      {t("quiz.answered")}: {results().length} · {t("quiz.remaining")}: {queue().length - index()}
                    </span>
                  </div>
                  <div class="d-flex flex-wrap gap-1" aria-hidden="true">
                    <For each={results()}>{(ok) => <span class={`rounded-circle ${ok ? "bg-success" : "bg-danger"}`} style={{ width: "0.5rem", height: "0.5rem" }} />}</For>
                  </div>
                  <p class="qa-quiz-question fs-5 mb-0" dir="auto">{q().question}{say("question")}</p>
                  <div class="d-flex flex-column gap-2">
                    <For each={options()}>
                      {(option) => {
                        const field = () => (option === q().correct ? "correct" : `wrong${q().wrong.indexOf(option)}`);
                        const style = () => {
                          if (chosen() === null) return "btn-outline-secondary";
                          if (option === q().correct) return right() ? "btn-success" : "btn-outline-success";
                          return option === chosen() ? "btn-danger" : "btn-outline-secondary opacity-50";
                        };
                        return (
                          <div class="d-flex align-items-center gap-2">
                            <button type="button" class={`qa-quiz-option btn ${style()} flex-grow-1 text-start`} classList={{ "qa-quiz-option-correct": option === q().correct, "pe-none": chosen() !== null }}
                              dir="auto" onClick={() => void choose(option)}>{option}</button>
                            {say(field())}
                          </div>
                        );
                      }}
                    </For>
                  </div>
                  <Show when={chosen() !== null}>
                    <div class="qa-quiz-feedback card"><div class="card-body">
                      <p class={`fw-bold ${right() ? "text-success qa-quiz-right" : "text-danger qa-quiz-missed"}`}>{t(right() ? "quiz.correct" : "quiz.wrong")}</p>
                      <p class="mb-0" dir="auto">{q().explanation}{say("explanation")}</p>
                    </div></div>
                    <Show when={right()} fallback={
                      <button type="button" class="qa-quiz-continue btn btn-secondary" disabled={busy()} onClick={next}>{t("quiz.next")}</button>
                    }>
                      <div class="d-flex gap-2" role="group" aria-label={t("quiz.rate")}>
                        <button type="button" class="qa-quiz-rate-hard btn btn-warning flex-fill" disabled={busy()} onClick={() => void rate("hard")}>{t("quiz.rating.hard")}</button>
                        <button type="button" class="qa-quiz-rate-good btn btn-primary flex-fill" disabled={busy()} onClick={() => void rate("good")}>{t("quiz.rating.good")}</button>
                        <button type="button" class="qa-quiz-rate-easy btn btn-success flex-fill" disabled={busy()} onClick={() => void rate("easy")}>{t("quiz.rating.easy")}</button>
                      </div>
                    </Show>
                  </Show>
                </div>
              );
            }}
          </Show>
        </Show>
      )}
    </Show>
  );
}
