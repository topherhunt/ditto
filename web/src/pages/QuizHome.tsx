import { A } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import { QUIZ_LEVELS, type QuizHomeOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { dayKey, deckName, Donut, Sparkline } from "../components/QuizCharts.tsx";
import { languageName, t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";

const SPARK_DAYS = 14;

export function QuizHome() {
  const lang = useLang();
  const [home] = createResource(lang, (l) => api.get<QuizHomeOut>(`/api/quiz?lang=${l}`));

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
        const levels = () => QUIZ_LEVELS.map((level) => [level, h().decks.filter((d) => d.level === level)] as const).filter(([, decks]) => decks.length);
        return (
          <div class="d-flex flex-column gap-4">
            <div>
              <h1 class="h3">{t("quiz.title", { language: languageName(lang()) })}</h1>
              <p class="text-body-secondary mb-0">{t("quiz.intro")}</p>
            </div>
            <For each={levels()} fallback={<p class="qa-quiz-none text-body-secondary">{t("quiz.none", { language: languageName(lang()) })}</p>}>
              {([level, decks]) => (
                <section class="qa-quiz-level d-flex flex-column gap-2">
                  <h2 class="h4 mb-0">{level}</h2>
                  <div class="list-group">
                    <For each={decks}>
                      {(deck) => (
                        <A href={`/${lang()}/quiz/${deck.id}`} class={`qa-quiz-deck qa-quiz-deck-${deck.id} list-group-item list-group-item-action d-flex align-items-center gap-3`}>
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
                </section>
              )}
            </For>
          </div>
        );
      }}
    </Show>
  );
}
