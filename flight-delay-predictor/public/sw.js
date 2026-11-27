/* FlightPredict service worker — cache shell for offline / add-to-home-screen. */
const CACHE = "fp-v1";
const SHELL = [
  "./",
  "./index.html",
  "./predict.html",
  "./compare.html",
  "./best-time.html",
  "./history.html",
  "./report.html",
  "./model.html",
  "./risk.html",
  "./weather.html",
  "./connection.html",
  "./style.css",
  "./shell.js",
  "./common.js",
  "./charts.js",
  "./airports.js",
  "./theme-init.js",
  "./favicon.svg",
  "./logo.svg",
  "./logo-mark.svg",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Network-first for API, cache-first for shell.
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: "Offline" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
