import { A, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, Show } from "solid-js";
import type { QuizTestOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { Tada } from "../components/Tada.tsx";
import { t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";
import { useSpeak } from "./QuizDeck.tsx";
import { QuestionCard, shuffle } from "./QuizStudy.tsx";

/** A level test-out: the first miss ends it; all right records the pass. Answers touch no cards. */
export function QuizTest() {
  const lang = useLang();
  const params = useParams();
  const [test, { refetch }] = createResource(() => [lang(), params.level!] as const,
    ([l, level]) => api.get<QuizTestOut>(`/api/quiz/test?lang=${l}&level=${encodeURIComponent(level)}`));
  return (
    <Show when={test()} keyed>
      {(x) => <TestRun test={x} level={params.level!} onRetry={refetch} />}
    </Show>
  );
}

function TestRun(props: { test: QuizTestOut; level: string; onRetry: () => void }) {
  const lang = useLang();
  const speak = useSpeak();
  const [index, setIndex] = createSignal(0);
  const [chosen, setChosen] = createSignal<string | null>(null);
  const [done, setDone] = createSignal(false);
  const total = () => props.test.questions.length;
  const q = () => props.test.questions[index()];
  const missed = () => chosen() !== null && chosen() !== q().correct;
  const options = createMemo(() => shuffle([q().correct, ...q().wrong]));
  const passed = () => done() && !missed();
  const [saved] = createResource(() => passed() || undefined,
    () => api.post("/api/quiz/test/pass", { language: lang(), level: props.level }));
  const next = () => {
    if (missed() || index() + 1 === total()) setDone(true);
    else {
      setChosen(null);
      setIndex(index() + 1);
    }
  };
  const Back = () => <A href={`/${lang()}/quiz`} class="qa-quiz-test-back btn btn-outline-secondary">{t("quiz.allDecks")}</A>;

  return (
    <div class="qa-quiz-test d-flex flex-column gap-3">
      <div class="d-flex align-items-center gap-2">
        <h1 class="h4 mb-0 me-auto">{t("quiz.testTitle", { level: props.level })}</h1>
        <span class="qa-quiz-counter small text-body-secondary">{index() + 1} / {total()}</span>
      </div>
      <Show when={!done()} fallback={
        <div class="qa-quiz-test-result card"><div class="card-body d-flex flex-column gap-2">
          <Show when={passed()} fallback={
            <>
              <h2 class="qa-quiz-test-failed h5">{t("test.failed")}</h2>
              <p class="mb-0">{t("quiz.testFailedBody", { right: index(), total: total() })}</p>
              <div class="d-flex gap-2">
                <button type="button" class="qa-quiz-test-retry btn btn-primary" onClick={() => props.onRetry()}>{t("quiz.testRetry")}</button>
                <Back />
              </div>
            </>
          }>
            <Tada />
            <h2 class="qa-quiz-test-passed h5 text-center">{t("quiz.testPassed", { level: props.level })}</h2>
            <p class="text-center mb-0">{props.test.next ? t("quiz.nextUnlocked", { next: props.test.next }) : t("quiz.lastLevel")}</p>
            <Show when={saved.error}>{(e) => <div class="alert alert-danger mb-0">{t("exercise.saveFailed", { error: (e() as Error).message })}</div>}</Show>
            <Back />
          </Show>
        </div></div>
      }>
        <p class="small text-body-secondary mb-0">{t("quiz.testIntro", { n: total(), level: props.level })}</p>
        <QuestionCard q={q()} deckId={q().deckId} speak={speak()} options={options()} chosen={chosen()} onChoose={(o) => chosen() === null && setChosen(o)} />
        <Show when={chosen() !== null}>
          <button type="button" class="qa-quiz-continue btn btn-primary" onClick={next}>
            {t(missed() || index() + 1 === total() ? "quiz.seeResult" : "quiz.next")}
          </button>
        </Show>
      </Show>
    </div>
  );
}
