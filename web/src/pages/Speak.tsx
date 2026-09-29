import { A, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { LEARNER_LEVELS, SPEAK_LANGUAGES, STARTERS, type Config, type Starter, type ConversationOut, type ConversationsOut } from "../../../shared/api.ts";
import { api } from "../api.ts";
import { usd } from "../spend.ts";
import { languageName, t } from "../i18n/index.ts";
import { useLang } from "./lang.ts";
import { unlockPlayer } from "./player.ts";

type Level = (typeof LEARNER_LEVELS)[number];
const LEVEL_KEY = "speakLevel";

function savedLevel(): Level {
  try {
    const l = localStorage.getItem(LEVEL_KEY);
    if (l && (LEARNER_LEVELS as readonly string[]).includes(l)) return l as Level;
  } catch { /* storage unavailable: use the default */ }
  return "A2";
}

export function Speak() {
  const lang = useLang();
  const navigate = useNavigate();
  const [config] = createResource(() => api.get<Config>("/api/config"));
  const [data] = createResource(lang, (l) => api.get<ConversationsOut>(`/api/conversations?lang=${l}`));
  const [level, setLevel] = createSignal<Level>(savedLevel());
  const [hardMode, setHardMode] = createSignal(false);
  const [topic, setTopic] = createSignal("");
  const [starting, setStarting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const supported = () => (SPEAK_LANGUAGES as readonly string[]).includes(lang());

  const start = async (scenario: { starter: Starter } | { topic: string } | { surprise: true }) => {
    setStarting(true);
    setError(null);
    unlockPlayer();
    try {
      const conv = await api.post<ConversationOut>("/api/conversations", { language: lang(), level: level(), scenario, hardMode: hardMode() });
      navigate(`/${lang()}/speak/${conv.id}`, { state: { opened: true } });
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  };
  const pickLevel = (l: Level) => {
    setLevel(l);
    try { localStorage.setItem(LEVEL_KEY, l); } catch { /* storage unavailable */ }
  };

  return (
    <div class="d-flex flex-column gap-4">
      <h1 class="h3 mb-0">{t("speak.title", { language: languageName(lang()) })}</h1>
      <Show when={config() && (!config()!.speak || !supported())}>
        <div class="qa-speak-off alert alert-secondary mb-0">{t("speak.off")}</div>
      </Show>
      <Show when={config()?.speak && supported()}>
        <section class="d-flex flex-column gap-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <label class="d-flex align-items-center gap-2">
              {t("speak.level")}
              <select class="qa-speak-level form-select form-select-sm w-auto" value={level()} onChange={(e) => pickLevel(e.currentTarget.value as Level)}>
                <For each={LEARNER_LEVELS}>{(l) => <option value={l}>{l}</option>}</For>
              </select>
            </label>
            <label class="form-check mb-0">
              <input type="checkbox" class="qa-speak-hard form-check-input" checked={hardMode()} onChange={(e) => setHardMode(e.currentTarget.checked)} />
              <span class="form-check-label">{t("speak.hardMode")}</span>
            </label>
          </div>
          <div>
            <h2 class="h6">{t("speak.starters")}</h2>
            <div class="d-flex flex-wrap gap-2">
              <For each={STARTERS}>
                {(s) => <button type="button" class={`qa-speak-starter qa-speak-starter-${s} btn btn-outline-primary`} disabled={starting()} onClick={() => start({ starter: s })}>{t(`speak.starter.${s}`)}</button>}
              </For>
              <button type="button" class="qa-speak-surprise btn btn-outline-secondary" disabled={starting()} onClick={() => start({ surprise: true })}>
                <i class="bi bi-shuffle me-1" aria-hidden="true" />{t("speak.surprise")}
              </button>
            </div>
          </div>
          <form class="d-flex gap-2" onSubmit={(e) => { e.preventDefault(); void start({ topic: topic() }); }}>
            <input class="qa-speak-topic form-control" placeholder={t("speak.topicPlaceholder")} aria-label={t("speak.topic")} value={topic()} onInput={(e) => setTopic(e.currentTarget.value)} />
            <button type="submit" class="qa-speak-topic-start btn btn-primary" disabled={starting() || !topic().trim()}>{t("speak.start")}</button>
          </form>
          <Show when={starting()}><div class="qa-speak-starting text-body-secondary">{t("speak.starting")}</div></Show>
          <Show when={error()}>{(m) => <div class="qa-speak-error alert alert-danger mb-0">{m()}</div>}</Show>
        </section>
      </Show>

      <Show when={data()}>
        {(d) => (
          <>
            <section>
              <h2 class="h5">{t("speak.history")}</h2>
              <Show when={d().conversations.length} fallback={<p class="text-body-secondary">{t("speak.noHistory")}</p>}>
                <ul class="list-group">
                  <For each={d().conversations}>
                    {(c) => (
                      <li class="qa-speak-history list-group-item d-flex flex-wrap align-items-center gap-2">
                        <A href={`/${lang()}/speak/${c.id}`} class="me-auto">{c.title}</A>
                        <For each={c.levels.slice(-3)}>{(l) => <span class="badge text-bg-secondary">{l}</span>}</For>
                        <span class="small text-body-secondary">{new Date(c.updatedAt).toLocaleDateString()}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>
            <Show when={d().weakPhrases.length}>
              <section>
                <h2 class="h5">{t("speak.weak")}</h2>
                <ul class="list-unstyled mb-0">
                  <For each={d().weakPhrases}>{(w) => <li class="qa-speak-weak">{w.text}</li>}</For>
                </ul>
              </section>
            </Show>
            <div class="qa-speak-spend small text-body-secondary">{t("speak.spendToday", { today: usd(d().spend.today), cap: usd(d().spend.cap) })}</div>
          </>
        )}
      </Show>
    </div>
  );
}
