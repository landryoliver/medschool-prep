import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkOnly } from 'workbox-strategies'

// Build-time asset manifest (app shell + Mode 0/3/4/5 JSON) — cache-first, precached on install.
precacheAndRoute(self.__WB_MANIFEST)

// Offline SPA navigation fallback.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/orgo-prep/index.html')))

// RDKit WASM + glue JS: only ever fetched when Mode 1/2 dynamic-imports it.
// Cache-first so the ~2-3MB download happens once, then serves instantly (incl. offline).
registerRoute(
  ({ url }) => url.pathname.includes('rdkit'),
  new CacheFirst({ cacheName: 'rdkit-engine' }),
)

// Claude API grading calls: never cache, live-network only.
registerRoute(
  ({ url }) => url.hostname === 'api.anthropic.com',
  new NetworkOnly(),
)

self.skipWaiting()
