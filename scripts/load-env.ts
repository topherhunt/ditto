// Dev preload for `node --watch-path`, which restarts in a loop when combined with --env-file.
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");
