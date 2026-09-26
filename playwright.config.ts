import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  // The UI language follows the browser's until a user picks one, so pin it.
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure", locale: "en-US" },
  webServer: {
    // Fresh DB per run; OPENAI_API_KEY is blanked so E2E can never spend money.
    command: `rm -rf test-results/e2e-db && npx vite build && node server/index.ts`,
    url: `http://127.0.0.1:${PORT}/api/config`,
    reuseExistingServer: false,
    env: { PORT: String(PORT), CONTENT_DIR: "tests/fixtures/content", DEV_LOGIN: "1", ADMIN_EMAILS: "admin@example.com", DATABASE_PATH: "test-results/e2e-db/app.db", OPENAI_API_KEY: "", GOOGLE_CLIENT_ID: "" },
  },
});
