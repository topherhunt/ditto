-- The explainer's model is now the fixed EXPLAIN_MODEL (server/explain.ts); cached explanations are looked up by it.
UPDATE OR IGNORE explanations SET model = 'openai/gpt-6-luna' WHERE model = 'gpt-6-luna';
