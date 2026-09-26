// ─── Service worker — installable app shell, never caches member data ────────
// Strategy:
//  • /api/* — network-only, never stored (no profiles/messages on disk).
//  • Navigations + index.html — network-first (a deploy must reach the user).
//  • Unhashed brand files (icon.svg, favicon.svg, PNG icons, manifest) — network-first:
//    they change without a URL change, so cache-first would pin stale art.
//  • Hashed /assets/* bundles — cache-first, immutable by content hash.
const SHELL = 'shiarishta-shell-v2';
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];
// Unhashed files that must revalidate on every fetch (see SHELL_FILES + favicon).
const NETWORK_FIRST_PATHS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/favicon.svg', '/sw.js',
  '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/favicon-32x32.png', '/favicon-16x16.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch API traffic, never touch other origins, never cache non-GET.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  const networkFirst =
    request.mode === 'navigate' || NETWORK_FIRST_PATHS.includes(url.pathname);

  if (networkFirst) {
    // Fresh entry points and brand art; fall back to cache only when offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || Response.error())),
    );
    return;
  }

  // Hashed build assets are immutable — serve from cache, fill cache on miss.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok && url.pathname.startsWith('/assets/')) {
        const copy = res.clone();
        caches.open(SHELL).then((cache) => cache.put(request, copy));
      }
      return res;
    })),
  );
});
