import { For } from "solid-js";
import { t } from "../i18n/index.ts";

const PILE = ["💬", "⭐", "❤️", "🌟", "💛", "✨", "💬"];

/** A pile of emoji that drops in one by one, then loops. Shown while a page's data is on its way. */
export function Loading() {
  return (
    <div class="qa-loading d-flex flex-column align-items-center gap-2 py-5 text-body-secondary" role="status">
      <div class="loading-pile" aria-hidden="true">
        <For each={PILE}>{(emoji, i) => <span style={{ "--i": i() }}>{emoji}</span>}</For>
      </div>
      <div class="small">{t("app.loading")}</div>
    </div>
  );
}
