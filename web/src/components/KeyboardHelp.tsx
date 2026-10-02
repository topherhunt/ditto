import { createSignal, For } from "solid-js";
import type { Language } from "../../../shared/content.ts";
import type { Key } from "../i18n/en.ts";
import { languageInSentence, t } from "../i18n/index.ts";
import { Popup } from "./Popup.tsx";

type Platform = "ios" | "android" | "mac" | "windows";

const STEPS: Record<Platform, { name: string; icon: string; steps: Key }> = {
  ios: { icon: "apple", name: "iPhone / iPad", steps: "help.keyboard.ios" },
  android: { icon: "android", name: "Android", steps: "help.keyboard.android" },
  mac: { icon: "apple", name: "MacOS", steps: "help.keyboard.mac" },
  windows: { icon: "windows", name: "Windows", steps: "help.keyboard.windows" },
};

/** An iPad in desktop mode reports a Mac user agent, so touch points tell them apart. */
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return /Macintosh/.test(ua) ? "mac" : "windows";
}

/** The typing help's note for a course in another alphabet: how to get its keyboard, with step-by-step instructions per device in a popup. */
export function KeyboardHelp(props: { lang: Language }) {
  const [open, setOpen] = createSignal(false);
  const platform = detectPlatform();
  const mobile = platform === "ios" || platform === "android";
  /** The learner's own device first, then the rest with phones before computers on a phone and the reverse on a computer. */
  const order = [platform, ...(mobile ? ["ios", "android", "mac", "windows"] as const : ["mac", "windows", "ios", "android"] as const).filter((p) => p !== platform)];
  const language = () => languageInSentence(props.lang);
  return (
    <>
      <strong>{t("help.keyboard.lead")}</strong> {t(mobile ? "help.keyboard.mobile" : "help.keyboard.desktop", { language: language() })}{" "}
      <button type="button" class="qa-keyboard-help-open btn btn-link btn-sm p-0 align-baseline" onClick={() => setOpen(true)}>{t("help.keyboard.how")}</button>
      <Popup open={open()} onClose={() => setOpen(false)} title={t("help.keyboard.title", { language: language() })} class="qa-keyboard-popup"
        footer={<button type="button" class="qa-keyboard-popup-close btn btn-primary" onClick={() => setOpen(false)}>{t("help.gotIt")}</button>}>
        <div class="d-flex flex-column gap-3">
          <For each={order}>{(p) => (
            <div class={`qa-keyboard-step qa-keyboard-${p}`} classList={{ "qa-keyboard-yours border border-primary rounded-3 p-2": p === platform }}>
              <h3 class="h6 mb-1"><i class={`bi bi-${STEPS[p].icon} me-2`} aria-hidden="true" />{STEPS[p].name}</h3>
              <p class="mb-0">{t(STEPS[p].steps, { language: language() })}</p>
            </div>
          )}</For>
        </div>
      </Popup>
    </>
  );
}
