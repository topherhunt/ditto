import type { DB } from "./db.ts";

/** USD, as of 2026-09: text models per 1M tokens in/out, transcription per audio minute. */
const TOKEN_PRICES: Record<string, { input: number; output: number }> = { "gpt-6-luna": { input: 0.1, output: 0.5 } };
const MINUTE_PRICES: Record<string, number> = { "gpt-transcribe": 0.0045 };

/** One paid call, as the api_usage ledger records it. */
export type Usage = { model: string; inputTokens: number; outputTokens: number; audioSeconds: number; costUsd: number };

export function tokenUsage(model: string, inputTokens: number, outputTokens: number): Usage {
  const p = TOKEN_PRICES[model];
  if (!p) throw new Error(`No token price for model ${model} (server/usage.ts)`);
  return { model, inputTokens, outputTokens, audioSeconds: 0, costUsd: (inputTokens * p.input + outputTokens * p.output) / 1e6 };
}

export function minuteUsage(model: string, audioSeconds: number): Usage {
  const p = MINUTE_PRICES[model];
  if (p === undefined) throw new Error(`No per-minute price for model ${model} (server/usage.ts)`);
  return { model, inputTokens: 0, outputTokens: 0, audioSeconds, costUsd: (audioSeconds / 60) * p };
}

export function recordUsage(db: DB, userId: number, conversationId: number | null, purpose: string, u: Usage, now: Date) {
  db.prepare(
    `INSERT INTO api_usage (user_id, conversation_id, purpose, model, input_tokens, output_tokens, audio_seconds, cost_usd, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(userId, conversationId, purpose, u.model, u.inputTokens, u.outputTokens, u.audioSeconds, u.costUsd, now.toISOString());
}

/** Spend since the last midnight UTC, when the daily cap resets. */
export function spentToday(db: DB, userId: number, now: Date): number {
  const day = now.toISOString().slice(0, 10);
  return (db.prepare("SELECT coalesce(sum(cost_usd), 0) AS s FROM api_usage WHERE user_id = ? AND created_at >= ?").get(userId, day) as { s: number }).s;
}
