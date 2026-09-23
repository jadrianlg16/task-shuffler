// done. service worker: network-first, so an online user always gets the
// current build, with the last good copy as the offline fallback. API calls
// (/api) are never cached — task data must come from the server or not at all.
const CACHE = "done-shell-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Offline navigation to a URL we never cached: fall back to the app shell.
        if (req.mode === "navigate") {
          const shell = await caches.match(new URL("./", self.registration.scope).href);
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
