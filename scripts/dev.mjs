// `npm run dev`: json-server + Vite together, on a private copy of the seed.
// `npm run server`: json-server only (same data file).
//
// json-server --watch rewrites the file it serves, so pointing it at the
// tracked db.json dirtied the repo on every change. This seeds a git-ignored
// data/dev-db.json from db.json once and serves that instead.
//
// Ports: PORT (UI, default 3003) and API_PORT (json-server, default 3001).
// The browser only talks to the UI port; Vite proxies /api to json-server.
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbFile = process.env.DB_FILE ?? join(root, "data", "dev-db.json");
const uiPort = process.env.PORT ?? "3003";
const apiPort = process.env.API_PORT ?? "3001";

if (!existsSync(dbFile)) {
  mkdirSync(dirname(dbFile), { recursive: true });
  copyFileSync(join(root, "db.json"), dbFile);
  console.log(`[dev] seeded ${dbFile} from db.json`);
}

const bin = (name) => join(root, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
const run = (name, args, env = {}) =>
  spawn(bin(name), args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32", // .cmd shims need a shell on Windows
    env: { ...process.env, ...env },
  });

const apiOnly = process.argv.includes("--api-only"); // `npm run server`
const children = [
  run("json-server", ["--watch", dbFile, "--port", apiPort]),
  ...(apiOnly
    ? []
    : [
        run("vite", ["--port", uiPort, "--strictPort"], {
          API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? `http://localhost:${apiPort}`,
        }),
      ]),
];

// If either side dies, or we're told to stop, take the other down too.
const stop = (code = 0) => {
  for (const c of children) if (c.exitCode === null) c.kill();
  process.exit(code);
};
for (const c of children) c.on("exit", (code) => stop(code ?? 0));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
