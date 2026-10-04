import { createSignal } from "solid-js";

/** The Bootstrap icon for each mood, indexed by mood - 1 (1 is unhappiest). */
export const MOOD_ICONS = ["emoji-angry-fill", "emoji-frown-fill", "emoji-neutral-fill", "emoji-smile-fill", "emoji-heart-eyes-fill"] as const;
/** The outline button color for each mood, indexed by mood - 1: red, orange, gray, blue, green. */
export const MOOD_COLORS = ["danger", "orange", "secondary", "primary", "success"] as const;
/** Moods in display order: the happiest on the left. */
export const MOODS_HAPPIEST_FIRST = [5, 4, 3, 2, 1] as const;

/** Set when feedback was just sent, so the dashboard it returns to can say thanks. */
export const [feedbackThanks, setFeedbackThanks] = createSignal(false);

/** `/feedback?from=` is typed by whoever opens the link, and the server accepts only plain route characters. */
export const safeFrom = (from: unknown): string => (typeof from === "string" && /^\/[A-Za-z0-9/_-]{0,100}$/.test(from) ? from : "/");
