import { A } from "@solidjs/router";
import { createResource, createSignal, For, type JSX, Show } from "solid-js";
import { SPEAK_LANGUAGES, type Config } from "../../../shared/api.ts";
import { LANGUAGES, LOCALES, type Language } from "../../../shared/content.ts";
import { grade } from "../../../shared/grader.ts";
import { api } from "../api.ts";
import { LearnPicker } from "../components/LearnPicker.tsx";
import { SignIn } from "../components/Login.tsx";
import { SentenceDiff } from "../components/WordDiff.tsx";
import type { Key } from "../i18n/en.ts";
import { languageName, locale, LOCALE_LABELS, setLocale, t } from "../i18n/index.ts";
import { homeLanguage, learnable, rememberLanguage, storedLanguage } from "../learning.ts";
import { me } from "../session.ts";
import { usd } from "../spend.ts";

/** Graded by the real grader, so it looks exactly like an exercise: a missing letter, an accent and an extra letter. */
const SAMPLE_TYPED = "vorei un caffe perr favore";
const SAMPLE_DIFF = grade({ mode: "free", text: SAMPLE_TYPED }, { language: "it", text: "Vorrei un caffè, per favore." });

const ALONG: Key[] = ["welcome.along.review", "welcome.along.notebook", "welcome.along.why", "welcome.along.words", "welcome.along.testOut", "welcome.along.friends"];
const HABITS: Key[] = ["welcome.habit.mistakes", "about.tipDaily", "about.tipHints", "about.tipAloud"];

const languageList = (ls: readonly Language[]) => new Intl.ListFormat(locale(), { type: "conjunction" }).format(ls.map(languageName));

/** The homepage. Signed out it shows on every route, so signing in keeps the visitor where they are, and opens by asking what they speak and want to learn. */
export function Welcome() {
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [picked, setPicked] = createSignal(storedLanguage());
  // A pick the chosen interface language has no translations for doesn't count.
  const learning = () => { const l = picked(); return l && learnable(locale()).includes(l) ? l : null; };
  let hero!: HTMLElement;

  return (
    <div class="qa-welcome d-flex flex-column gap-5">
      <section ref={hero} class="d-flex flex-column gap-4">
        <div class="text-center">
          <h1 class="display-4 fw-semibold mb-1"><i class="bi bi-chat-heart me-2" aria-hidden="true" />Ditto</h1>
          <p class="lead mb-0">{t("welcome.title")} <span class="tilt" aria-hidden="true">👂</span></p>
        </div>
        <Show when={me()} fallback={
          <div class="card shadow-sm mx-auto w-100" style={{ "max-width": "34rem" }}>
            <div class="card-body d-flex flex-column gap-4">
              <div>
                <h2 class="h6">{t("welcome.speakQ")}</h2>
                <div class="d-flex flex-wrap gap-2">
                  <For each={LOCALES}>
                    {(l) => (
                      <button type="button" class={`qa-welcome-speak-${l} btn btn-outline-primary`} classList={{ active: locale() === l }}
                        aria-pressed={locale() === l} onClick={() => setLocale(l)}>
                        {LOCALE_LABELS[l]}
                      </button>
                    )}
                  </For>
                </div>
              </div>
              <div>
                <h2 class="h6">{t("welcome.learnQ")}</h2>
                <LearnPicker locale={locale()} chosen={learning()} onChoose={(l) => { rememberLanguage(l); setPicked(l); }} />
              </div>
              <div>
                <h2 class="h6">
                  <Show when={learning()} fallback={t("welcome.signInReturning")}>
                    {(l) => t("welcome.signInToStart", { language: languageName(l()) })}
                  </Show>
                </h2>
                <Show when={config()}>{(c) => <SignIn config={c()} learning={learning()} />}</Show>
              </div>
            </div>
          </div>
        }>
          {(u) => (
            <div class="text-center">
              <p>{t("welcome.back", { name: u().username! })}</p>
              <A class="qa-welcome-continue btn btn-primary btn-lg" href={`/${homeLanguage(u().learning)}`}>
                {t("welcome.continue", { language: languageName(homeLanguage(u().learning)) })}
              </A>
            </div>
          )}
        </Show>
        <p class="lead text-center mb-0">{t("login.tagline")}</p>
      </section>

      <Show when={config()}>
        {(c) => (
          <>
            <section>
              <h2 class="h3 mb-3">{t("welcome.waysHeading")}</h2>
              <div class="row g-3">
                <Way qa="type" icon="bi-keyboard" title={t("welcome.type.title")} body={t("welcome.type.body")} languages={LANGUAGES}>
                  <div class="small">
                    <div class="d-flex align-items-center gap-2 mb-2">
                      <span class="badge text-bg-primary" aria-hidden="true">▶</span>
                      <span class="font-mono text-body-secondary">{SAMPLE_TYPED}</span>
                    </div>
                    <div class="qa-welcome-sample-diff mb-2"><SentenceDiff result={SAMPLE_DIFF} /></div>
                    <div class="text-body-secondary">{t("welcome.type.legend")}</div>
                  </div>
                </Way>
                <Show when={c().speak}>
                  <Way qa="talk" icon="bi-mic" title={t("welcome.talk.title")} body={t("welcome.talk.body")} languages={SPEAK_LANGUAGES}>
                    <div class="small d-flex flex-column gap-2">
                      <div class="p-2 rounded bg-body-secondary align-self-start">Ciao! Cosa prendi?</div>
                      <div class="p-2 rounded bg-primary-subtle align-self-end">Io vuole un cappuccino.</div>
                      <div class="p-2 rounded border border-warning-subtle">
                        {t("speak.goodTry")}
                        <div><span class="fw-semibold">{t("speak.sayThis")}:</span> Vorrei un cappuccino.</div>
                      </div>
                    </div>
                  </Way>
                </Show>
                <Show when={c().quiz.length > 0}>
                  <Way qa="quiz" icon="bi-patch-question" title={t("welcome.quiz.title")} body={t("quiz.intro")} languages={c().quiz}>
                    <div class="small d-flex flex-column gap-1">
                      <div class="mb-1">Ieri ___ al cinema con Luca.</div>
                      <div class="px-2 py-1 rounded border border-success bg-success-subtle">✓ sono andato</div>
                      <div class="px-2 py-1 rounded border">ho andato</div>
                      <div class="px-2 py-1 rounded border">andavo</div>
                    </div>
                  </Way>
                </Show>
              </div>
            </section>

            <section>
              <h2 class="h3 mb-3">{t("welcome.alongHeading")}</h2>
              <ul class="qa-welcome-along list-unstyled row g-2 mb-0">
                <For each={ALONG}>{(k) => <li class="col-md-6">{t(k)}</li>}</For>
              </ul>
            </section>

            <section class="qa-welcome-tips">
              <h2 class="h3 mb-3">{t("welcome.tipsHeading")}</h2>
              <div class="row g-4">
                <div class="col-md-6">
                  <h3 class="h6 text-body-secondary text-uppercase">⏱️ {t("welcome.sessionHeading")}</h3>
                  <ol class="d-flex flex-column gap-2 mb-0 ps-3">
                    <li>{t("welcome.step.review")}</li>
                    <li>{t("welcome.step.lesson")}</li>
                    <li>{t("welcome.step.use")}</li>
                  </ol>
                </div>
                <div class="col-md-6">
                  <h3 class="h6 text-body-secondary text-uppercase">{t("welcome.habitsHeading")}</h3>
                  <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
                    <For each={HABITS}>{(k) => <li>{t(k)}</li>}</For>
                  </ul>
                </div>
              </div>
            </section>

            <section class="qa-welcome-cost card">
              <div class="card-body">
                <h2 class="h3">{t("welcome.costHeading")}</h2>
                <p>{t("welcome.costIntro")}</p>
                <div class="row g-4">
                  <div class="col-md-6">
                    <h3 class="h6 text-body-secondary text-uppercase">✅ {t("welcome.alwaysFree")}</h3>
                    <ul class="mb-0">
                      <li>{t("cap.freeType")}</li>
                      <li>{t("welcome.freeNotebook")}</li>
                      <Show when={c().quiz.length > 0}><li>{t("welcome.freeQuiz")}</li></Show>
                      <li>{t("cap.freeSocial")}</li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <h3 class="qa-welcome-cap h6 text-body-secondary text-uppercase">✨ {t("welcome.credit", { cap: usd(c().dailySpendCap) })}</h3>
                    <ul>
                      <Show when={c().speak}><li>{t("welcome.creditTalk")}</li></Show>
                      <li>{t("welcome.creditWhy")}</li>
                      <Show when={c().quiz.length > 0}><li>{t("welcome.creditAudio")}</li></Show>
                    </ul>
                    <p class="small text-body-secondary mb-0">{t("welcome.creditBody", { cap: usd(c().dailySpendCap) })}</p>
                  </div>
                </div>
              </div>
            </section>

            <Show when={!me()}>
              <section class="text-center">
                <h2 class="h3">{t("welcome.ctaHeading")}</h2>
                <button type="button" class="qa-welcome-cta btn btn-success btn-lg mt-2" onClick={() => hero.scrollIntoView({ behavior: "smooth" })}>
                  {t("welcome.cta")}
                </button>
              </section>
            </Show>

            <p class="small text-body-secondary text-center mb-0">
              {t("about.madeBy", { name: "Topher Hunt" })} · <a class="link-secondary" href="https://github.com/topherhunt/ditto">{t("about.github")}</a>
              {" · "}<a class="link-secondary" href="https://abair.ie">{t("about.abairLink")}</a>
            </p>
          </>
        )}
      </Show>
    </div>
  );
}

/** One practice mode's card: what it is, a small sample of how it looks, and its languages. */
function Way(props: { qa: string; icon: string; title: string; body: string; languages: readonly Language[]; children: JSX.Element }) {
  return (
    <div class="col-md-4">
      <div class={`qa-welcome-way qa-welcome-way-${props.qa} card h-100`}>
        <div class="card-body d-flex flex-column gap-3">
          <h3 class="h5 mb-0"><i class={`bi ${props.icon} me-2 text-primary`} aria-hidden="true" />{props.title}</h3>
          <p class="small mb-0">{props.body}</p>
          <div class="p-2 rounded bg-body-tertiary mt-auto">{props.children}</div>
          <div class="small text-body-secondary">{t("welcome.availableIn", { languages: languageList(props.languages) })}</div>
        </div>
      </div>
    </div>
  );
}
