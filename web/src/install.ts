import { createSignal } from "solid-js";

/** `ios-safari` has the screenshot guide; the rest get a written hint for their browser menu. */
export type InstallPlatform = "ios-safari" | "ios-other" | "android" | "desktop";

/** An iPhone, iPod or iPad (iPadOS reports itself as a Mac with a touch screen). */
const isIos = () => /iPhone|iPod|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export const installPlatform = (): InstallPlatform => {
  const ua = navigator.userAgent;
  if (isIos()) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) || !/Safari/.test(ua) ? "ios-other" : "ios-safari";
  return /Android/.test(ua) ? "android" : "desktop";
};

/** Phones and tablets, where the dashboard invites the learner to install. */
export const isMobile = () => installPlatform() !== "desktop";

/** Running from the home screen icon rather than in a browser tab. */
export const isStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Chromium browsers (Android Chrome, Edge, Samsung Internet) fire this once, early, when Ditto is installable; the event is kept so a button can open the native install dialog. main.tsx imports this module statically (via the pages), so the listener is attached before the event fires. */
const [installPrompt, setInstallPrompt] = createSignal<InstallPromptEvent | null>(null);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  setInstallPrompt(e as InstallPromptEvent);
});
window.addEventListener("appinstalled", () => setInstallPrompt(null));

export const canPromptInstall = () => installPrompt() !== null;

/** Opens the native install dialog; resolves true if the learner accepted. */
export const promptInstall = async (): Promise<boolean> => {
  const e = installPrompt();
  if (!e) throw new Error("No install prompt is available");
  setInstallPrompt(null);
  await e.prompt();
  return (await e.userChoice).outcome === "accepted";
};
