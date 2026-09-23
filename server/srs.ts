import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type CardInput, type Grade } from "ts-fsrs";

export const OUTCOMES = ["clean", "hinted", "corrected", "revealed"] as const;
export type Outcome = (typeof OUTCOMES)[number];

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

const RATING: Record<Outcome, Grade> = {
  clean: Rating.Good,
  hinted: Rating.Hard,
  corrected: Rating.Again,
  revealed: Rating.Again,
};

/** Schedules the next review. `stored` is the card JSON from review_cards, or null for a new card. */
export function schedule(stored: string | null, outcome: Outcome, now: Date): Card {
  const card: CardInput | Card = stored ? (JSON.parse(stored) as CardInput) : createEmptyCard(now);
  return scheduler.next(card, now, RATING[outcome]).card;
}
