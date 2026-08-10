/* Franchise Foundry Portal — service worker
 * Handles PWA install eligibility, Web Push delivery, and notification clicks.
 * Intentionally no offline caching yet — the portal is auth-gated and dynamic,
 * so a stale cache would do more harm than good. Add caching deliberately later.
 */

// Take control of open pages as soon as an updated SW activates.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// A no-op fetch handler makes the app installable (browsers require one).
self.addEventListener('fetch', () => {})

// ── Web Push ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Franchise Foundry', body: event.data && event.data.text() }
  }

  const title = data.title || 'Franchise Foundry'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { link: data.link || '/' },
    tag: data.tag || undefined,        // collapse duplicates when a tag is set
    renotify: Boolean(data.tag),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  const target = new URL(link, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing portal tab if one is open, else open a new one.
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
