import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

// Everything the app needs — shell, question data, icons — is precached at
// install time. All question generation happens client-side, so once this
// completes the app is fully functional offline with no runtime fetches.
precacheAndRoute(self.__WB_MANIFEST)

// Serve the cached shell for navigations so an offline reload doesn't 404.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/medschool-prep/index.html')))

// Take over immediately when a new version installs, so the in-app
// "check for updates" button can activate it without a second visit.
self.skipWaiting()
clientsClaim()
