import { A } from "@solidjs/router";
import { createResource, createSignal, For, type JSX, Show } from "solid-js";
import { SPEAK_LANGUAGES, type Config } from "../../../shared/api.ts";
import { LANGUAGES, LOCALES, type Language } from "../../../shared/content.ts";
import { grade } from "../../../shared/grader.ts";
import { api } from "../api.ts";
import { EmojiLine } from "../components/EmojiLine.tsx";
import { LearnPicker } from "../components/LearnPicker.tsx";
import { SignIn } from "../components/Login.tsx";
import { SentenceDiff } from "../components/WordDiff.tsx";
import type { Key } from "../i18n/en.ts";
import { languageInSentence, locale, LOCALE_LABELS, ownLocale, setImmersion, setLocale, t } from "../i18n/index.ts";
import { homeLanguage, learnable, rememberLanguage, storedLanguage } from "../learning.ts";
import { me } from "../session.ts";
import { usd } from "../spend.ts";

type Samples = {
  /** Graded by the real grader, so it looks exactly like an exercise: missing letters, an accent and an extra letter. */
  type: { typed: string; answer: string };
  talk?: { partner: string; learner: string; fix: string };
  quiz?: { prompt: string; right: string; wrong: [string, string] };
};

/** Each card shows the chosen course's sample, or Italian's when that course has none for the mode. */
const IT_SAMPLES: Required<Samples> = {
  type: { typed: "vorei un caffe perr favore", answer: "Vorrei un caffè, per favore." },
  talk: { partner: "Ciao! Cosa prendi?", learner: "Io vuole un cappuccino.", fix: "Vorrei un cappuccino." },
  quiz: { prompt: "Ieri ___ al cinema con Luca.", right: "sono andato", wrong: ["ho andato", "andavo"] },
};
const SAMPLES: Record<Language, Samples> = {
  it: IT_SAMPLES,
  en: {
    type: { typed: "id like a cofee pleasse", answer: "I'd like a coffee, please." },
    talk: { partner: "Hi! What can I get you?", learner: "Yes, I take a cappuccino.", fix: "I'll have a cappuccino." },
    quiz: { prompt: "Yesterday I ___ to the cinema with Luke.", right: "went", wrong: ["have gone", "goed"] },
  },
  es: {
    type: { typed: "quisera un cafe por favorr", answer: "Quisiera un café, por favor." },
    talk: { partner: "¡Hola! ¿Qué vas a tomar?", learner: "Yo quiero tomo un capuchino.", fix: "Quiero tomar un capuchino." },
    quiz: { prompt: "Ayer ___ al cine con Lucas.", right: "fui", wrong: ["he ido", "fue"] },
  },
  nl: {
    type: { typed: "ik wil grag een kofie alstublieftt", answer: "Ik wil graag een koffie, alstublieft." },
    talk: { partner: "Hoi! Wat wil je drinken?", learner: "Ik wil hebben een cappuccino.", fix: "Ik wil een cappuccino hebben." },
    quiz: { prompt: "Gisteren ___ ik met Luuk naar de bioscoop.", right: "ging", wrong: ["gaat", "gegaan"] },
  },
  ga: {
    type: { typed: "ba mhaith liom cupan cafe le do thoill", answer: "Ba mhaith liom cupán caife, le do thoil." },
  },
};

const ALONG: Key[] = ["welcome.along.review", "welcome.along.notebook", "welcome.along.why", "welcome.along.words", "welcome.along.testOut", "welcome.along.friends"];
const HABITS: Key[] = ["welcome.habit.mistakes", "about.tipDaily", "about.tipHints", "about.tipAloud"];

const languageList = (ls: readonly Language[]) => new Intl.ListFormat(locale(), { type: "conjunction" }).format(ls.map(languageInSentence));

/** The homepage. Signed out it shows on every route, so signing in keeps the visitor where they are, and opens by asking what they speak and want to learn. */
export function Welcome() {
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [picked, setPicked] = createSignal(storedLanguage());
  // A pick the visitor's own language has no translations for doesn't count.
  const learning = () => { const l = picked(); return l && learnable(ownLocale()).includes(l) ? l : null; };
  const samples = () => SAMPLES[learning() ?? "it"];
  const typeSample = () => samples().type;
  const typeDiff = () => grade({ mode: "free", text: typeSample().typed }, { language: learning() ?? "it", text: typeSample().answer });
  const talkSample = () => samples().talk ?? IT_SAMPLES.talk;
  const quizSample = () => samples().quiz ?? IT_SAMPLES.quiz;
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
                      <button type="button" class={`qa-welcome-speak-${l} btn btn-outline-primary`} classList={{ active: ownLocale() === l }}
                        aria-pressed={ownLocale() === l} onClick={() => { setLocale(l); setImmersion(null); }}>
                        {LOCALE_LABELS[l]}
                      </button>
                    )}
                  </For>
                </div>
              </div>
              <div>
                <h2 class="h6">{t("welcome.learnQ")}</h2>
                <LearnPicker locale={ownLocale()}chosen={learning()} onChoose={(l) => { rememberLanguage(l); setPicked(l); }} />
              </div>
              <div>
                <h2 class="h6">
                  <Show when={learning()} fallback={t("welcome.signInReturning")}>
                    {(l) => t("welcome.signInToStart", { language: languageInSentence(l()) })}
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
                {t("welcome.continue", { language: languageInSentence(homeLanguage(u().learning)) })}
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
                      <span class="font-mono text-body-secondary">{typeSample().typed}</span>
                    </div>
                    <div class="qa-welcome-sample-diff mb-2"><SentenceDiff result={typeDiff()} /></div>
                    <div class="text-body-secondary">{t("welcome.type.legend")}</div>
                  </div>
                </Way>
                <Show when={c().speak}>
                  <Way qa="talk" icon="bi-mic" title={t("welcome.talk.title")} body={t("welcome.talk.body")} languages={SPEAK_LANGUAGES}>
                    <div class="small d-flex flex-column gap-2">
                      <div class="p-2 rounded bg-body-secondary align-self-start">{talkSample().partner}</div>
                      <div class="p-2 rounded bg-primary-subtle align-self-end">{talkSample().learner}</div>
                      <div class="p-2 rounded border border-warning-subtle">
                        {t("speak.goodTry")}
                        <div><span class="fw-semibold">{t("speak.sayThis")}:</span> {talkSample().fix}</div>
                      </div>
                    </div>
                  </Way>
                </Show>
                <Show when={c().quiz.length > 0}>
                  <Way qa="quiz" icon="bi-patch-question" title={t("welcome.quiz.title")} body={t("quiz.intro")} languages={c().quiz}>
                    <div class="qa-welcome-sample-quiz small d-flex flex-column gap-1">
                      <div class="mb-1">{quizSample().prompt}</div>
                      <div class="px-2 py-1 rounded border border-success bg-success-subtle">✓ {quizSample().right}</div>
                      <For each={quizSample().wrong}>{(w) => <div class="px-2 py-1 rounded border">{w}</div>}</For>
                    </div>
                  </Way>
                </Show>
              </div>
            </section>

            <section>
              <h2 class="h3 mb-3">{t("welcome.alongHeading")}</h2>
              <ul class="qa-welcome-along list-unstyled row g-2 mb-0">
                <For each={ALONG}>{(k) => <EmojiLine class="col-md-6" text={t(k)} />}</For>
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
                    <For each={HABITS}>{(k) => <EmojiLine text={t(k)} />}</For>
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
