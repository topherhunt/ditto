import { createSignal } from "solid-js";
import { SPEND_CAP_HEADER, SPEND_TODAY_HEADER } from "../../shared/api.ts";

export const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`;

/** The learner's AI spend today and daily cap in USD, from the latest signed-in API response; null before one. */
export const [spend, setSpend] = createSignal<{ today: number; cap: number } | null>(null);
export const capReached = () => {
  const s = spend();
  return s !== null && s.today >= s.cap;
};

/** Counts refused paid calls; the layout sends the learner to the cap page on each. */
export const [capHits, setCapHits] = createSignal(0);
export const hitCap = () => setCapHits((n) => n + 1);

/** Only signed-in responses carry the headers. */
export function noteSpend(headers: Headers) {
  const today = headers.get(SPEND_TODAY_HEADER);
  const cap = headers.get(SPEND_CAP_HEADER);
  if (today !== null && cap !== null) setSpend({ today: Number(today), cap: Number(cap) });
}

/** When the cap resets: the next midnight UTC, in the viewer's local time. */
export function resetTime(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
