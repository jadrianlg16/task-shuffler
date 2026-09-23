import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "./store/installStore"; // listens for the browser's install prompt early

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Installable / offline-capable in production builds. Skipped inside an
// iframe (the portfolio embed), where a worker would claim the host site's path.
if (import.meta.env.PROD && "serviceWorker" in navigator && window.self === window.top) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI))
      .catch((err) => console.warn("[done.] service worker not registered:", err));
  });
}
