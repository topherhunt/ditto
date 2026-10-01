import { createSignal, onCleanup, onMount } from "solid-js";
import { t } from "../i18n/index.ts";

const SCROLL_MS = 500;
/** How far down the page the up button starts to show. */
const SCROLL_UP_AFTER = 200;

/** Scrolls the window to `top` linearly over SCROLL_MS (the browser's own smooth scroll has no settable duration); jumps for a reduced-motion preference. Each step is `instant` because Bootstrap sets `scroll-behavior: smooth` on the page, which would smooth every step and lag behind the animation. */
export function scrollToY(top: number) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return window.scrollTo({ top, behavior: "instant" });
  const from = window.scrollY, start = performance.now();
  const step = (now: number) => {
    const p = Math.min((now - start) / SCROLL_MS, 1);
    window.scrollTo({ top: from + (top - from) * p, behavior: "instant" });
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export const scrollFabClass = "scroll-fab btn btn-outline-secondary bg-body rounded-circle position-fixed end-0 d-flex align-items-center justify-content-center";
export const scrollFabStyle = { width: "2.75rem", height: "2.75rem", "margin-block": "-.5rem", "margin-right": "-.5rem", "z-index": 1030 };

/** Floating round button, pinned top right, that appears once the page is scrolled past SCROLL_UP_AFTER and scrolls back to the top. */
export function ScrollUpButton() {
  const [canUp, setCanUp] = createSignal(false);
  const update = () => setCanUp(window.scrollY > SCROLL_UP_AFTER);
  onMount(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", update));
  });
  return (
    <button type="button" data-silent class={`qa-scroll-up ${scrollFabClass} top-0`} classList={{ show: canUp() }} style={scrollFabStyle} aria-label={t("speak.scrollUp")}
      onClick={() => scrollToY(0)}><i class="bi bi-arrow-up" aria-hidden="true" /></button>
  );
}
