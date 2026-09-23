import { createSignal } from "solid-js";

export type Theme = "light" | "dark";
export const THEME_KEY = "theme";

// index.html applies the stored theme (default dark) before first paint; read it back from there.
const root = document.documentElement;
const [theme, setTheme] = createSignal<Theme>(root.dataset.bsTheme === "light" ? "light" : "dark");
export { theme };

export function toggleTheme() {
  const next: Theme = theme() === "dark" ? "light" : "dark";
  root.dataset.bsTheme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable: theme lasts this page load */ }
  setTheme(next);
}
