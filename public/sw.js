// Service worker: makes the installed app open instantly.
// Pages are stale-while-revalidate: the last copy is served at once and refreshed
// in the background; the app then pulls fresh data itself (see components/pwa.tsx,
// which compares the page's render time). Static assets are cache-first.
// Logging-while-offline is handled in the app layer (lib/offline-queue.ts).
const PAGES = "cadence-pages-v3";
const ASSETS = "cadence-assets-v3";
const PRECACHE = ["/manifest.webmanifest", "/icon-192.png"];
// Static, and the page you need offline. Cached only if it isn't a login redirect.
const OFFLINE_PAGES = ["/log"];

// Bumped whenever the page cache is cleared, so a background fetch that started
// before a logout can't write a signed-in page back afterwards.
let generation = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(ASSETS).then((c) => c.addAll(PRECACHE)),
      caches.open(PAGES).then((c) =>
        Promise.all(OFFLINE_PAGES.map((p) => fetch(p).then((res) => (cacheable(res) ? c.put(p, res) : null)).catch(() => {}))),
      ),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function clearPages() {
  generation++;
  return caches.delete(PAGES);
}

// The login page asks for this, so signed-in pages don't outlive a logout.
self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(clearPages());
});

// Only plain successful pages are kept. A redirect (to /login) must never be
// served from cache: Safari refuses redirected responses from a service worker.
function cacheable(res) {
  return res.ok && !res.redirected && res.type === "basic";
}

function endedSession(res) {
  return res.redirected && new URL(res.url).pathname === "/login";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const gen = generation;
    const network = fetch(request).then((res) => {
      if (endedSession(res)) {
        clearPages();
      } else if (cacheable(res) && gen === generation) {
        const copy = res.clone();
        caches.open(PAGES).then((c) => (gen === generation ? c.put(request, copy) : null));
      }
      return res;
    });
    event.respondWith(
      caches.open(PAGES).then((c) => c.match(request)).then((cached) => {
        if (cached) {
          event.waitUntil(network.catch(() => {}));
          return cached;
        }
        return network.catch(() =>
          caches.open(PAGES).then((c) => c.match("/").then((r) => r || c.match("/log"))).then((r) => r || Response.error()),
        );
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
