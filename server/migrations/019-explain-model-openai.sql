-- EXPLAIN_MODEL (server/explain.ts) is now called on OpenAI directly, without OpenRouter's "openai/" prefix; keep the cache.
UPDATE OR IGNORE explanations SET model = 'gpt-6-luna' WHERE model = 'openai/gpt-6-luna';
