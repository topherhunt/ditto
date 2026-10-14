import { For, onMount } from "solid-js";
import { WHATS_NEW } from "../../../shared/whats-new.ts";
import { api } from "../api.ts";
import { locale, t } from "../i18n/index.ts";
import { me, refetchMe } from "../session.ts";

export function WhatsNew() {
  onMount(async () => {
    if (me()!.whatsNewUnseen === 0) return;
    await api.post("/api/whats-new/seen");
    await refetchMe();
  });
  return (
    <div class="qa-whats-new">
      <h1 class="h4 mb-3">{t("whatsNew.title")}</h1>
      <For each={WHATS_NEW}>
        {(day) => (
          <section class="qa-whats-new-day mb-4">
            {/* Noon, so no time zone shifts the date to the day before. */}
            <h2 class="h6 text-body-secondary">{new Date(`${day.date}T12:00:00`).toLocaleDateString(locale(), { month: "long", day: "numeric", year: "numeric" })}</h2>
            <ul class="mb-0">
              <For each={day.items}>{(item) => <li class="qa-whats-new-item">{item[locale()]}</li>}</For>
            </ul>
          </section>
        )}
      </For>
    </div>
  );
}
