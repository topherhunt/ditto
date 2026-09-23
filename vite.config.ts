import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

const api = `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  root: "web",
  plugins: [solid()],
  build: { outDir: "../dist/web", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api": api, "/audio": api } },
  test: {
    root: ".",
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
  },
});
