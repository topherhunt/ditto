import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

const api = `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  root: "web",
  plugins: [solid()],
  // Sounds stay files, not data URIs, so each is cached on its own and identifiable by name.
  build: { outDir: "../dist/web", emptyOutDir: true, assetsInlineLimit: (file) => (file.endsWith(".mp3") ? false : undefined) },
  server: { port: 5173, proxy: { "/api": api, "/audio": api } },
  test: {
    root: ".",
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
  },
});
