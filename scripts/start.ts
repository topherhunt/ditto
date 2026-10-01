// `npm start`: the plain server when NODE_ENV=production (checked after loading .env), otherwise the reloadable dev setup.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

if (process.env.NODE_ENV === "production") {
  await import("../server/index.ts");
} else {
  console.log("NODE_ENV is not production: starting the reloadable dev server and Vite (set NODE_ENV=production for the plain server)");
  const children = [
    spawn("npm", ["run", "dev:server"], { stdio: "inherit" }),
    spawn("npm", ["run", "dev:web"], { stdio: "inherit" }),
  ];
  const stop = () => children.forEach((c) => c.kill("SIGTERM"));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Either process dying ends the whole thing, so a crashed server is never left behind a live Vite.
  let code = 0;
  await Promise.all(
    children.map(
      (c) =>
        new Promise<void>((resolve) =>
          c.on("exit", (status) => {
            code ||= status ?? 0;
            stop();
            resolve();
          }),
        ),
    ),
  );
  process.exit(code);
}
