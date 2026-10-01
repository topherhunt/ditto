import { A } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { QUIZ_GRADUATE_SHARE, type QuizHomeOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { ActivityHeader } from "../components/ActivityHeader.tsx";
import { dayKey, deckName, Donut, Sparkline } from "../components/QuizCharts.tsx";
import { TestOutButton } from "../components/TestOutButton.tsx";
import { languageInSentence, t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";

const SPARK_DAYS = 14;

export function QuizHome() {
  const lang = useLang();
  const [home] = createResource(lang, (l) => api.get<QuizHomeOut>(`/api/quiz?lang=${l}`));
  /** Level -> folded, for ones the learner opened or closed by hand; the rest fold when passed or locked. */
  const [toggled, setToggled] = createSignal<Record<string, boolean>>({});

  return (
    <Show when={home()}>
      {(h) => {
        /** Deck id -> answers on each of the last 14 local days, oldest first. */
        const counts = () => {
          const days = Array.from({ length: SPARK_DAYS }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (SPARK_DAYS - 1 - i));
            return dayKey(d);
          });
          const out = new Map(h().decks.map((d) => [d.id, days.map(() => 0)]));
          for (const a of h().activity) {
            const i = days.indexOf(dayKey(new Date(a.at)));
            if (i >= 0) out.get(a.deckId)![i] += a.answered;
          }
          return out;
        };
        const peak = () => Math.max(0, ...[...counts().values()].flat());
        return (
          <div class="d-flex flex-column gap-4">
            <ActivityHeader activity="quiz" lang={lang()} fresh={h().activity.length === 0} />
            <For each={h().levels} fallback={<p class="qa-quiz-none text-body-secondary">{t("quiz.none", { language: languageInSentence(lang()) })}</p>}>
              {(l, i) => {
                const folded = () => toggled()[l.level] ?? (l.passed !== null || !l.unlocked);
                const decks = () => h().decks.filter((d) => d.level === l.level);
                return (
                  <section class={`qa-quiz-level qa-quiz-level-${l.level.replace("+", "plus")} d-flex flex-column gap-2`} classList={{ "qa-quiz-level-folded": folded() }}>
                    <div class="d-flex flex-wrap align-items-center gap-2">
                      <h2 class="h4 mb-0">
                        <button type="button" class="qa-quiz-level-toggle btn btn-link p-0 fs-4 fw-medium text-reset text-decoration-none" aria-expanded={!folded()}
                          onClick={() => setToggled((m) => ({ ...m, [l.level]: !folded() }))}>
                          <span aria-hidden="true" class="small">{folded() ? "▸" : "▾"}</span> {l.level}
                        </button>
                      </h2>
                      <Show when={l.passed}>
                        {(how) => <span class="qa-quiz-level-passed badge text-bg-success">{t(how() === "test" ? "quiz.passedTest" : "quiz.passedProgress")}</span>}
                      </Show>
                      <Show when={!l.unlocked}>
                        <span class="qa-quiz-level-locked badge text-bg-secondary"><i class="bi bi-lock-fill me-1" aria-hidden="true" />{t("quiz.locked")}</span>
                      </Show>
                      <Show when={l.passed === null}>
                        <TestOutButton kind="quiz" href={`/${lang()}/quiz/test/${encodeURIComponent(l.level)}`} level={l.level} label={t("quiz.testOut")} class="qa-quiz-level-test btn-sm ms-auto" />
                      </Show>
                    </div>
                    <Show when={l.unlocked && l.passed === null}>
                      <div class="qa-quiz-level-progress small text-body-secondary">
                        {t("quiz.levelProgress", { pct: Math.floor((100 * l.graduated) / l.total), goal: QUIZ_GRADUATE_SHARE * 100 })}
                      </div>
                    </Show>
                    <Show when={!l.unlocked && !folded()}>
                      <div class="small text-body-secondary">{t("quiz.lockedHint", { level: h().levels[i() - 1].level })}</div>
                    </Show>
                    <Show when={!folded()}>
                      <div class="list-group">
                        <For each={decks()}>
                          {(deck) => (
                            <A href={`/${lang()}/quiz/${deck.id}`} class={`qa-quiz-deck qa-quiz-deck-${deck.id} list-group-item list-group-item-action d-flex align-items-center gap-3`}
                              classList={{ "disabled opacity-50": !l.unlocked }} aria-disabled={!l.unlocked}>
                              <div class="me-auto">
                                <div class="fw-medium">{deckName(deck)}</div>
                                <div class="small text-body-secondary">
                                  {t("quiz.questions", { n: deck.total })}
                                  <Show when={deck.due}> · <span class="qa-quiz-deck-due text-danger">{t("quiz.dueN", { n: deck.due })}</span></Show>
                                  <Show when={deck.fresh < deck.total}> · {t("quiz.freshN", { n: deck.fresh })}</Show>
                                </div>
                              </div>
                              <Sparkline counts={counts().get(deck.id)!} peak={peak()} />
                              <Donut mastery={deck.mastery} total={deck.total} size={44} />
                            </A>
                          )}
                        </For>
                      </div>
                    </Show>
                  </section>
                );
              }}
            </For>
          </div>
        );
      }}
    </Show>
  );
}
