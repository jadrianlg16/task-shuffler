import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import http from "node:http";
import https from "node:https";
import path from "path";
import { proxyGuard } from "./scripts/api-guard.cjs";

// The UI talks to json-server through /api on its own origin. The target is
// where json-server listens from the Vite process's point of view; override
// with API_PROXY_TARGET when it runs somewhere else.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:3001";

// Reuse connections to json-server. Without an agent the proxy asks json-server
// to close every connection and passes "Connection: close" back to the browser,
// so each API call opened two new TCP connections; an import's burst of calls
// could exhaust the host's sockets (net::ERR_NO_BUFFER_SPACE on Windows).
// Idle sockets are dropped after 4 s, before json-server's 5 s keep-alive
// timeout can close one under a request.
const agentOptions = { keepAlive: true, timeout: 4000 };
const keepAliveAgent = apiTarget.startsWith("https:")
  ? new https.Agent(agentOptions)
  : new http.Agent(agentOptions);

const apiProxy = {
  "/api": {
    target: apiTarget,
    agent: keepAliveAgent,
    changeOrigin: true,
    // X-Forwarded-Host tells json-server's guard which origin the app is on.
    xfwd: true,
    rewrite: (p: string) => p.replace(/^\/api/, ""),
  },
};

/**
 * Refuse cross-origin requests to /api before they reach the proxy (see
 * scripts/api-guard.cjs). Middlewares added here run ahead of Vite's own.
 */
function apiGuard(): Plugin {
  return {
    name: "api-same-origin-guard",
    configureServer(server) {
      server.middlewares.use("/api", proxyGuard);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api", proxyGuard);
    },
  };
}

export default defineConfig({
  plugins: [apiGuard(), react(), tailwindcss()],
  server: {
    port: 3003,
    proxy: apiProxy,
    cors: false, // same-origin app: no page elsewhere may read these responses
    // json-server rewrites the data file on every save; it is not source, and
    // watching it would reload the page mid-save.
    watch: { ignored: ["**/data/**"] },
  },
  preview: {
    proxy: apiProxy,
    cors: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
