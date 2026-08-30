/**
 * Offline, for a candidate on a phone with patchy data.
 *
 * The whole app is local-first already — the event log never leaves the device
 * — so the only thing standing between it and working on a train is the fact
 * that the code itself has to be fetched. This fixes that.
 *
 * There is no build-time precache list, deliberately. Vite writes hashed asset
 * names, so any list written by hand goes stale on the next build and starts
 * serving a file that no longer exists. Instead the shell is cached on install
 * and assets cache themselves the first time they are used, which costs one
 * online visit and never lies about what it has.
 *
 * Bump CACHE to force every client onto a new generation.
 */
const CACHE = "wbcs-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Individually, so one 404 cannot fail the whole install.
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The AI proxy costs money and its answers are about a moment in the log.
  // Never serve one from a cache, and never store one.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: try the network so a deploy is picked up immediately, and
  // fall back to the cached shell when there is no network at all.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r ?? Response.error())),
    );
    return;
  }

  // Everything else: cache first. Vite's asset names are content-hashed, so a
  // hit is always the right file and a changed file is a different URL.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
