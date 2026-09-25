import type { ChallengeOut, NotificationOut, Person } from "../../shared/api.ts";
import { locale, t } from "./i18n/index.ts";

/** "1 lesson" / "3 lessons" in the current locale; every supported locale has just a singular and a plural. */
export const lessonCount = (n: number) => t(n === 1 ? "count.lesson.one" : "count.lesson.other", { n });
export const dayCount = (n: number) => t(n === 1 ? "count.day.one" : "count.day.other", { n });

/** An account that signed up but hasn't picked a username yet gets a placeholder. */
export const displayName = (p: Person) => p.username ?? t("person.unnamed");

export const raceLabel = (r: Pick<ChallengeOut, "kind" | "days" | "target">) =>
  r.kind === "most" ? t("race.most", { days: dayCount(r.days) }) : t("race.firstTo", { lessons: lessonCount(r.target!) });

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(locale(), { month: "short", day: "numeric", year: "numeric" });

/** Whole days until `iso`, rounded up; 0 once it has passed. */
export const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export function notificationText(n: NotificationOut): string {
  const name = displayName(n.actor);
  switch (n.kind) {
    case "friend_request": return t("notify.friendRequest", { name });
    case "friend_accepted": return t("notify.friendAccepted", { name });
    case "challenge_invite": return t("notify.challengeInvite", { name, race: raceLabel(n.challenge!) });
    case "challenge_accepted": return t("notify.challengeAccepted", { name, race: raceLabel(n.challenge!) });
    case "challenge_declined": return t("notify.challengeDeclined", { name });
    case "challenge_finished": {
      const c = n.challenge!;
      if (c.winnerId === null) return t("notify.draw", { name });
      return t(c.winnerId === n.actor.id ? "notify.lost" : "notify.won", { name, race: raceLabel(c) });
    }
  }
}
