// Service worker: makes the installed app open instantly.
// Pages are stale-while-revalidate: the last copy is served at once and refreshed
// in the background; the app then pulls fresh data itself (see components/pwa.tsx,
// which compares the page's render time). Static assets are cache-first.
// Logging-while-offline is handled in the app layer (lib/offline-queue.ts).
const PAGES = "cadence-pages-v2";
const ASSETS = "cadence-assets-v2";
const PRECACHE = ["/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ASSETS).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// The login page asks for this, so signed-in pages don't outlive a logout.
self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

// Only plain successful pages are kept. A redirect (to /login) must never be
// served from cache: Safari refuses redirected responses from a service worker.
function cacheable(res) {
  return res.ok && !res.redirected && res.type === "basic";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const network = fetch(request).then((res) => {
      if (cacheable(res)) {
        const copy = res.clone();
        caches.open(PAGES).then((c) => c.put(request, copy));
      }
      return res;
    });
    event.respondWith(
      caches.open(PAGES).then((c) => c.match(request)).then((cached) => {
        if (cached) {
          event.waitUntil(network.catch(() => {}));
          return cached;
        }
        return network.catch(() => caches.open(PAGES).then((c) => c.match("/")).then((r) => r || Response.error()));
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(ASSETS).then((c) => c.put(request, copy));
        }
        return res;
      })),
    );
  }
});
