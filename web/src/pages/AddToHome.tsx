import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import type { Key } from "../i18n/en.ts";
import { t } from "../i18n/index.ts";
import { installPlatform } from "../install.ts";
import { homeLanguage } from "../learning.ts";
import { me } from "../session.ts";

const STEPS: Key[] = ["install.s1", "install.s2", "install.s3", "install.s4"];

const TEXT_GUIDE: Record<"ios-other" | "android" | "desktop", Key> = { "ios-other": "install.textIos", android: "install.textAndroid", desktop: "install.textDesktop" };

/** How to Add to Home Screen: a tap-through guide with a screenshot (its arrow already drawn) and a sentence per step for iOS Safari, a written hint for every other browser. */
export function AddToHome() {
  const platform = installPlatform();
  return (
    <div class="qa-install d-flex flex-column gap-3 align-items-center mx-auto" style={{ "max-width": "24rem" }}>
      <h1 class="h4 mb-0 align-self-start">{t("install.title")}</h1>
      <Show when={platform !== "ios-safari"} fallback={<SafariSteps />}>
        <div class="qa-install-text alert alert-secondary mb-0">{t(TEXT_GUIDE[platform as keyof typeof TEXT_GUIDE])}</div>
        <A href={`/${homeLanguage(me()!.learning)}`} class="qa-install-finish btn btn-success">{t("install.back.dashboard")}</A>
      </Show>
    </div>
  );
}

function SafariSteps() {
  const [step, setStep] = createSignal(0);
  const last = () => step() === STEPS.length - 1;
  return (
    <>
      <div class="qa-install-progress small text-body-secondary">{t("install.step", { n: step() + 1, total: STEPS.length })}</div>
      <img class="qa-install-image img-fluid rounded border" style={{ "max-height": "55vh" }} src={`/install/ios-${step() + 1}.jpg`} alt={t("install.alt", { n: step() + 1 })} />
      <p class="qa-install-step text-center mb-0">{t(STEPS[step()])}</p>
      <div class="d-flex align-items-center gap-3">
        <button type="button" class="qa-install-back btn btn-outline-primary" disabled={step() === 0} aria-label={t("install.back")} onClick={() => setStep(step() - 1)}>
          <i class="bi bi-arrow-left" aria-hidden="true" />
        </button>
        <div class="d-flex gap-2" aria-hidden="true">
          <For each={STEPS}>{(_, i) => <span class="rounded-circle" classList={{ "bg-primary": i() === step(), "bg-body-secondary": i() !== step() }} style={{ width: "0.6rem", height: "0.6rem" }} />}</For>
        </div>
        <Show when={!last()} fallback={<A href={`/${homeLanguage(me()!.learning)}`} class="qa-install-finish btn btn-success">{t("install.back.dashboard")}</A>}>
          <button type="button" class="qa-install-next btn btn-primary" aria-label={t("install.next")} onClick={() => setStep(step() + 1)}>
            <i class="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </Show>
      </div>
    </>
  );
}
