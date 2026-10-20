// Service worker: makes the installed app open instantly.
// Pages: the last copy is served at once, tagged with <meta name="sw-cached">, and
// the app refreshes its data when it sees that tag (components/pwa.tsx). The cached
// copy itself is updated in the background when it's old. Static assets are
// cache-first. Logging-while-offline is handled in the app (lib/offline-queue.ts).
const PAGES = "cadence-pages-v4";
const ASSETS = "cadence-assets-v4";
const PRECACHE = ["/manifest.webmanifest", "/icon-192.png"];
// Static pages with no personal data, kept across logouts so they open offline.
const OFFLINE_PAGES = ["/log"];
const REVALIDATE_AFTER_MS = 10 * 60 * 1000;
// Let the app's own refresh go first, so the two renders don't compete at launch.
const REVALIDATE_DELAY_MS = 5000;
const CACHED_AT = "x-sw-cached-at";

// Bumped whenever signed-in pages are cleared, so a fetch that started before a
// logout can't write a signed-in page back afterwards.
let generation = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ASSETS).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

async function clearSignedInPages() {
  generation++;
  const cache = await caches.open(PAGES);
  const keys = await cache.keys();
  await Promise.all(keys.filter((r) => !OFFLINE_PAGES.includes(new URL(r.url).pathname)).map((r) => cache.delete(r)));
}

// The login page asks for this, so signed-in pages don't outlive a logout.
self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(clearSignedInPages());
});

// Only plain successful pages are kept. A redirect must never be served from
// cache: Safari refuses redirected responses from a service worker.
function cacheable(res) {
  return res.ok && !res.redirected && res.type === "basic";
}

async function store(request, res, gen) {
  if (gen !== generation) return;
  const headers = new Headers(res.headers);
  headers.set(CACHED_AT, String(Date.now()));
  const body = await res.blob();
  if (gen !== generation) return;
  await (await caches.open(PAGES)).put(request, new Response(body, { status: res.status, statusText: res.statusText, headers }));
}

// A signed-in page loaded fine, so the session is good: make sure the offline
// pages are cached too (the first visit is usually /login, where they can't be).
async function ensureOfflinePages() {
  const cache = await caches.open(PAGES);
  for (const path of OFFLINE_PAGES) {
    if (await cache.match(path)) continue;
    const res = await fetch(path).catch(() => null);
    if (res && cacheable(res)) await store(new Request(path), res, generation);
  }
}

// Navigations use redirect mode "manual", so the proxy's redirect to /login comes
// back as an opaque redirect: the session has ended.
async function fromNetwork(request, gen) {
  const res = await fetch(request);
  if (res.type === "opaqueredirect") await clearSignedInPages();
  else if (cacheable(res)) {
    await store(request, res.clone(), gen);
    await ensureOfflinePages().catch(() => {});
  }
  return res;
}

async function markCached(res) {
  const html = await res.text();
  const headers = new Headers(res.headers);
  headers.delete(CACHED_AT);
  headers.delete("content-length");
  return new Response(html.replace(/<head[^>]*>/, (m) => `${m}<meta name="sw-cached" content="">`), {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const gen = generation;
    event.respondWith(
      caches.open(PAGES).then((c) => c.match(request)).then((cached) => {
        if (!cached) {
          return fromNetwork(request, gen).catch(() =>
            caches.open(PAGES).then((c) => c.match("/").then((r) => r || c.match("/log"))).then((r) => (r ? markCached(r) : Response.error())),
          );
        }
        const age = Date.now() - Number(cached.headers.get(CACHED_AT) || 0);
        if (age > REVALIDATE_AFTER_MS) {
          event.waitUntil(delay(REVALIDATE_DELAY_MS).then(() => fromNetwork(request, gen)).catch(() => {}));
        }
        return markCached(cached);
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
