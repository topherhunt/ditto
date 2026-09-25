import { createSignal, Show } from "solid-js";
import { UsernameForm } from "../components/UsernameForm.tsx";
import { t } from "../i18n/index.ts";
import { me } from "../session.ts";

export function Account() {
  const [saved, setSaved] = createSignal(false);
  return (
    <div class="d-flex flex-column gap-3" style={{ "max-width": "28rem" }}>
      <h1 class="h4 mb-0">{t("account.title")}</h1>
      <UsernameForm initial={me()!.username} submitLabel={t("username.save")} onSaved={() => setSaved(true)} />
      <Show when={saved()}><div class="qa-account-status small text-body-secondary">{t("settings.saved")}</div></Show>
    </div>
  );
}
