-- Minor per-user flags that don't earn their own column, keyed as in `Misc` (server/auth.ts).
ALTER TABLE users ADD COLUMN misc TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(misc));
