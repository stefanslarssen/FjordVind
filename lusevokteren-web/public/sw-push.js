// FjordVind Push Notification Service Worker Handler
// This file is imported by the main service worker

self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)

  let data = {
    title: 'FjordVind Lusevokteren',
    body: 'Du har en ny varsling',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'lusevokteren',
    data: { url: '/' }
  }

  try {
    if (event.data) {
      const payload = event.data.json()
      data = {
        ...data,
        ...payload
      }
    }
  } catch (err) {
    console.error('[SW] Failed to parse push data:', err)
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    tag: data.tag || 'lusevokteren',
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.priority === 'high',
    actions: data.actions || []
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event)
})
