import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { proxyGuard } from "./scripts/api-guard.cjs";

// The UI talks to json-server through /api on its own origin. The target is
// where json-server listens from the Vite process's point of view; override
// with API_PROXY_TARGET when it runs somewhere else.
const apiProxy = {
  "/api": {
    target: process.env.API_PROXY_TARGET ?? "http://localhost:3001",
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
