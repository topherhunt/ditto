import { A, useLocation } from "@solidjs/router";
import { createEffect, createResource, createSignal, For, on, onCleanup, Show } from "solid-js";
import type { NotificationsOut } from "../../../shared/api.ts";
import { api, NetworkError } from "../api.ts";
import { t } from "../i18n/index.ts";
import { notificationText, shortDate } from "../social.ts";
import { routes } from "../routes.ts";

const POLL_MS = 60_000;

/** The bell in the navbar: unread count, and a dropdown of recent notifications that marks them read when opened. */
export function Notifications(props: { large?: boolean }) {
  const location = useLocation();
  // The bell is decorative, so a poll that can't reach the server (laptop just woke up) keeps the last data instead of erroring the whole layout.
  const [data, { refetch, mutate }] = createResource<NotificationsOut | undefined>(async (_, { value }) => {
    try {
      return await api.get<NotificationsOut>("/api/notifications");
    } catch (e) {
      if (!(e instanceof NetworkError)) throw e;
      console.warn("Notifications poll failed", e);
      return value;
    }
  });
  const [open, setOpen] = createSignal(false);
  createEffect(on(() => location.pathname, () => refetch(), { defer: true }));
  const timer = setInterval(() => refetch(), POLL_MS);
  let root: HTMLDivElement | undefined;
  const closeOnOutsideClick = (e: MouseEvent) => {
    if (root && !root.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener("click", closeOnOutsideClick);
  onCleanup(() => {
    clearInterval(timer);
    document.removeEventListener("click", closeOnOutsideClick);
  });

  async function toggle() {
    setOpen(!open());
    const d = data();
    if (open() && d && d.unread > 0) {
      await api.post("/api/notifications/read");
      // Keep the unread highlight while the menu is open; only the badge clears.
      mutate({ ...d, unread: 0 });
    }
  }

  return (
    <div class="notify-wrap dropdown" ref={root}>
      <button type="button" class="qa-notifications btn btn-outline-info position-relative" classList={{ "btn-sm": !props.large }} aria-expanded={open()} aria-label={t("notify.title")} onClick={toggle}>
        <i class="bi bi-bell" aria-hidden="true" />
        <Show when={data() && data()!.unread > 0}>
          <span class="qa-notifications-count position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">{data()!.unread}</span>
        </Show>
      </button>
      <ul class="notify-menu dropdown-menu dropdown-menu-end" classList={{ show: open() }} data-bs-popper="static">
        <For each={data()?.items} fallback={<li class="dropdown-item-text text-body-secondary small">{t("notify.empty")}</li>}>
          {(n) => (
            <li>
              <A href={n.kind === "friend_accepted" ? routes.person({ id: n.actor.id }) : routes.friends()} class="qa-notification dropdown-item text-wrap small"
                classList={{ "fw-semibold": !n.read }} onClick={() => setOpen(false)}>
                {notificationText(n)}
                <div class="text-body-secondary">{shortDate(n.createdAt)}</div>
              </A>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
